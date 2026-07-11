import path from "node:path";
import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ formId: string }> | { formId: string };
};

type DetectedTextItem = {
  page: number;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
  xNorm: number;
  yNorm: number;
  widthNorm: number;
};

type DetectedField = {
  key: string;
  labelEn: string;
  role: "PHYSICIAN_REQUIRED" | "PATIENT_REQUIRED" | "SYSTEM_AUTO";
  type: "MULTILINE_TEXT" | "SIGNATURE" | "DATETIME";
  required: boolean;
  page?: number;
  x?: number;
  y?: number;
  size?: number;
  maxWidth?: number;
  confidence: number;
  source: string;
  sourceText?: string;
};

const ALLOWED_PUBLIC_PREFIXES = [
  "/approved-consent-forms/",
  "/approved-consent-forms-patient-copy/",
  "/imc-consent-library/",
];

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function slugFromFormId(formId: string) {
  return formId.startsWith("imc-approved-") ? formId.slice("imc-approved-".length) : formId;
}

function defaultApprovedPdfUrl(formId: string) {
  return "/approved-consent-forms/" + slugFromFormId(formId) + ".pdf";
}

function normalizePublicPdfPath(source: string) {
  const cleanSource = source.split("#")[0].split("?")[0];

  if (/^https?:\/\//i.test(cleanSource)) {
    return null;
  }

  if (!ALLOWED_PUBLIC_PREFIXES.some((prefix) => cleanSource.startsWith(prefix))) {
    return null;
  }

  const decoded = decodeURIComponent(cleanSource);
  const relative = decoded.replace(/^\/+/, "");

  if (!relative || relative.includes("..") || !relative.toLowerCase().endsWith(".pdf")) {
    return null;
  }

  return relative;
}

async function readPublicPdf(source: string) {
  const relative = normalizePublicPdfPath(source);
  if (!relative) return null;

  const candidates = [
    path.join(process.cwd(), "public", relative),
    path.join(process.cwd(), "apps", "web", "public", relative),
  ];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

function normalizeText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[ـ]/g, "")
    .trim()
    .toLowerCase();
}

function includesAny(item: DetectedTextItem, patterns: string[]) {
  const normalized = normalizeText(item.str);
  return patterns.some((pattern) => normalized.includes(normalizeText(pattern)));
}

function isBlankLineText(value: string) {
  const compact = value.replace(/\s+/g, "");
  return /_{6,}/.test(compact) || /\.{8,}/.test(compact) || /…{3,}/.test(compact);
}

async function extractPdfTextItems(pdfBytes: Uint8Array): Promise<DetectedTextItem[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    disableWorker: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const detected: DetectedTextItem[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    for (const rawItem of textContent.items as Array<Record<string, unknown>>) {
      const str = typeof rawItem.str === "string" ? rawItem.str.trim() : "";
      const transform = Array.isArray(rawItem.transform) ? rawItem.transform : [];
      const x = Number(transform[4] ?? 0);
      const y = Number(transform[5] ?? 0);
      const width = Number(rawItem.width ?? 0);
      const height = Number(rawItem.height ?? transform[3] ?? 10);

      if (!str) continue;

      detected.push({
        page: pageNumber,
        str,
        x,
        y,
        width,
        height,
        pageWidth: viewport.width,
        pageHeight: viewport.height,
        xNorm: clamp(x / viewport.width),
        yNorm: clamp(1 - y / viewport.height),
        widthNorm: clamp(width / viewport.width),
      });
    }
  }

  return detected;
}

function itemsOnPage(items: DetectedTextItem[], page: number) {
  return items.filter((item) => item.page === page);
}

function findAnchor(items: DetectedTextItem[], patterns: string[]) {
  return items.find((item) => includesAny(item, patterns));
}

function findNearestBlankBelow(
  items: DetectedTextItem[],
  anchor: DetectedTextItem,
  options?: {
    leftHalfOnly?: boolean;
    maxDistance?: number;
    minDistance?: number;
  },
) {
  const pageItems = itemsOnPage(items, anchor.page);
  const leftHalfOnly = options?.leftHalfOnly ?? true;
  const maxDistance = options?.maxDistance ?? 0.22;
  const minDistance = options?.minDistance ?? 0.002;

  return pageItems
    .filter((item) => isBlankLineText(item.str))
    .filter((item) => !leftHalfOnly || item.xNorm < 0.50)
    .filter((item) => item.yNorm > anchor.yNorm + minDistance)
    .filter((item) => item.yNorm < anchor.yNorm + maxDistance)
    .sort((a, b) => Math.abs(a.yNorm - anchor.yNorm) - Math.abs(b.yNorm - anchor.yNorm))[0];
}

