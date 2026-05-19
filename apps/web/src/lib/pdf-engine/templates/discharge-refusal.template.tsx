import { renderPdfDocumentShell } from "@/lib/pdf-engine/core/pdf-renderer";
import { formatEvidenceValue, renderDefinitionRows, renderSection } from "@/lib/pdf-engine/core/pdf-layout";
import { buildPdfLanguageLayoutFlags } from "@/lib/pdf-engine/core/pdf-rtl";
import type { PdfEvidenceLanguage, PdfEvidenceRecord } from "@/lib/pdf-engine/core/pdf-types";

export interface DischargeRefusalTemplatePayload {
  brandingData?: { department?: string };
  evidenceMetadata: PdfEvidenceRecord;
  documentBodyData: {
    caseSummary?: string | null;
    refusalReason?: string | null;
    physicianName?: string | null;
  };
  language: PdfEvidenceLanguage;
  qrVerificationData?: { verificationUrl?: string | null };
}

export function renderDischargeRefusalTemplate(payload: DischargeRefusalTemplatePayload): string {
  const flags = buildPdfLanguageLayoutFlags(payload.language);
  const summarySection = renderSection(
    payload.language === "ar" ? "ملخص الحالة" : "Case Summary",
    renderDefinitionRows([
      {
        label: payload.language === "ar" ? "المريض" : "Patient",
        value: formatEvidenceValue(payload.evidenceMetadata.patientName),
      },
      {
        label: payload.language === "ar" ? "السبب" : "Refusal Reason",
        value: formatEvidenceValue(payload.documentBodyData.refusalReason),
      },
      {
        label: payload.language === "ar" ? "الطبيب" : "Physician",
        value: formatEvidenceValue(payload.documentBodyData.physicianName),
      },
    ]),
  );

  return renderPdfDocumentShell({
    lang: flags.language,
    dir: flags.dir,
    title: payload.language === "ar" ? "هيكل رفض الخروج" : "Discharge Refusal Skeleton",
    bodyHtml: summarySection + `<div class="wc-pdf-note">${formatEvidenceValue(payload.documentBodyData.caseSummary)}</div>`,
    footerText: payload.evidenceMetadata.legalFooterText,
    referenceNumber: payload.evidenceMetadata.documentId,
    version: payload.evidenceMetadata.consentVersion || "v1.0",
    generatedAt: payload.evidenceMetadata.generatedAt,
    department: payload.brandingData?.department || "Discharge Refusal Program",
    qrPayload: payload.qrVerificationData?.verificationUrl || payload.evidenceMetadata.verificationUrl,
    documentHash: payload.evidenceMetadata.hash,
    evidenceId: payload.evidenceMetadata.evidenceId,
    auditReferenceId: payload.evidenceMetadata.auditId,
  });
}