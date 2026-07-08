import { ConsentDocumentStatus, ConsentSignatureRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import type {
  PublicSigningDocumentPayload,
  PublicSigningWorkflowPayload,
} from "@/lib/server/public-signing-service";
import { collectArabicMojibakeDiagnostics, normalizeArabicForPatientFacingText } from "@/lib/server/arabic-mojibake-guard";
import {
  evaluateControlledAuthoritativePilot,
  recordControlledPilotObservation,
} from "@/lib/server/controlled-production-pilot-governance";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { getPublicSigningSessionCookieName } from "@/lib/server/public-signing-session";
import { executeUnifiedDisclosureShadowMode } from "@/lib/projection/unified-disclosure-shadow-mode";
import { logRuntimeEvent, logRuntimeIncident } from "@/lib/server/runtime-observability";
import {
  asRecord,
  getBoolean,
  getDecisionStatus,
  getEducationStatus,
  getLinkedEducationPackage,
  getNullableString,
  getString,
  loadPublicDocumentRecord,
  validatePublicSigningSession,
} from "@/lib/server/public-signing-decision-service";
import { getSigningTokenContext, type SigningTokenContext } from "@/lib/server/signing-token-context-service";

const prisma = () => getPrisma();

const SAFE_REFUSAL_LEGAL_TEXT_AR =
  "أقر بأنني أرفض التدخل الجراحي أو الإجراء المقترح بعد أن شرح لي الطبيب حالتي الصحية، والحاجة الطبية للإجراء، والمخاطر والمضاعفات المحتملة، والبدائل العلاجية، ومخاطر الرفض أو التأجيل. وأقر بأنه أتيحت لي الفرصة لطرح الأسئلة وتمت الإجابة عليها بصورة واضحة ومفهومة، وأتحمل النتائج الطبية المحتملة المترتبة على هذا الرفض.";
const SAFE_REFUSAL_LEGAL_TEXT_EN =
  "I acknowledge that I refuse the proposed surgical intervention or medical procedure after the physician explained my medical condition, the medical need for the procedure, potential risks and complications, available alternatives, and the risks of refusal or delay. I confirm that I had the opportunity to ask questions and that my questions were answered clearly and understandably, and I accept the potential medical consequences of this refusal.";
const SAFE_PDPL_TEXT_AR =
  "أوافق على استخدام ومعالجة معلوماتي الصحية الشخصية بالقدر اللازم لأغراض العلاج والتوثيق الطبي والالتزام بالأنظمة واللوائح الصحية المعمول بها، وفقًا لنظام حماية البيانات الشخصية والأنظمة ذات العلاقة في المملكة العربية السعودية.";
const SAFE_PDPL_TEXT_EN =
  "I consent to the use and processing of my personal health information as necessary for treatment, medical documentation, healthcare operations, and compliance with applicable Saudi healthcare laws and the Personal Data Protection Law.";
const NO_CONSENT_CONTENT_ERROR =
  "No approved consent form is linked to this procedure. Please link an approved consent form before sending.";

function containsPatientFacingMojibake(value: string | null | undefined): boolean {
  return typeof value === "string" && /[ØÙÛÃÂâ]|\?{4,}/.test(value);
}

function normalizeArabicText(value: string | null | undefined): string {
  return normalizeArabicForPatientFacingText(getString(value));
}

function normalizeNullableArabicText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return normalizeArabicText(value);
}

function safeArabicPatientText(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeArabicText(value);
  if (!normalized || containsPatientFacingMojibake(normalized)) {
    return fallback;
  }
  return normalized;
}

function normalizeSignerRole(value: string): ConsentSignatureRole {
  const normalized = value.trim().toUpperCase();
  if (normalized === ConsentSignatureRole.GUARDIAN) return ConsentSignatureRole.GUARDIAN;
  return ConsentSignatureRole.PATIENT;
}

