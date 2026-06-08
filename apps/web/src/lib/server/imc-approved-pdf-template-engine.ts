import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";

type ImcManifestItem = {
  id: string;
  titleEn: string;
  fileName: string;
  publicPath: string;
  specialty: string;
  templateType: string;
  status: string;
  source: string;
  requiresAnesthesia: boolean;
  isPatientCopy: boolean;
  isEducation: boolean;
  isAnesthesia: boolean;
  lengthBytes: number;
};

type FieldMapPoint = {
  page?: number;
  x: number;
  y: number;
  size?: number;
  maxWidth?: number;
};

type TemplateFieldMap = {
  mode: "overlay" | "acroform";
  appendEvidencePage?: boolean;
  fields?: Record<string, FieldMapPoint>;
  requiredFields?: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function loadManifest(): Promise<ImcManifestItem[]> {
  const candidates = [
    path.join(process.cwd(), "public", "imc-consent-library", "imc-consent-catalog.manifest.json"),
    path.join(process.cwd(), "apps", "web", "public", "imc-consent-library", "imc-consent-catalog.manifest.json"),
  ];

  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, "utf8");
      return JSON.parse(raw.replace(/^\uFEFF/, "")) as ImcManifestItem[];
    } catch {
      // try next candidate
    }
  }

  throw new ApiError(500, "IMC consent manifest not found");
}

async function loadFieldMap(): Promise<Record<string, TemplateFieldMap>> {
  const candidates = [
    path.join(process.cwd(), "public", "imc-consent-library", "imc-template-field-map.json"),
    path.join(process.cwd(), "apps", "web", "public", "imc-consent-library", "imc-template-field-map.json"),
  ];

  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, "utf8");
      return JSON.parse(raw.replace(/^\uFEFF/, "")) as Record<string, TemplateFieldMap>;
    } catch {
      // try next candidate
    }
  }

  return {};
}

async function readPublicPdf(publicPath: string): Promise<Buffer> {
  const relative = publicPath.replace(/^\/+/, "");
  const candidates = [
    path.join(process.cwd(), "public", relative),
    path.join(process.cwd(), "apps", "web", "public", relative),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new ApiError(500, `IMC approved PDF file not found: ${publicPath}`);
}

function resolveTemplateMetadata(metadata: unknown) {
  const root = asRecord(metadata);
  const template = asRecord(root.imcApprovedTemplate);

  return {
    id: asString(template.id),
    titleEn: asString(template.titleEn),
    publicPath: asString(template.publicPath),
    source: asString(template.source),
    status: asString(template.status),
    templateType: asString(template.templateType),
    checksum: asString(template.checksum),
    locked: template.locked === true,
  };
}

function validateManifestItem(args: {
  metadataTemplateId: string;
  manifestItem: ImcManifestItem | undefined;
}) {
  const { metadataTemplateId, manifestItem } = args;

  if (!metadataTemplateId) {
    throw new ApiError(409, "PDF generation blocked: no IMC approved template is linked to this consent document");
  }

  if (!manifestItem) {
    throw new ApiError(409, "PDF generation blocked: linked IMC template was not found in the approved manifest");
  }

  if (manifestItem.status !== "ACTIVE") {
    throw new ApiError(409, "PDF generation blocked: linked IMC template is not ACTIVE");
  }

  if (manifestItem.source !== "IMC_APPROVED_PDF_LIBRARY") {
    throw new ApiError(409, "PDF generation blocked: linked template source is not IMC_APPROVED_PDF_LIBRARY");
  }

  if (manifestItem.templateType !== "PROCEDURE_CONSENT" && manifestItem.templateType !== "ANESTHESIA_CONSENT") {
    throw new ApiError(409, "PDF generation blocked: linked IMC template is not a consent form");
  }
}

async function drawMappedText(args: {
  pdfDoc: PDFDocument;
  map: TemplateFieldMap;
  values: Record<string, string>;
}) {
  const { pdfDoc, map, values } = args;
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fields = map.fields || {};

  for (const [key, point] of Object.entries(fields)) {
    const value = values[key];
    if (!value) continue;

    const pageIndex = point.page ?? 0;
    const page = pages[pageIndex];
    if (!page) continue;

    page.drawText(value, {
      x: point.x,
      y: point.y,
      size: point.size || 9,
      font,
      color: rgb(0.05, 0.09, 0.16),
      maxWidth: point.maxWidth,
    });
  }
}

async function appendEvidencePage(args: {
  pdfDoc: PDFDocument;
  documentId: string;
  consentReference: string;
  patientName: string;
  mrn: string;
  procedure: string;
  physicianName: string;
  imcTitle: string;
  verifyUrl: string;
}) {
  const {
    pdfDoc,
    documentId,
    consentReference,
    patientName,
    mrn,
    procedure,
    physicianName,
    imcTitle,
    verifyUrl,
  } = args;

  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("WathiqCare Evidence Appendix", {
    x: 48,
    y: 780,
    size: 18,
    font: bold,
    color: rgb(0, 0.17, 0.36),
  });

  page.drawText("Appendix to IMC Approved Consent Form", {
    x: 48,
    y: 754,
    size: 11,
    font,
    color: rgb(0.2, 0.25, 0.33),
  });

  const rows: Array<[string, string]> = [
    ["IMC Approved Template", imcTitle],
    ["Consent Reference", consentReference],
    ["Document ID", documentId],
    ["Patient", patientName],
    ["MRN", mrn],
    ["Procedure", procedure],
    ["Physician", physicianName],
    ["Generated At", new Date().toISOString()],
  ];

  let y = 700;

  for (const [label, value] of rows) {
    page.drawText(label, {
      x: 48,
      y,
      size: 10,
      font: bold,
      color: rgb(0, 0.17, 0.36),
    });

    page.drawText(value || "N/A", {
      x: 190,
      y,
      size: 10,
      font,
      color: rgb(0.05, 0.09, 0.16),
      maxWidth: 330,
    });

    y -= 26;
  }

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "M",
    width: 180,
    margin: 1,
  });

  const qrBase64 = qrDataUrl.split(",")[1] || "";
  const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, "base64"));

  page.drawImage(qrImage, {
    x: 48,
    y: 120,
    width: 110,
    height: 110,
  });

  page.drawText("Verification URL", {
    x: 180,
    y: 205,
    size: 10,
    font: bold,
    color: rgb(0, 0.17, 0.36),
  });

  page.drawText(verifyUrl, {
    x: 180,
    y: 185,
    size: 8,
    font,
    color: rgb(0.05, 0.09, 0.16),
    maxWidth: 340,
  });

  page.drawText(
    "This appendix does not replace the IMC approved consent form. It records the digital evidence, source template, and verification reference.",
    {
      x: 48,
      y: 70,
      size: 8,
      font,
      color: rgb(0.35, 0.4, 0.48),
      maxWidth: 500,
    },
  );
}

