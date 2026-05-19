export type PdfEvidenceLanguage = "ar" | "en";

export type PdfModuleKey = "informed-consents" | (string & {});

export interface PdfEvidenceRecord {
  documentId: string;
  evidenceId: string;
  auditId: string | null;
  tenantId: string;
  moduleKey: PdfModuleKey;
  patientMrn: string;
  patientName: string;
  caseNumber: string | null;
  encounterNo: string | null;
  generatedAt: string;
  generatedBy: string;
  consentVersion: string | null;
  language: PdfEvidenceLanguage;
  hash: string | null;
  verificationUrl: string | null;
  qrDataUrl: string | null;
  legalFooterText: string;
  legalRuntime?: PdfLegalRuntimeFooter | null;
}

export interface PdfLegalRuntimeFooter {
  immutableSeal: string | null;
  forensicChainReference: string | null;
  qrVerificationPayload: string | null;
  evidenceVerificationStatus: string | null;
  legalRetentionNotice: string | null;
  retentionClass?: string | null;
  archiveReference?: string | null;
  forensicVerificationReference?: string | null;
  judicialExportReference?: string | null;
  verificationIntegrityIndicator?: string | null;
}

export interface PdfEvidenceHashOptions {
  includeVolatileFields?: boolean;
  volatileFields?: ReadonlyArray<string>;
}

export interface PdfEvidenceVerificationOptions {
  baseUrl?: string;
}

export interface PdfEvidenceQrResult {
  verificationUrl: string;
  qrPayload: string;
  qrDataUrl: string | null;
}

export interface PdfHtmlRenderContext {
  lang: PdfEvidenceLanguage;
  dir: "rtl" | "ltr";
  title: string;
  bodyHtml: string;
  footerText: string;
}

export interface InformedConsentEvidenceHtmlPayload {
  evidence: PdfEvidenceRecord;
  consentTitle?: string | null;
  consentType?: string | null;
  templateName?: string | null;
  physicianName?: string | null;
  renderedBodyHtml?: string | null;
}