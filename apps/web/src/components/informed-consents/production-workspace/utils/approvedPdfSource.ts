import type { ClinicalKnowledgeAssembly } from "../types";

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

export function isAssemblyApprovedPdfSourceVerified(
  assembly?: ClinicalKnowledgeAssembly,
): boolean {
  const consentForm = assembly?.consentForm;
  const approvedPdfUrl = consentForm?.pdfTemplateUrl?.trim() || "";

  if (!approvedPdfUrl) return false;

  const consentFormMeta = readRecord(consentForm);
  const governanceSnapshot = readRecord(consentForm?.governanceSnapshot);
  const assemblyMeta = readRecord(assembly);
  const approvedPdf = readRecord(assemblyMeta?.approvedPdf);
  const dispatchEligibility = readRecord(assemblyMeta?.dispatchEligibility);

  return Boolean(
    consentFormMeta?.sourceVerified === true ||
      governanceSnapshot?.sourceVerified === true ||
      approvedPdf?.sourceVerified === true ||
      dispatchEligibility?.canPreview === true ||
      dispatchEligibility?.canSend === true,
  );
}