export async function renderImcApprovedConsentPdf(args: {
  documentId: string;
  tenantId: string;
  origin: string;
}) {
  const prisma = getPrisma();

  const doc = await prisma.consentDocument.findFirst({
    where: {
      id: args.documentId,
      tenantId: args.tenantId,
    },
    include: {
      template: {
        select: {
          titleEn: true,
          consentType: true,
          specialty: true,
        },
      },
      case: {
        select: {
          caseNumber: true,
        },
      },
    },
  });

  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  const linkedTemplate = resolveTemplateMetadata(doc.metadata);
  const manifest = await loadManifest();
  const manifestItem = manifest.find((item) => item.id === linkedTemplate.id);

  validateManifestItem({
    metadataTemplateId: linkedTemplate.id,
    manifestItem,
  });

  if (!manifestItem) {
    throw new ApiError(409, "IMC manifest item not found");
  }

  const fieldMaps = await loadFieldMap();
  const fieldMap = fieldMaps[manifestItem.id] || fieldMaps._default;

  if (!fieldMap) {
    throw new ApiError(409, "PDF generation blocked: no field map exists for the linked IMC approved template");
  }

  const pdfBytes = await readPublicPdf(manifestItem.publicPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const values: Record<string, string> = {
    patientName: doc.patientName || "",
    mrn: doc.mrn || "",
    dob: doc.dob || "",
    gender: doc.gender || "",
    diagnosis: doc.diagnosis || "",
    procedure: doc.plannedProcedure || doc.procedureDetails || "",
    physicianName: doc.physicianName || "",
    physicianLicense: doc.physicianLicense || "",
    physicianSpecialty: doc.physicianSpecialty || doc.template.specialty || "",
    department: doc.department || "",
    consentReference: doc.consentReference || "",
    caseNumber: doc.case?.caseNumber || "",
    generatedAt: new Date().toLocaleString("en-GB"),
  };

  await drawMappedText({
    pdfDoc,
    map: fieldMap,
    values,
  });

  if (fieldMap.appendEvidencePage !== false) {
    const verifyUrl = `${args.origin}/verify/consent/${doc.id}`;

    await appendEvidencePage({
      pdfDoc,
      documentId: doc.id,
      consentReference: doc.consentReference,
      patientName: doc.patientName,
      mrn: doc.mrn || "",
      procedure: doc.plannedProcedure || doc.procedureDetails || "",
      physicianName: doc.physicianName,
      imcTitle: manifestItem.titleEn,
      verifyUrl,
    });
  }

  const finalBytes = await pdfDoc.save();

  return {
    bytes: Buffer.from(finalBytes),
    consentReference: doc.consentReference,
    imcTemplateId: manifestItem.id,
    imcTemplateTitle: manifestItem.titleEn,
  };
}
