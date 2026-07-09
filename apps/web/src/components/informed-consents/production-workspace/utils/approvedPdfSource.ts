import type { ClinicalKnowledgeAssembly } from "@/lib/clinical-knowledge/types";

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isSecureApprovedPdfEndpoint(value: string): boolean {
  return /^\/api\/modules\/informed-consents\/forms\/[^/]+\/approved-pdf$/.test(value);
}

export function resolveAssemblyApprovedPdfUrl(
  assembly?: ClinicalKnowledgeAssembly,
): string {
  const consentForm = assembly?.consentForm;
  const consentFormMeta = readRecord(consentForm);
  const governanceSnapshot = readRecord(consentForm?.governanceSnapshot);
  const assemblyMeta = readRecord(assembly);
  const approvedPdf = readRecord(assemblyMeta?.approvedPdf);

  const formId = readString(consentFormMeta?.id);
  const secureEndpoint = formId
    ? `/api/modules/informed-consents/forms/${encodeURIComponent(formId)}/approved-pdf`
    : "";

  return (
    secureEndpoint ||
    readString(consentFormMeta?.approvedPdfUrl) ||
    readString(consentFormMeta?.sourcePdfUrl) ||
    readString(consentFormMeta?.pdfUrl) ||
    readString(approvedPdf?.url) ||
    readString(governanceSnapshot?.approvedPdfUrl) ||
    readString(governanceSnapshot?.sourcePdfUrl) ||
    readString(consentForm?.pdfTemplateUrl)
  );
}

export function isAssemblyApprovedPdfSourceVerified(
  assembly?: ClinicalKnowledgeAssembly,
): boolean {
  const approvedPdfUrl = resolveAssemblyApprovedPdfUrl(assembly);

  if (!approvedPdfUrl) return false;

  const consentForm = assembly?.consentForm;
  const consentFormMeta = readRecord(consentForm);
  const governanceSnapshot = readRecord(consentForm?.governanceSnapshot);
  const assemblyMeta = readRecord(assembly);
  const approvedPdf = readRecord(assemblyMeta?.approvedPdf);
  const dispatchEligibility = readRecord(assemblyMeta?.dispatchEligibility);

  return Boolean(
    isSecureApprovedPdfEndpoint(approvedPdfUrl) ||
      consentFormMeta?.sourceVerified === true ||
      governanceSnapshot?.sourceVerified === true ||
      approvedPdf?.sourceVerified === true ||
      dispatchEligibility?.canPreview === true ||
      dispatchEligibility?.canSend === true,
  );
}