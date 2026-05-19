import type { InformedConsentEvidenceHtmlPayload, PdfEvidenceLanguage, PdfEvidenceRecord } from "@/lib/pdf-engine/core/pdf-types";
import { buildEvidenceAuditMetadata } from "@/lib/pdf-engine/evidence/audit-metadata";
import { generateEvidenceHash } from "@/lib/pdf-engine/evidence/evidence-hash";
import { buildEvidenceQrData } from "@/lib/pdf-engine/evidence/qr-generator";
import { buildDeterministicVerificationToken } from "@/lib/pdf-engine/evidence/verification-token";
import { determineRetentionClass } from "@/lib/pdf-engine/persistence/retention-policy";
import { stableSerializeRuntimeValue } from "@/lib/pdf-engine/runtime/evidence-snapshot";
import { storeEvidenceSnapshot } from "@/lib/pdf-engine/runtime/evidence-storage";
import { buildForensicAuditEvent } from "@/lib/pdf-engine/runtime/forensic-audit-chain";
import { buildLegalEvidencePackage, type LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";
import { buildOtpEvidenceRecord } from "@/lib/pdf-engine/runtime/otp-evidence";
import { buildInformedConsentEvidenceHtml, buildInformedConsentTemplatePayload } from "@/lib/pdf-engine/templates/informed-consent.template";
import { buildPdfLanguageLayoutFlags } from "@/lib/pdf-engine/core/pdf-rtl";

function isTruthyEnvFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isInformedConsentPdfEnginePreviewEnabled(): boolean {
  return isTruthyEnvFlag(process.env.WATHIQCARE_PDF_ENGINE_PREVIEW_ENABLED);
}

export interface InformedConsentPdfPreviewDocument {
  id: string;
  tenantId: string;
  consentReference: string;
  documentVersion: string | null;
  patientName: string;
  mrn: string | null;
  physicianName: string;
  physicianLicense: string | null;
  physicianSpecialty: string | null;
  plannedProcedure: string | null;
  procedureDetails: string | null;
  diagnosis: string | null;
  createdAt: Date;
  template: {
    titleAr: string;
    titleEn: string;
    consentType: string;
    specialty: string | null;
  };
  case: {
    caseNumber: string | null;
  } | null;
  auditChecksum: string | null;
  immutablePdfHash: string | null;
  generatedByModel: string | null;
}

export interface BuildInformedConsentEvidenceHtmlPreviewInput {
  document: InformedConsentPdfPreviewDocument;
  origin: string;
  language: PdfEvidenceLanguage;
}

export interface InformedConsentEvidenceHtmlPreviewResult {
  auditMetadata: ReturnType<typeof buildEvidenceAuditMetadata>;
  legalEvidencePackage: LegalEvidencePackage;
  verificationToken: string;
  payload: InformedConsentEvidenceHtmlPayload;
  html: string;
}

function buildPreviewDocumentContent(document: InformedConsentPdfPreviewDocument) {
  return {
    consentReference: document.consentReference,
    consentTitleAr: document.template.titleAr,
    consentTitleEn: document.template.titleEn,
    consentType: document.template.consentType,
    createdAt: document.createdAt.toISOString(),
    diagnosis: document.diagnosis,
    patientName: document.patientName,
    physicianLicense: document.physicianLicense,
    physicianName: document.physicianName,
    physicianSpecialty: document.physicianSpecialty,
    plannedProcedure: document.plannedProcedure,
    procedureDetails: document.procedureDetails,
  };
}

function buildPreviewMetadata(
  document: InformedConsentPdfPreviewDocument,
  language: PdfEvidenceLanguage,
) {
  return {
    caseNumber: document.case?.caseNumber || null,
    language,
    moduleKey: "informed-consents",
    source: "informed-consent-preview-adapter",
    specialty: document.template.specialty,
    templateVersion: document.documentVersion || "v1.0",
    tenantId: document.tenantId,
  };
}

async function buildInformedConsentLegalEvidencePackage(
  input: BuildInformedConsentEvidenceHtmlPreviewInput,
  payload: InformedConsentEvidenceHtmlPayload,
  html: string,
  auditMetadata: ReturnType<typeof buildEvidenceAuditMetadata>,
): Promise<LegalEvidencePackage> {
  const otpEvidence = buildOtpEvidenceRecord({
    verified: false,
    deliveryProvider: "preview-pending",
    deliveryReference: input.document.consentReference,
    verificationMethod: "preview-placeholder",
  });
  const signerReference = input.document.mrn || input.document.consentReference;
  const legalEvidencePackage = buildLegalEvidencePackage({
    auditMetadata,
    documentContent: buildPreviewDocumentContent(input.document),
    evidenceHash: payload.evidence.hash || generateEvidenceHash(payload.evidence),
    evidenceId: payload.evidence.evidenceId,
    html,
    languageDirection: buildPdfLanguageLayoutFlags(input.language).dir,
    otpEvidence,
    signerDetails: {
      signerReference,
      signerName: input.document.patientName,
      signerRole: "patient-subject",
    },
    sourceModule: payload.evidence.moduleKey,
    templateVersion: payload.evidence.consentVersion || "v1.0",
    metadata: {
      auditChecksum: input.document.auditChecksum,
      immutablePdfHash: input.document.immutablePdfHash,
      previewMetadata: buildPreviewMetadata(input.document, input.language),
      qrVerificationPayload: payload.evidence.verificationUrl,
    },
  });

  await storeEvidenceSnapshot(legalEvidencePackage.snapshot);

  return {
    ...legalEvidencePackage,
    auditChain: buildForensicAuditEvent({
      eventType: "informed_consent_preview_runtime_probe",
      actor: auditMetadata.generatedBy,
      timestamp: legalEvidencePackage.snapshot.generatedAt,
      ipAddress: auditMetadata.ipAddress,
      sourceModule: payload.evidence.moduleKey,
      evidenceId: payload.evidence.evidenceId,
      previousChainHash: legalEvidencePackage.auditChain.currentChainHash,
      details: JSON.parse(
        stableSerializeRuntimeValue({
          evidenceHash: legalEvidencePackage.evidenceHash,
          immutableSeal: legalEvidencePackage.immutableSeal.fingerprint,
          snapshotHash: legalEvidencePackage.snapshot.snapshotHash,
        }),
      ),
    }),
  };
}

export async function buildInformedConsentEvidencePayloadFromDocument(
  input: BuildInformedConsentEvidenceHtmlPreviewInput,
): Promise<InformedConsentEvidenceHtmlPayload> {
  const origin = input.origin.replace(/\/$/, "");
  const verificationUrl = `${origin}/verify/consent/${encodeURIComponent(input.document.id)}`;

  // Enterprise PDF engine preview adapter only. Does not replace current production PDF renderer.
  const evidenceDraft: PdfEvidenceRecord = {
    documentId: input.document.id,
    evidenceId: `consent-evidence-${input.document.id}`,
    auditId: null,
    tenantId: input.document.tenantId,
    moduleKey: "informed-consents",
    patientMrn: input.document.mrn || input.document.consentReference,
    patientName: input.document.patientName,
    caseNumber: input.document.case?.caseNumber || null,
    encounterNo: null,
    generatedAt: input.document.createdAt.toISOString(),
    generatedBy: input.document.physicianName || input.document.generatedByModel || "system",
    consentVersion: input.document.documentVersion,
    language: input.language,
    hash: null,
    verificationUrl,
    qrDataUrl: null,
    legalFooterText:
      "This preview is generated for enterprise legal evidence validation only and does not replace the current production consent PDF.",
  };

  const hash = generateEvidenceHash(evidenceDraft);
  const qr = await buildEvidenceQrData({
    evidenceId: evidenceDraft.evidenceId,
    verificationUrl,
  });

  return buildInformedConsentTemplatePayload({
    evidence: {
      ...evidenceDraft,
      hash: input.document.auditChecksum || input.document.immutablePdfHash || hash,
      verificationUrl: qr.verificationUrl,
      qrDataUrl: qr.qrDataUrl,
    },
    consentTitle: input.language === "ar" ? input.document.template.titleAr : input.document.template.titleEn,
    consentType: input.document.template.consentType,
    templateName: input.language === "ar" ? input.document.template.titleAr : input.document.template.titleEn,
    physicianName: input.document.physicianName,
    renderedBodyHtml: null,
  });
}

export async function buildInformedConsentEvidenceHtmlPreview(
  input: BuildInformedConsentEvidenceHtmlPreviewInput,
): Promise<InformedConsentEvidenceHtmlPreviewResult> {
  const basePayload = await buildInformedConsentEvidencePayloadFromDocument(input);
  const verificationToken = buildDeterministicVerificationToken({
    evidenceId: basePayload.evidence.evidenceId,
    documentHash: basePayload.evidence.hash || "",
    auditId: basePayload.evidence.auditId,
  });
  const auditMetadata = buildEvidenceAuditMetadata({
    evidenceId: basePayload.evidence.evidenceId,
    auditId: basePayload.evidence.auditId,
    generatedAt: basePayload.evidence.generatedAt,
    generatedBy: basePayload.evidence.generatedBy,
    documentHash: basePayload.evidence.hash || "",
    sourceModule: basePayload.evidence.moduleKey,
    formVersion: basePayload.evidence.consentVersion,
    ipAddress: null,
    otpStatus: null,
  });
  const previewHtml = buildInformedConsentEvidenceHtml(basePayload);
  const legalEvidencePackage = await buildInformedConsentLegalEvidencePackage(
    input,
    basePayload,
    previewHtml,
    auditMetadata,
  );
  const payload: InformedConsentEvidenceHtmlPayload = {
    ...basePayload,
    evidence: {
      ...basePayload.evidence,
      legalRuntime: {
        immutableSeal: legalEvidencePackage.immutableSeal.fingerprint,
        forensicChainReference: legalEvidencePackage.auditChain.currentChainHash,
        qrVerificationPayload: legalEvidencePackage.qrVerificationPayload,
        evidenceVerificationStatus: "preview-registered",
        legalRetentionNotice:
          "Preview-only legal retention placeholder. Production retention policy remains unchanged until explicitly enabled.",
        retentionClass: determineRetentionClass({ moduleKey: basePayload.evidence.moduleKey }),
        archiveReference: "archive-reference-pending",
        forensicVerificationReference: "forensic-reference-pending",
        judicialExportReference: "judicial-export-reference-pending",
        verificationIntegrityIndicator: "integrity-pending",
      },
    },
  };
  const html = buildInformedConsentEvidenceHtml(payload);

  return {
    auditMetadata,
    legalEvidencePackage,
    verificationToken,
    payload,
    html,
  };
}