function hasAccessibleApprovedPdfSource(sourcePath: string | null | undefined): boolean {
  const normalized = typeof sourcePath === "string" && sourcePath.trim() ? sourcePath.trim() : null;
  if (!normalized) return false;
  if (/^https?:\/\//i.test(normalized)) return true;
  if (!normalized.startsWith("/")) return false;

  const sanitized = normalized.replace(/\\/g, "/");
  if (sanitized.includes("..")) return false;

  const relativePath = sanitized.replace(/^\/+/, "");
  let decodedPath = relativePath;
  try {
    decodedPath = decodeURIComponent(relativePath);
  } catch {
    decodedPath = relativePath;
  }

  return decodedPath.startsWith("imc-consent-library/");
}

function getApprovedConsentAuthority(doc: {
  metadata: unknown;
  template: { titleAr: string | null; titleEn: string | null };
  templateVersion: { versionLabel: string };
  sections: Array<unknown>;
}) {
  const metadata = asRecord(doc.metadata) || {};
  const approvedPdfUrl = getNullableString(metadata.pdfTemplateUrl) || getNullableString(metadata.sourcePath);
  const titleAr = getNullableString(metadata.approvedConsentFormTitleAr) || doc.template.titleAr || "";
  const titleEn = getNullableString(metadata.approvedConsentFormTitleEn) || doc.template.titleEn || "";
  const versionLabel = getNullableString(metadata.approvedConsentFormVersion) || doc.templateVersion.versionLabel;
  const approvedContentAvailable = hasAccessibleApprovedPdfSource(approvedPdfUrl) || doc.sections.length > 0;

  return {
    approvedPdfUrl,
    approvedContentAvailable,
    titleAr,
    titleEn,
    versionLabel,
  };
}

async function loadApprovedIllustrationService() {
  return import("@/lib/server/clinical-knowledge/services/illustration-service");
}

function collectPatientFacingArabicDiagnostics(payload: PublicSigningDocumentPayload) {
  const entries: Array<{ fieldPath: string; value: string | null | undefined }> = [
    { fieldPath: "templateTitleAr", value: payload.templateTitleAr },
    { fieldPath: "legalTextAr", value: payload.legalTextAr },
    { fieldPath: "pdplTextAr", value: payload.pdplTextAr },
  ];

  for (const [index, section] of payload.sections.entries()) {
    entries.push({ fieldPath: `sections[${index}].titleAr`, value: section.titleAr });
    entries.push({ fieldPath: `sections[${index}].contentAr`, value: section.contentAr });
  }

  if (payload.decision.refusalForm) {
    entries.push({ fieldPath: "decision.refusalForm.statementAr", value: payload.decision.refusalForm.statementAr });
    entries.push({ fieldPath: "decision.refusalForm.acknowledgementAr", value: payload.decision.refusalForm.acknowledgementAr });
  }

  if (payload.education.titleAr) {
    entries.push({ fieldPath: "education.titleAr", value: payload.education.titleAr });
  }
  if (payload.education.summary?.ar) {
    entries.push({ fieldPath: "education.summary.ar", value: payload.education.summary.ar });
  }

  for (const [index, item] of payload.education.risks.entries()) {
    entries.push({ fieldPath: `education.risks[${index}].ar`, value: item.ar });
  }
  for (const [index, item] of payload.education.benefits.entries()) {
    entries.push({ fieldPath: `education.benefits[${index}].ar`, value: item.ar });
  }
  for (const [index, item] of payload.education.faq.entries()) {
    entries.push({ fieldPath: `education.faq[${index}].questionAr`, value: item.questionAr });
    entries.push({ fieldPath: `education.faq[${index}].answerAr`, value: item.answerAr });
  }
  for (const [index, item] of payload.education.preProcedureInstructions.entries()) {
    entries.push({ fieldPath: `education.preProcedureInstructions[${index}].ar`, value: item.ar });
  }
  for (const [index, item] of payload.education.postProcedureInstructions.entries()) {
    entries.push({ fieldPath: `education.postProcedureInstructions[${index}].ar`, value: item.ar });
  }

  return collectArabicMojibakeDiagnostics(entries);
}

async function buildPreOtpBootstrapPayload(
  token: string,
): Promise<PublicSigningWorkflowPayload> {
  const context = await getSigningTokenContext(token);

  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId: context.tenantId, id: context.documentId },
    select: {
      id: true,
      status: true,
      metadata: true,
      templateId: true,
      templateVersionId: true,
      tenant: { select: { name: true } },
      template: { select: { titleAr: true, titleEn: true } },
      templateVersion: { select: { versionLabel: true } },
      sections: { select: { id: true } },
    },
  });

  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  if (doc.status === ConsentDocumentStatus.SIGNED || doc.status === ConsentDocumentStatus.FINALIZED) {
    throw new ApiError(404, "Invalid or expired signing token");
  }

  const authority = getApprovedConsentAuthority(doc);
  if (!authority.approvedContentAvailable) {
    throw new ApiError(409, NO_CONSENT_CONTENT_ERROR);
  }

  const linkedEducationPackage = await getLinkedEducationPackage(
    context.tenantId,
    doc.templateId,
    doc.templateVersionId,
  );

  return {
    phase: "pre-otp",
    bootstrap: {
      documentId: context.documentId,
      moduleType: context.moduleType,
      signerRole: context.signerRole,
      facilityName: doc.tenant?.name ?? "",
      templateTitleAr: authority.titleAr,
      templateTitleEn: authority.titleEn,
      approvedPdfUrl: authority.approvedPdfUrl,
      approvedContentAvailable: authority.approvedContentAvailable,
      locale: "ar",
      educationRequired: Boolean(linkedEducationPackage),
      maskedMobile: null,
      otpRequiredAt: new Date().toISOString(),
    },
  };
}