function findSignatureLineAfterDoctorStatement(items: DetectedTextItem[]) {
  const doctorStatementAnchor = findAnchor(items, [
    "doctor/delegate statement",
    "doctor delegate statement",
    "بيان الطبيب",
    "مندوب الطبيب",
  ]);

  const candidatePages = doctorStatementAnchor
    ? [doctorStatementAnchor.page]
    : [...new Set(items.map((item) => item.page))].sort((a, b) => b - a);

  for (const page of candidatePages) {
    const pageItems = itemsOnPage(items, page);
    const minY = doctorStatementAnchor && doctorStatementAnchor.page === page ? doctorStatementAnchor.yNorm : 0;

    const explicitSignature = pageItems
      .filter((item) => item.xNorm < 0.52)
      .filter((item) => item.yNorm > minY)
      .filter((item) => includesAny(item, ["signature:", "signature", "التوقيع"]))
      .sort((a, b) => a.yNorm - b.yNorm)[0];

    if (explicitSignature) {
      return explicitSignature;
    }
  }

  return undefined;
}

function fieldFromBlankLine(args: {
  key: string;
  labelEn: string;
  role: "PHYSICIAN_REQUIRED" | "PATIENT_REQUIRED";
  type: "MULTILINE_TEXT" | "SIGNATURE";
  blank?: DetectedTextItem;
  anchor?: DetectedTextItem;
  source: string;
  fallback?: { page: number; x: number; y: number; maxWidth: number };
}): DetectedField {
  const { key, labelEn, role, type, blank, anchor, source, fallback } = args;

  if (blank) {
    return {
      key,
      labelEn,
      role,
      type,
      required: true,
      page: blank.page,
      x: Number(blank.xNorm.toFixed(4)),
      y: Number((blank.yNorm - 0.004).toFixed(4)),
      size: 8,
      maxWidth: Number(Math.max(0.18, Math.min(0.45, blank.widthNorm)).toFixed(4)),
      confidence: 0.86,
      source,
      sourceText: anchor?.str,
    };
  }

  return {
    key,
    labelEn,
    role,
    type,
    required: true,
    page: fallback?.page,
    x: fallback?.x,
    y: fallback?.y,
    size: 8,
    maxWidth: fallback?.maxWidth,
    confidence: fallback ? 0.42 : 0.25,
    source: fallback ? source + " fallback placement" : source + " anchor-only",
    sourceText: anchor?.str,
  };
}

function detectFields(items: DetectedTextItem[]): DetectedField[] {
  const fields: DetectedField[] = [];

  const followingWillBePerformed = findAnchor(items, [
    "the following will be performed",
    "تتطلب هذه الحالة المرضية الإجراء الطبي التالي",
    "تتطلب هذه الحالة المرضية الاجراء الطبي التالي",
  ]);

  const conditionAnchor = findAnchor(items, [
    "you have the following condition",
    "following condition",
    "condition:",
  ]);

  const procedureAnchor = followingWillBePerformed ?? findAnchor(items, [
    "this condition requires the following procedure",
    "include site and/or side",
    "procedure)",
    "الإجراء الطبي التالي",
  ]);

  const hasDedicatedConditionField = Boolean(conditionAnchor && !followingWillBePerformed);

  if (hasDedicatedConditionField && conditionAnchor) {
    const blank = findNearestBlankBelow(items, conditionAnchor, {
      leftHalfOnly: true,
      maxDistance: 0.16,
    });

    fields.push(fieldFromBlankLine({
      key: "condition_and_treatment",
      labelEn: "Condition and treatment",
      role: "PHYSICIAN_REQUIRED",
      type: "MULTILINE_TEXT",
      blank,
      anchor: conditionAnchor,
      source: "Detected from condition anchor and nearest blank line",
      fallback: { page: conditionAnchor.page, x: 0.085, y: 0.285, maxWidth: 0.39 },
    }));
  }

  if (procedureAnchor) {
    const blank = findNearestBlankBelow(items, procedureAnchor, {
      leftHalfOnly: true,
      maxDistance: 0.20,
    });

    fields.push(fieldFromBlankLine({
      key: "procedure_site_side",
      labelEn: "Procedure, site and/or side",
      role: "PHYSICIAN_REQUIRED",
      type: "MULTILINE_TEXT",
      blank,
      anchor: procedureAnchor,
      source: "Detected from procedure/site/side anchor and nearest blank line",
      fallback: { page: procedureAnchor.page, x: 0.085, y: 0.391, maxWidth: 0.39 },
    }));
  }

  const doctorSignature = findSignatureLineAfterDoctorStatement(items);

  if (doctorSignature) {
    const lineText = doctorSignature.str;
    const labelOffset = lineText.toLowerCase().includes("signature")
      ? Math.min(0.11, Math.max(0.07, doctorSignature.widthNorm * 0.22))
      : 0;

    fields.push({
      key: "treating_physician_signature",
      labelEn: "Treating physician signature",
      role: "PHYSICIAN_REQUIRED",
      type: "SIGNATURE",
      required: true,
      page: doctorSignature.page,
      x: Number((doctorSignature.xNorm + labelOffset).toFixed(4)),
      y: Number((doctorSignature.yNorm - 0.002).toFixed(4)),
      size: 8,
      maxWidth: 0.34,
      confidence: 0.82,
      source: "Detected from Doctor/delegate statement and Signature line",
      sourceText: doctorSignature.str,
    });
  }

  fields.push({
    key: "patient_signature",
    labelEn: "Patient / guardian signature",
    role: "PATIENT_REQUIRED",
    type: "SIGNATURE",
    required: true,
    confidence: 0.30,
    source: "Patient signature required by consent workflow; placement requires patient signing engine",
  });

  fields.push({
    key: "signed_at",
    labelEn: "Signed date and time",
    role: "SYSTEM_AUTO",
    type: "DATETIME",
    required: true,
    confidence: 0.30,
    source: "System-generated timestamp required by consent workflow",
  });

  return fields;
}

