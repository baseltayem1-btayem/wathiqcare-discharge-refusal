import type { DynamicConsentBuildResult, DynamicConsentRenderedDocument } from "@/modules/consent-engine/engine/types";

export interface ConsentPdfPayload {
  title: string;
  titleAr: string;
  reference: string;
  status: "draft" | "finalized";
  version: string;
  generatedAt: string;
  patientName: string;
  patientMRN?: string | null;
  patientDOB?: string | null;
  patientGender?: string | null;
  physicianName: string;
  physicianLicense?: string | null;
  specialty: string;
  diagnosis?: string | null;
  procedure?: string | null;
  riskCategorySummary?: string | null;
  html: string;
  qrCodeUrl?: string | null;
  legalSealHash?: string | null;
  auditChecksum?: string | null;
  isArabic: boolean;
}

export interface PdfRenderingOptions {
  format?: "A4" | "letter";
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  scale?: number;
}

const DEFAULT_MARGIN = {
  top: "16mm",
  right: "10mm",
  bottom: "16mm",
  left: "10mm",
};

export function buildConsentPdfPayload(
  buildResult: DynamicConsentBuildResult,
  isArabic: boolean,
): ConsentPdfPayload {
  const reference = `CONSENT-${buildResult.payload.encounter.caseNumber || buildResult.payload.patient.id || "draft"}-${buildResult.generatedAt.slice(0, 10)}`;

  return {
    title: isArabic ? buildResult.template.displayNameAr : buildResult.template.displayNameEn,
    titleAr: buildResult.template.displayNameAr,
    reference,
    status: "draft",
    version: buildResult.template.version,
    generatedAt: buildResult.generatedAt,
    patientName: buildResult.payload.patient.name,
    patientMRN: buildResult.payload.patient.identifier,
    patientDOB: undefined,
    patientGender: undefined,
    physicianName: buildResult.payload.physician.name,
    physicianLicense: buildResult.payload.physician.identifier,
    specialty: buildResult.payload.specialty,
    diagnosis: buildResult.payload.diagnosis,
    procedure: buildResult.payload.procedure,
    riskCategorySummary: buildResult.risks
      .map((r) => `${r.titleEn}(${r.severity})`)
      .slice(0, 3)
      .join("; "),
    html: buildResult.rendered.html,
    qrCodeUrl: undefined,
    legalSealHash: buildResult.audit.hash.slice(0, 16),
    auditChecksum: buildResult.audit.hash,
    isArabic,
  };
}

export function getPdfRenderingOptions(isArabic?: boolean): PdfRenderingOptions {
  return {
    format: "A4",
    printBackground: true,
    margin: DEFAULT_MARGIN,
    scale: 1.0,
  };
}
