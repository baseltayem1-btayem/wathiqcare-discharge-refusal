import { renderPdfDocumentShell } from "@/lib/pdf-engine/core/pdf-renderer";
import { formatEvidenceValue, renderDefinitionRows, renderSection } from "@/lib/pdf-engine/core/pdf-layout";
import { buildPdfLanguageLayoutFlags } from "@/lib/pdf-engine/core/pdf-rtl";
import type { PdfEvidenceLanguage, PdfEvidenceRecord } from "@/lib/pdf-engine/core/pdf-types";

export interface PromissoryNoteTemplatePayload {
  brandingData?: { department?: string };
  evidenceMetadata: PdfEvidenceRecord;
  documentBodyData: {
    debtorName?: string | null;
    amount?: string | null;
    obligationSummary?: string | null;
  };
  language: PdfEvidenceLanguage;
  qrVerificationData?: { verificationUrl?: string | null };
}

export function renderPromissoryNoteTemplate(payload: PromissoryNoteTemplatePayload): string {
  const flags = buildPdfLanguageLayoutFlags(payload.language);
  const summarySection = renderSection(
    payload.language === "ar" ? "بيانات السند" : "Promissory Note Summary",
    renderDefinitionRows([
      {
        label: payload.language === "ar" ? "المدين" : "Debtor",
        value: formatEvidenceValue(payload.documentBodyData.debtorName),
      },
      {
        label: payload.language === "ar" ? "المبلغ" : "Amount",
        value: formatEvidenceValue(payload.documentBodyData.amount),
      },
      {
        label: payload.language === "ar" ? "الالتزام" : "Obligation",
        value: formatEvidenceValue(payload.documentBodyData.obligationSummary),
      },
    ]),
  );

  return renderPdfDocumentShell({
    lang: flags.language,
    dir: flags.dir,
    title: payload.language === "ar" ? "هيكل السند لأمر" : "Promissory Note Skeleton",
    bodyHtml: summarySection,
    footerText: payload.evidenceMetadata.legalFooterText,
    referenceNumber: payload.evidenceMetadata.documentId,
    version: payload.evidenceMetadata.consentVersion || "v1.0",
    generatedAt: payload.evidenceMetadata.generatedAt,
    department: payload.brandingData?.department || "Financial Legal Automation",
    qrPayload: payload.qrVerificationData?.verificationUrl || payload.evidenceMetadata.verificationUrl,
    documentHash: payload.evidenceMetadata.hash,
    evidenceId: payload.evidenceMetadata.evidenceId,
    auditReferenceId: payload.evidenceMetadata.auditId,
  });
}