function buildRecommendedMapping(formId: string, detectedFields: DetectedField[]) {
  const slug = slugFromFormId(formId);

  return {
    formId,
    slug,
    titleEn: slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    layoutFamily: "IMC_AUTO_DETECTED_CONSENT",
    version: "0.1.0-auto",
    verificationStatus: "DRAFT",
    requiresDoctorCompletion: detectedFields.some((field) => field.role === "PHYSICIAN_REQUIRED"),
    supportsAnesthesiaWorkflow: false,
    blocksPatientDispatchUntilVerified: true,
    coordinateMode: "NORMALIZED",
    fields: detectedFields.map((field) => ({
      key: field.key,
      labelEn: field.labelEn,
      role: field.role,
      type: field.type,
      required: field.required,
      coordinates: field.page && field.x !== undefined && field.y !== undefined
        ? {
            page: field.page,
            x: field.x,
            y: field.y,
            size: field.size ?? 8,
            maxWidth: field.maxWidth ?? 0.34,
          }
        : undefined,
    })),
  };
}

async function handleAutoFieldMappingPost(request: NextRequest, context: RouteContext) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  if (!auth.ok) return auth.response;

  const params = await context.params;
  const formId = params.formId;

  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  const approvedPdfUrl =
    typeof payload.approvedPdfUrl === "string" && payload.approvedPdfUrl.trim()
      ? payload.approvedPdfUrl.trim()
      : defaultApprovedPdfUrl(formId);

  const pdfBytes = await readPublicPdf(approvedPdfUrl);

  if (!pdfBytes) {
    return NextResponse.json(
      {
        ok: false,
        formId,
        approvedPdfUrl,
        error: "Approved PDF source could not be loaded for auto field mapping.",
      },
      { status: 404 },
    );
  }

  const items = await extractPdfTextItems(new Uint8Array(pdfBytes));
  const detectedFields = detectFields(items);
  const physicianFields = detectedFields.filter((field) => field.role === "PHYSICIAN_REQUIRED");
  const recommendedMapping = buildRecommendedMapping(formId, detectedFields);

  return NextResponse.json({
    ok: true,
    formId,
    approvedPdfUrl,
    source: "pdf-auto-field-mapping-assistant",
    detectionMode: "text-anchor-and-blank-line",
    requiresHumanVerification: true,
    confidence:
      physicianFields.length > 0
        ? Number((physicianFields.reduce((total, field) => total + field.confidence, 0) / physicianFields.length).toFixed(2))
        : 0,
    detectedTextItems: items.length,
    detectedFields,
    recommendedMapping,
  });
}


export async function POST(request: NextRequest, context: RouteContext) {
  try {
    return await handleAutoFieldMappingPost(request, context);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    console.error("AUTO_FIELD_MAPPING_ERROR", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });

    return NextResponse.json(
      {
        ok: false,
        source: "pdf-auto-field-mapping-assistant",
        error: "Auto field mapping failed.",
        errorName: err.name,
        errorMessage: err.message,
      },
      { status: 500 },
    );
  }
}
