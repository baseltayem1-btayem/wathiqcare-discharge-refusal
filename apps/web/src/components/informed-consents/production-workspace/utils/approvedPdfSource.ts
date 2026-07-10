import type { ClinicalKnowledgeAssembly } from "@/lib/clinical-knowledge/types";

const APPROVED_PUBLIC_PDF_PREFIXES = [
  "/approved-consent-forms/",
  "/imc-consent-library/",
];

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

function isApprovedPublicPdfPath(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.includes("..")) return false;

  const pathname = value.split("?")[0] || "";
  const lowerPathname = pathname.toLowerCase();

  return (
    lowerPathname.endsWith(".pdf") &&
    APPROVED_PUBLIC_PDF_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function resolveAssemblyApprovedPdfUrl(
  assembly?: ClinicalKnowledgeAssembly,
): string {
  const consentForm = assembly?.consentForm;
  const consentFormMeta = readRecord(consentForm);
  const governanceSnapshot = readRecord(consentForm?.governanceSnapshot);
  const assemblyMeta = readRecord(assembly);
  const approvedPdf = readRecord(assemblyMeta?.approvedPdf);

  const explicitApprovedPath =
    readString(consentFormMeta?.approvedPdfUrl) ||
    readString(consentFormMeta?.sourcePdfUrl) ||
    readString(consentFormMeta?.pdfUrl) ||
    readString(approvedPdf?.url) ||
    readString(governanceSnapshot?.approvedPdfUrl) ||
    readString(governanceSnapshot?.sourcePdfUrl) ||
    readString(consentFormMeta?.pdfTemplateUrl);

  if (explicitApprovedPath) {
    return explicitApprovedPath;
  }

  const formId = readString(consentFormMeta?.id);

  return formId
    ? `/api/modules/informed-consents/forms/${encodeURIComponent(formId)}/approved-pdf`
    : "";
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
    isApprovedPublicPdfPath(approvedPdfUrl) ||
      isSecureApprovedPdfEndpoint(approvedPdfUrl) ||
      consentFormMeta?.sourceVerified === true ||
      governanceSnapshot?.sourceVerified === true ||
      approvedPdf?.sourceVerified === true ||
      dispatchEligibility?.canPreview === true ||
      dispatchEligibility?.canSend === true,
  );
}

export function resolveAssemblyPatientCopyPdfUrl(
  assembly?: ClinicalKnowledgeAssembly,
): string {
  const consentForm = assembly?.consentForm;
  const consentFormMeta = readRecord(consentForm);
  const governanceSnapshot = readRecord(consentForm?.governanceSnapshot);
  const assemblyMeta = readRecord(assembly);
  const approvedPdf = readRecord(assemblyMeta?.approvedPdf);

  return (
    readString(consentFormMeta?.patientCopyPdfUrl) ||
    readString(consentFormMeta?.patientCopyUrl) ||
    readString(consentFormMeta?.patientCopyTemplateUrl) ||
    readString(consentFormMeta?.patientCopyPdfTemplateUrl) ||
    readString(governanceSnapshot?.patientCopyPdfUrl) ||
    readString(governanceSnapshot?.patientCopyUrl) ||
    readString(approvedPdf?.patientCopyPdfUrl) ||
    ""
  );
}