async function buildPublicSigningDocumentPayload(
  context: SigningTokenContext,
): Promise<PublicSigningDocumentPayload> {
  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  const authority = getApprovedConsentAuthority(doc);
  if (!authority.approvedContentAvailable) {
    throw new ApiError(409, NO_CONSENT_CONTENT_ERROR);
  }
  const linkedEducationPackage = await getLinkedEducationPackage(
    context.tenantId,
    doc.templateId,
    doc.templateVersionId,
  );
  const education = await getEducationStatus(context.tenantId, context.documentId, linkedEducationPackage, context.sessionId);
  const decision = await getDecisionStatus(context.tenantId, doc, education);
  const { getApprovedIllustrationsForDocument } = await loadApprovedIllustrationService();
  const illustrations = await getApprovedIllustrationsForDocument(context.tenantId, doc.plannedProcedure);
  const metadata = asRecord(doc.metadata) || {};
  const wordingSnapshot = asRecord(metadata.wordingSnapshot) || {};
  const fixedClauses = asRecord(wordingSnapshot.fixedClauses) || {};
  const isRefusalDocument =
    decision.status === "CONSENT_REFUSED"
    || /refusal/i.test(authority.titleEn || "")
    || String(authority.titleAr || "").includes("رفض");

  const legalTextAr = isRefusalDocument
    ? SAFE_REFUSAL_LEGAL_TEXT_AR
    : safeArabicPatientText(fixedClauses.legalTextAr as string | null | undefined, SAFE_REFUSAL_LEGAL_TEXT_AR);
  const legalTextEn = isRefusalDocument
    ? SAFE_REFUSAL_LEGAL_TEXT_EN
    : getString(fixedClauses.legalTextEn);
  const pdplTextAr = safeArabicPatientText(fixedClauses.pdplTextAr as string | null | undefined, SAFE_PDPL_TEXT_AR);
  const pdplTextEn = getString(fixedClauses.pdplTextEn) || SAFE_PDPL_TEXT_EN;
  const signatureCaptured = decision.status === "CONSENT_REFUSED"
    ? decision.refusalSignatureCaptured
    : doc.signatures.some((signature) => signature.role === normalizeSignerRole(context.signerRole));

  const sections = doc.sections.map((section) => ({
    id: section.id,
    sectionKey: section.sectionKey,
    sectionKind: section.sectionKind,
    titleAr: normalizeArabicText(section.titleAr),
    titleEn: section.titleEn,
    contentAr: normalizeArabicText(section.contentAr),
    contentEn: section.contentEn,
  }));

  const normalizedEducation = {
    ...education,
    titleAr: normalizeNullableArabicText(education.titleAr),
    summary: education.summary
      ? {
          ar: normalizeArabicText(education.summary.ar),
          en: education.summary.en,
        }
      : null,
    risks: education.risks.map((item) => ({ ar: normalizeArabicText(item.ar), en: item.en })),
    benefits: education.benefits.map((item) => ({ ar: normalizeArabicText(item.ar), en: item.en })),
    faq: education.faq.map((item) => ({
      questionAr: normalizeArabicText(item.questionAr),
      answerAr: normalizeArabicText(item.answerAr),
      questionEn: item.questionEn,
      answerEn: item.answerEn,
    })),
    preProcedureInstructions: education.preProcedureInstructions.map((item) => ({ ar: normalizeArabicText(item.ar), en: item.en })),
    postProcedureInstructions: education.postProcedureInstructions.map((item) => ({ ar: normalizeArabicText(item.ar), en: item.en })),
  };

  const normalizedDecision: PublicSigningDocumentPayload["decision"] = {
    ...decision,
    refusalForm: decision.refusalForm
      ? {
          ...decision.refusalForm,
          patientName: decision.refusalForm.patientName || "",
          statementAr: normalizeArabicText(decision.refusalForm.statementAr),
          acknowledgementAr: normalizeArabicText(decision.refusalForm.acknowledgementAr),
        }
      : null,
  };

  const payload: PublicSigningDocumentPayload = {
    documentId: doc.id,
    consentReference: doc.consentReference,
    status: doc.status,
    signerRole: context.signerRole,
    patientName: doc.patientName,
    physicianName: doc.physicianName,
    diagnosis: doc.diagnosis || "",
    plannedProcedure: doc.plannedProcedure || "",
    templateTitleAr: normalizeArabicText(authority.titleAr),
    templateTitleEn: authority.titleEn,
    approvedPdfUrl: authority.approvedPdfUrl,
    approvedContentAvailable: authority.approvedContentAvailable,
    versionLabel: authority.versionLabel,
    sections,
    legalTextAr,
    legalTextEn,
    pdplTextAr,
    pdplTextEn,
    signatureCaptured,
    decision: normalizedDecision,
    education: normalizedEducation,
    illustrations,
  };

  const arabicDiagnostics = collectPatientFacingArabicDiagnostics(payload);
  if (arabicDiagnostics.length > 0) {
    logRuntimeIncident({
      module: "public_signing",
      type: "PDF_FAILURE",
      operation: "build_public_signing_document_payload",
      tenantId: context.tenantId,
      details: {
        documentId: payload.documentId,
        consentReference: payload.consentReference,
        reason: "arabic_mojibake_diagnostics_detected",
        diagnosticCount: arabicDiagnostics.length,
        diagnostics: arabicDiagnostics,
      },
    });
    logRuntimeEvent({
      module: "public_signing",
      event: "arabic_mojibake_diagnostics_detected",
      severity: "warn",
      tenantId: context.tenantId,
      details: {
        documentId: payload.documentId,
        reason: "allowing_controlled_pilot_rendering",
        diagnosticCount: arabicDiagnostics.length,
      },
    });
  }

  const shadowResult = executeUnifiedDisclosureShadowMode({
    flow: "patient_signing",
    tenantId: context.tenantId,
    consentDocumentId: context.documentId,
    document: doc as unknown as Record<string, unknown>,
    legacyPayload: payload,
  });

  const pilotGovernance = evaluateControlledAuthoritativePilot({
    flow: "patient_runtime",
    tenantId: context.tenantId,
    physicianId: doc.physicianLicense || doc.physicianName,
    specialty: doc.template.specialty || doc.department,
    procedure: doc.plannedProcedure,
    pilotGroup: "GI",
  });
  recordControlledPilotObservation({
    governance: pilotGovernance,
    module: "public-signing",
    event: "authoritative_patient_runtime_projection_validated",
    parity: {
      shadowStatus: shadowResult.status,
      mismatchSummary: shadowResult.mismatchSummary,
      dimensionSummary: shadowResult.dimensionSummary,
      projectionHashes: shadowResult.projectionHashes ?? undefined,
    },
    details: {
      consentDocumentId: doc.id,
      consentReference: doc.consentReference,
      decisionStatus: payload.decision.status,
      educationCompleted: payload.education.completed,
      educationAcknowledged: payload.education.patientAcknowledged,
    },
  });

  return payload;
}

export async function getPublicSigningDocument(args: {
  token: string;
  request: NextRequest;
}): Promise<PublicSigningWorkflowPayload> {
  const sessionCookie = args.request.cookies.get(getPublicSigningSessionCookieName())?.value;
  if (!sessionCookie) {
    return buildPreOtpBootstrapPayload(args.token);
  }
  const context = await validatePublicSigningSession(args);
  return buildPublicSigningDocumentPayload(context);
}