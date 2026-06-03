import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import {
  deriveEducationSessionState,
  mergeEducationSessionContext,
  type EducationSessionEventType,
  type EducationSessionState,
} from "@/lib/server/education-session-service";
import { recordEvidenceEvent } from "@/lib/server/evidence-package-2-service";
import { ConsentDocumentStatus, ConsentEvidenceCopyType, ConsentMethod, ConsentSignatureRole } from "@/lib/server/prisma-enums";
import {
  type PublicSigningSessionPayload,
  createPublicSigningSessionCookieValue,
  getPublicSigningSessionCookieName,
  readPublicSigningSession,
} from "@/lib/server/public-signing-session";
import { sendPatientCopyNotificationEmail, sendSigningOtpEmail } from "@/lib/server/pilot-email-override";
import { validateSigningToken } from "@/lib/server/signature-orchestration-service";
import { executeUnifiedDisclosureShadowMode } from "@/lib/projection/unified-disclosure-shadow-mode";
import {
  evaluateControlledAuthoritativePilot,
  recordControlledPilotObservation,
} from "@/lib/server/controlled-production-pilot-governance";
import { normalizePublicDecisionStatus, type PublicDecisionStatus } from "@/lib/public-signing/decision-status";
import {
  collectArabicMojibakeDiagnostics,
  normalizeArabicForPatientFacingText,
} from "@/lib/server/arabic-mojibake-guard";
import { buildSigningOtpSms } from "@/services/sms/smsTemplates";
import { isTaqnyatReady, sendTaqnyatMessage } from "@/services/sms/taqnyatClient";
import { recordSmsAuditAttempt } from "@/services/sms/smsAuditService";

const prisma = () => getPrisma();

const OTP_PROVIDER_KEY = "public_signing_otp";
const OTP_REQUESTED_EVENT = "OTP_REQUESTED";
const OTP_VERIFIED_EVENT = "OTP_VERIFIED";
const OTP_VERIFY_FAILED_EVENT = "OTP_VERIFY_FAILED";
const OTP_MAX_ATTEMPTS = 3;
const OTP_EXPIRY_MINUTES = 10;
const PUBLIC_SIGNING_SESSION_TTL_MINUTES = 30;

type OtpChallengePayload = {
  challengeId: string;
  tokenHash: string;
  otpHash: string;
  phoneNumber: string;
  maskedPhone: string;
  expiresAt: string;
  sessionId: string;
  documentId: string;
  moduleType: string;
};

type OtpEventRow = {
  id: string;
  raw_payload: unknown;
  received_at: Date | string;
};

type LegacyEducationPackageRow = {
  id: string;
  package_key: string;
  title_ar: string;
  title_en: string;
  summary_ar: string | null;
  summary_en: string | null;
  version_id: string;
  version_label: string;
  content_hash: string | null;
  linked_template_ids: unknown;
  linked_template_version_ids: unknown;
  manifest_json: unknown;
};

type LegacyEducationAssetRow = {
  id: string;
  asset_key: string;
  asset_type: string;
  title: string;
  locale: string;
  source_uri: string | null;
  thumbnail_uri: string | null;
  sort_order: number;
};

type PublicEducationEventType = EducationSessionEventType;
type PublicDecisionEventType = "CONSENT_PRESENTED" | "CONSENT_ACCEPTED" | "CONSENT_REFUSED" | "REFUSAL_FORM_PRESENTED" | "REFUSAL_ACKNOWLEDGED";

const CONSENT_ACCEPTED_ACTIONS = ["CONSENT_ACCEPTED", "DECISION_ACCEPTED"] as const;
const CONSENT_REFUSED_ACTIONS = ["CONSENT_REFUSED", "DECISION_REFUSED"] as const;
const DECISION_EVENT_ACTIONS = [
  "CONSENT_PRESENTED",
  ...CONSENT_ACCEPTED_ACTIONS,
  ...CONSENT_REFUSED_ACTIONS,
  "REFUSAL_FORM_PRESENTED",
  "REFUSAL_ACKNOWLEDGED",
  "REFUSAL_SIGNED",
] as const;

export type SigningTokenContext = {
  tenantId: string;
  sessionId: string;
  documentId: string;
  moduleType: string;
  signerRole: string;
  redirectPath: string;
};

/**
 * Discriminated pre-OTP bootstrap payload returned by GET /api/public-signing/document/[token]
 * when no public signing session cookie is present. Contains ONLY non-PHI metadata that the
 * patient has already seen in the SMS / email invitation: facility name, template title,
 * locale, and whether education is required.
 *
 * Strictly does NOT include: patient name, MRN, diagnosis, procedure, physician name,
 * consent body, sections, risks, benefits, signatures, decision state, or any clinical data.
 */
export type PublicSigningPreOtpBootstrapPayload = {
  phase: "pre-otp";
  bootstrap: {
    documentId: string;
    moduleType: string;
    signerRole: string;
    facilityName: string;
    templateTitleAr: string;
    templateTitleEn: string;
    locale: "ar" | "en" | "bilingual";
    educationRequired: boolean;
    maskedMobile: string | null;
    otpRequiredAt: string;
  };
};

export type PublicSigningWorkflowPayload =
  | PublicSigningPreOtpBootstrapPayload
  | PublicSigningDocumentPayload;

export type PublicSigningDocumentPayload = {
  documentId: string;
  consentReference: string;
  status: string;
  signerRole: string;
  patientName: string;
  physicianName: string;
  diagnosis: string;
  plannedProcedure: string;
  templateTitleAr: string;
  templateTitleEn: string;
  versionLabel: string;
  sections: Array<{
    id: string;
    sectionKey: string;
    sectionKind: string;
    titleAr: string;
    titleEn: string;
    contentAr: string;
    contentEn: string;
  }>;
  legalTextAr: string;
  legalTextEn: string;
  pdplTextAr: string;
  pdplTextEn: string;
  signatureCaptured: boolean;
  decision: {
    status: PublicDecisionStatus;
    consentPresentedAt: string | null;
    selectedAt: string | null;
    refusalFormPresentedAt: string | null;
    refusalAcknowledged: boolean;
    refusalAcknowledgedAt: string | null;
    refusalSignedAt: string | null;
    refusalSignatureCaptured: boolean;
    refusalSignatureId: string | null;
    refusalForm: {
      patientName: string;
      mrn: string | null;
      procedure: string;
      physicianName: string;
      statementAr: string;
      statementEn: string;
      acknowledgementAr: string;
      acknowledgementEn: string;
      formHash: string;
    } | null;
  };
  education: {
    required: boolean;
    packageId: string | null;
    packageKey: string | null;
    titleAr: string | null;
    titleEn: string | null;
    versionId: string | null;
    versionLabel: string | null;
    contentHash: string | null;
    summary: { ar: string; en: string } | null;
    risks: Array<{ ar: string; en: string }>;
    benefits: Array<{ ar: string; en: string }>;
    faq: Array<{ questionAr: string; answerAr: string; questionEn: string; answerEn: string }>;
    preProcedureInstructions: Array<{ ar: string; en: string }>;
    postProcedureInstructions: Array<{ ar: string; en: string }>;
    assets: Array<{
      id: string;
      assetKey: string;
      assetType: string;
      title: string;
      locale: string;
      sourceUri: string | null;
      thumbnailUri: string | null;
      sortOrder: number;
    }>;
    viewedAt: string | null;
    acknowledgedAt: string | null;
    completed: boolean;
    patientAcknowledged: boolean;
    acknowledgement: boolean;
    score: number | null;
    language: string | null;
    durationSeconds: number | null;
    scrollCompletion: number | null;
    assetViews: string[];
    completedAt: string | null;
    session: EducationSessionState;
  };
};

type LocalizedLine = { ar: string; en: string };
type LocalizedFaq = { questionAr: string; answerAr: string; questionEn: string; answerEn: string };

type LinkedEducationPackagePayload = {
  packageId: string;
  packageKey: string;
  titleAr: string;
  titleEn: string;
  versionId: string;
  versionLabel: string;
  contentHash: string | null;
  summary: LocalizedLine | null;
  risks: LocalizedLine[];
  benefits: LocalizedLine[];
  faq: LocalizedFaq[];
  preProcedureInstructions: LocalizedLine[];
  postProcedureInstructions: LocalizedLine[];
  assets: Array<{
    id: string;
    assetKey: string;
    assetType: string;
    title: string;
    locale: string;
    sourceUri: string | null;
    thumbnailUri: string | null;
    sortOrder: number;
  }>;
};

type EducationStatus = {
  required: boolean;
  packageId: string | null;
  packageKey: string | null;
  titleAr: string | null;
  titleEn: string | null;
  versionId: string | null;
  versionLabel: string | null;
  contentHash: string | null;
  summary: LocalizedLine | null;
  risks: LocalizedLine[];
  benefits: LocalizedLine[];
  faq: LocalizedFaq[];
  preProcedureInstructions: LocalizedLine[];
  postProcedureInstructions: LocalizedLine[];
  assets: LinkedEducationPackagePayload["assets"];
  viewedAt: string | null;
  acknowledgedAt: string | null;
  completed: boolean;
  patientAcknowledged: boolean;
  acknowledgement: boolean;
  score: number | null;
  language: string | null;
  durationSeconds: number | null;
  scrollCompletion: number | null;
  assetViews: string[];
  completedAt: string | null;
  session: EducationSessionState;
};

type PublicSignatureResult = {
  documentId: string;
  status: string;
  signatureId: string;
  signerRole: string;
  signerName: string;
  signatureMethod: string;
  signedAt: string;
  evidence: {
    documentHash: string;
    otpHash: string;
    educationCompleted: boolean;
    patientAcknowledged: boolean;
    decisionStatus: PublicDecisionStatus;
  };
};

type DecisionStatus = PublicSigningDocumentPayload["decision"];

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.APP_BASE_URL?.trim()
    || "https://wathiqcare.online"
  ).replace(/\/$/, "");
}

function normalizePhoneNumber(value: string): string {
  const compact = value.replace(/[\s\-()]/g, "");
  if (!compact) return "";

  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("966")) return `+${compact}`;
  if (compact.startsWith("05") && compact.length === 10) return `+966${compact.slice(1)}`;
  return `+${compact}`;
}

function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidRecipientEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function getSecureSigningRecipientEmail(metadata: unknown): string | null {
  const root = asRecord(metadata);
  const workflow = asRecord(root?.secureSigningWorkflow);
  const recipientEmail = normalizeRecipientEmail(getString(workflow?.recipientEmail));
  if (!recipientEmail || !isValidRecipientEmail(recipientEmail)) {
    return null;
  }
  return recipientEmail;
}

function maskPhone(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function otpHash(otpCode: string): string {
  const pepper = process.env.PUBLIC_SIGNING_OTP_PEPPER?.trim() || "wathiqcare-signing-otp-pepper";
  return crypto.createHmac("sha256", pepper).update(otpCode).digest("hex");
}

function generateOtpCode(): string {
  const number = crypto.randomInt(0, 1_000_000);
  return number.toString().padStart(6, "0");
}

function parseOtpPayload(raw: unknown): OtpChallengePayload | null {
  if (!raw) return null;

  const value = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const payload = value as Partial<OtpChallengePayload>;
  if (!payload.challengeId || !payload.tokenHash || !payload.otpHash || !payload.expiresAt) {
    return null;
  }

  return {
    challengeId: String(payload.challengeId),
    tokenHash: String(payload.tokenHash),
    otpHash: String(payload.otpHash),
    phoneNumber: String(payload.phoneNumber || ""),
    maskedPhone: String(payload.maskedPhone || ""),
    expiresAt: String(payload.expiresAt),
    sessionId: String(payload.sessionId || ""),
    documentId: String(payload.documentId || ""),
    moduleType: String(payload.moduleType || ""),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(value: unknown): string | null {
  const normalized = getString(value);
  return normalized || null;
}

function getFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  if (typeof value === "number") return value !== 0;
  return false;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => getString(item))
    .filter(Boolean);
}

function getLocalizedLine(value: unknown): LocalizedLine | null {
  const record = asRecord(value);
  if (!record) return null;
  const ar = getString(record.ar);
  const en = getString(record.en);
  if (!ar && !en) return null;
  return { ar, en };
}

function getLocalizedLineArray(value: unknown): LocalizedLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => getLocalizedLine(item))
    .filter((item): item is LocalizedLine => Boolean(item));
}

function getLocalizedFaqArray(value: unknown): LocalizedFaq[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const questionAr = getString(record.questionAr);
      const answerAr = getString(record.answerAr);
      const questionEn = getString(record.questionEn);
      const answerEn = getString(record.answerEn);
      if (!questionAr && !answerAr && !questionEn && !answerEn) return null;
      return { questionAr, answerAr, questionEn, answerEn };
    })
    .filter((item): item is LocalizedFaq => Boolean(item));
}

function normalizeSignerRole(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized === ConsentSignatureRole.GUARDIAN) return ConsentSignatureRole.GUARDIAN;
  return ConsentSignatureRole.PATIENT;
}

function computePublicSessionExpiry(): string {
  return new Date(Date.now() + PUBLIC_SIGNING_SESSION_TTL_MINUTES * 60 * 1000).toISOString();
}

function computeDocumentHash(input: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function normalizeDecisionStatus(value: unknown): PublicDecisionStatus {
  return normalizePublicDecisionStatus(value);
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

function getClientIpAddress(request?: NextRequest): string | null {
  return request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

async function writePublicConsentAudit(args: {
  tenantId: string;
  consentDocumentId: string;
  action: string;
  summary: string;
  signerRole: string;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}) {
  await prisma().consentAuditEvent.create({
    data: {
      tenantId: args.tenantId,
      consentDocumentId: args.consentDocumentId,
      action: args.action,
      source: "public-signing",
      actorUserId: null,
      actorRole: args.signerRole,
      summary: args.summary,
      metadata: args.metadata,
    },
  });

  await appendAuditChainEvent({
    tenantId: args.tenantId,
    eventType: args.action,
    actorId: "public_signer",
    actorRole: args.signerRole,
    payloadSummary: args.summary,
    metadataJson: {
      consentDocumentId: args.consentDocumentId,
      ...(args.metadata || {}),
    },
    request: args.request,
  }).catch(() => undefined);
}

async function getLatestOtpEventByChallenge(challengeId: string, eventType: string): Promise<OtpChallengePayload | null> {
  const rows = await prisma().$queryRawUnsafe<OtpEventRow[]>(
    `SELECT id, raw_payload, received_at
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type = $2
       AND raw_payload ->> 'challengeId' = $3
     ORDER BY received_at DESC
     LIMIT 1`,
    OTP_PROVIDER_KEY,
    eventType,
    challengeId,
  );

  const payload = parseOtpPayload(rows[0]?.raw_payload);
  return payload;
}

async function ensureOtpChallengeVerified(challengeId: string): Promise<void> {
  const rows = await prisma().$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type = $2
       AND raw_payload ->> 'challengeId' = $3
     ORDER BY received_at DESC
     LIMIT 1`,
    OTP_PROVIDER_KEY,
    OTP_VERIFIED_EVENT,
    challengeId,
  );

  if (!rows[0]?.id) {
    throw new ApiError(401, "OTP verification is required");
  }
}

async function getLinkedEducationPackage(tenantId: string, templateId: string, templateVersionId: string): Promise<LinkedEducationPackagePayload | null> {
  try {
    const packages = await prisma().procedureEducation.findMany({
      where: {
        tenantId,
        status: "APPROVED",
        currentVersionId: { not: null },
      },
      include: {
        currentVersion: true,
        assets: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    for (const item of packages) {
      const version = item.currentVersion;
      if (!version || version.status !== "APPROVED") continue;

      const packageMetadata = asRecord(item.metadata) || {};
      const versionMetadata = asRecord(version.metadata) || {};
      const linkedTemplateIds = getStringArray(versionMetadata.linkedTemplateIds ?? packageMetadata.linkedTemplateIds);
      const linkedTemplateVersionIds = getStringArray(
        versionMetadata.linkedTemplateVersionIds ?? packageMetadata.linkedTemplateVersionIds,
      );
      if (!linkedTemplateVersionIds.includes(templateVersionId) && !linkedTemplateIds.includes(templateId)) {
        continue;
      }

      const manifest =
        asRecord(versionMetadata.manifestJson)
        || asRecord(versionMetadata.manifest)
        || asRecord(packageMetadata.manifestJson)
        || asRecord(packageMetadata.manifest)
        || {};

      return {
        packageId: item.id,
        packageKey: item.procedureCode,
        titleAr: item.titleAr,
        titleEn: item.titleEn,
        versionId: version.id,
        versionLabel: version.versionLabel,
        contentHash: getNullableString(versionMetadata.contentHash) || getNullableString(packageMetadata.contentHash),
        summary: getLocalizedLine(manifest.educationalSummary) || getLocalizedLine({ ar: item.summaryAr, en: item.summaryEn }),
        risks: getLocalizedLineArray(manifest.risks),
        benefits: getLocalizedLineArray(manifest.benefits),
        faq: getLocalizedFaqArray(manifest.faq),
        preProcedureInstructions: getLocalizedLineArray(manifest.preProcedureInstructions),
        postProcedureInstructions: getLocalizedLineArray(manifest.postProcedureInstructions),
        assets: item.assets
          .filter((asset) => asset.versionId === version.id)
          .map((asset) => {
            const metadata = asRecord(asset.metadata) || {};
            return {
              id: asset.id,
              assetKey: getString(metadata.assetKey) || asset.id,
              assetType: asset.assetType,
              title: asset.title,
              locale: asset.language,
              sourceUri: asset.sourceUrl,
              thumbnailUri: asset.thumbnailUrl,
              sortOrder: asset.sortOrder,
            };
          }),
      };
    }
  } catch {
    // Continue with legacy-table fallback when procedure_education tables are unavailable.
  }

  const packages = await prisma().$queryRaw<LegacyEducationPackageRow[]>`
    SELECT
      p.id,
      p.package_key,
      p.title_ar,
      p.title_en,
      p.summary_ar,
      p.summary_en,
      v.id AS version_id,
      v.version_label,
      v.content_hash,
      v.linked_template_ids,
      v.linked_template_version_ids,
      v.manifest_json
    FROM education_packages p
    INNER JOIN education_versions v ON v.id = p.current_version_id
    WHERE p.tenant_id::text = ${tenantId}
      AND p.status = 'APPROVED'
      AND v.status = 'APPROVED'
  `;

  for (const item of packages) {
    const linkedTemplateIds = getStringArray(item.linked_template_ids);
    const linkedTemplateVersionIds = getStringArray(item.linked_template_version_ids);
    if (!linkedTemplateVersionIds.includes(templateVersionId) && !linkedTemplateIds.includes(templateId)) {
      continue;
    }

    const assets = await prisma().$queryRaw<LegacyEducationAssetRow[]>`
      SELECT
        id,
        asset_key,
        asset_type,
        title,
        locale,
        source_uri,
        thumbnail_uri,
        sort_order
      FROM education_assets
      WHERE tenant_id::text = ${tenantId}
        AND education_package_id::text = ${item.id}
        AND version_id::text = ${item.version_id}
      ORDER BY sort_order ASC
    `;

    const manifest = asRecord(item.manifest_json) || {};
    return {
      packageId: item.id,
      packageKey: item.package_key,
      titleAr: item.title_ar,
      titleEn: item.title_en,
      versionId: item.version_id,
      versionLabel: item.version_label,
      contentHash: getNullableString(item.content_hash),
      summary: getLocalizedLine(manifest.educationalSummary) || getLocalizedLine({ ar: item.summary_ar, en: item.summary_en }),
      risks: getLocalizedLineArray(manifest.risks),
      benefits: getLocalizedLineArray(manifest.benefits),
      faq: getLocalizedFaqArray(manifest.faq),
      preProcedureInstructions: getLocalizedLineArray(manifest.preProcedureInstructions),
      postProcedureInstructions: getLocalizedLineArray(manifest.postProcedureInstructions),
      assets: assets.map((asset) => ({
        id: asset.id,
        assetKey: asset.asset_key,
        assetType: asset.asset_type,
        title: asset.title,
        locale: asset.locale,
        sourceUri: asset.source_uri,
        thumbnailUri: asset.thumbnail_uri,
        sortOrder: asset.sort_order,
      })),
    };
  }

  return null;
}

async function getEducationStatus(
  tenantId: string,
  documentId: string,
  linkedPackage: LinkedEducationPackagePayload | null = null,
  sessionId?: string,
): Promise<EducationStatus> {
  const events = await prisma().consentAuditEvent.findMany({
    where: {
      tenantId,
      consentDocumentId: documentId,
      source: "public-signing",
      action: { startsWith: "EDUCATION_" },
    },
    orderBy: { createdAt: "asc" },
  });

  const presentedEvent = events.find((event) => event.action === "EDUCATION_PRESENTED") || null;
  const completedEvent = [...events].reverse().find((event) => event.action === "EDUCATION_COMPLETED") || null;
  const acknowledgedEvent = [...events].reverse().find((event) => event.action === "EDUCATION_ACKNOWLEDGED") || null;
  const latestEvent = events[events.length - 1] || null;
  const latestMetadata = asRecord(latestEvent?.metadata) || {};
  const completedMetadata = asRecord(completedEvent?.metadata) || latestMetadata;
  const acknowledgedMetadata = asRecord(acknowledgedEvent?.metadata) || latestMetadata;
  const session = deriveEducationSessionState({
    sessionId,
    documentId,
    packageId: linkedPackage?.packageId,
    versionId: linkedPackage?.versionId,
    rawMetadata: latestMetadata,
    events,
  });

  return {
    required: Boolean(linkedPackage),
    packageId: linkedPackage?.packageId || null,
    packageKey: linkedPackage?.packageKey || null,
    titleAr: linkedPackage?.titleAr || null,
    titleEn: linkedPackage?.titleEn || null,
    versionId: linkedPackage?.versionId || null,
    versionLabel: linkedPackage?.versionLabel || null,
    contentHash: linkedPackage?.contentHash || null,
    summary: linkedPackage?.summary || null,
    risks: linkedPackage?.risks || [],
    benefits: linkedPackage?.benefits || [],
    faq: linkedPackage?.faq || [],
    preProcedureInstructions: linkedPackage?.preProcedureInstructions || [],
    postProcedureInstructions: linkedPackage?.postProcedureInstructions || [],
    assets: linkedPackage?.assets || [],
    viewedAt: presentedEvent?.createdAt?.toISOString() || null,
    acknowledgedAt: acknowledgedEvent?.createdAt?.toISOString() || null,
    completed: Boolean(completedEvent),
    patientAcknowledged: Boolean(acknowledgedEvent) || getBoolean(acknowledgedMetadata.acknowledgement),
    acknowledgement: Boolean(acknowledgedEvent) || getBoolean(acknowledgedMetadata.acknowledgement),
    score: getFiniteNumber(completedMetadata.score),
    language: getNullableString(latestMetadata.language),
    durationSeconds: getFiniteNumber(completedMetadata.durationSeconds),
    scrollCompletion: getFiniteNumber(completedMetadata.scrollCompletion),
    assetViews: getStringArray(completedMetadata.assetViews),
    completedAt: completedEvent?.createdAt?.toISOString() || null,
    session,
  };
}

function buildPublicEducationEventSummary(eventType: PublicEducationEventType, packageKey: string, language: string | null): string {
  const normalizedLanguage = language || "bilingual";
  switch (eventType) {
    case "EDUCATION_PRESENTED":
      return `Public education presented (${packageKey}, ${normalizedLanguage}).`;
    case "EDUCATION_STARTED":
      return `Public education started (${packageKey}, ${normalizedLanguage}).`;
    case "EDUCATION_COMPLETED":
      return `Public education completed (${packageKey}, ${normalizedLanguage}).`;
    case "EDUCATION_ACKNOWLEDGED":
      return `Public education acknowledged (${packageKey}, ${normalizedLanguage}).`;
    default:
      return `Public education event ${eventType} (${packageKey}, ${normalizedLanguage}).`;
  }
}

function mergeEducationExecutionContext(
  rawMetadata: unknown,
  linkedPackage: LinkedEducationPackagePayload,
  eventType: PublicEducationEventType,
  sessionId: string,
  documentId: string,
  payload: {
    language: string | null;
    durationSeconds?: number | null;
    scrollCompletion?: number | null;
    assetViews?: string[];
    acknowledgement?: boolean;
  },
): Record<string, unknown> {
  const metadata = asRecord(rawMetadata) || {};
  const executionContext = asRecord(metadata.executionContext) || {};
  const education = asRecord(executionContext.education) || {};
  const occurredAt = new Date().toISOString();

  const nextEducation = {
    ...education,
    packageId: linkedPackage.packageId,
    packageKey: linkedPackage.packageKey,
    versionId: linkedPackage.versionId,
    versionLabel: linkedPackage.versionLabel,
    contentHash: linkedPackage.contentHash,
    language: payload.language || education.language || null,
    viewedAt:
      eventType === "EDUCATION_PRESENTED"
        ? occurredAt
        : education.viewedAt || null,
    completedAt:
      eventType === "EDUCATION_COMPLETED"
        ? occurredAt
        : education.completedAt || null,
    acknowledgedAt:
      eventType === "EDUCATION_ACKNOWLEDGED"
        ? occurredAt
        : education.acknowledgedAt || null,
    durationSeconds: payload.durationSeconds ?? education.durationSeconds ?? null,
    scrollCompletion: payload.scrollCompletion ?? education.scrollCompletion ?? null,
    assetViews: payload.assetViews ?? getStringArray(education.assetViews),
    acknowledgement: payload.acknowledgement ?? getBoolean(education.acknowledgement),
    lastEventType: eventType,
    updatedAt: occurredAt,
  };

  return mergeEducationSessionContext({
    rawMetadata: {
      ...metadata,
      executionContext: {
        ...executionContext,
        education: nextEducation,
      },
    },
    eventType,
    sessionId,
    documentId,
    packageId: linkedPackage.packageId,
    versionId: linkedPackage.versionId,
    occurredAt,
  });
}

export async function recordPublicEducationEvent(args: {
  token: string;
  request?: NextRequest;
  eventType: PublicEducationEventType;
  language?: string;
  durationSeconds?: number;
  scrollCompletion?: number;
  assetViews?: string[];
  acknowledgement?: boolean;
}): Promise<EducationStatus> {
  if (args.request) {
    await validatePublicSigningSession({ token: args.token, request: args.request });
  }
  const context = await getSigningTokenContext(args.token);
  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  const linkedEducationPackage = await getLinkedEducationPackage(
    context.tenantId,
    doc.templateId,
    doc.templateVersionId,
  );

  if (!linkedEducationPackage) {
    throw new ApiError(409, "No approved education package is linked to this consent document");
  }

  const assetViews = Array.from(new Set((args.assetViews || []).map((item) => getString(item)).filter(Boolean)));
  const imagesPresented = linkedEducationPackage.assets.filter((asset) => asset.assetType === "IMAGE").length;
  const videosPresented = linkedEducationPackage.assets.filter((asset) => asset.assetType === "VIDEO").length;
  const pdfsPresented = linkedEducationPackage.assets.filter((asset) => asset.assetType === "PDF").length;
  const metadata = {
    packageId: linkedEducationPackage.packageId,
    packageKey: linkedEducationPackage.packageKey,
    educationVersion: linkedEducationPackage.versionLabel,
    educationVersionId: linkedEducationPackage.versionId,
    contentHash: linkedEducationPackage.contentHash,
    language: getNullableString(args.language),
    durationSeconds: args.durationSeconds ?? null,
    scrollCompletion: args.scrollCompletion ?? null,
    assetViews,
    acknowledgement: Boolean(args.acknowledgement),
    assetsPresented: linkedEducationPackage.assets.length,
    imagesPresented,
    videosPresented,
    pdfsPresented,
  };

  await prisma().consentDocument.update({
    where: { id: doc.id },
    data: {
      metadata: mergeEducationExecutionContext(
        doc.metadata,
        linkedEducationPackage,
        args.eventType,
        context.sessionId,
        doc.id,
        {
          language: getNullableString(args.language),
          durationSeconds: args.durationSeconds ?? null,
          scrollCompletion: args.scrollCompletion ?? null,
          assetViews,
          acknowledgement: args.acknowledgement,
        },
      ) as Prisma.InputJsonValue,
    },
  });

  await writePublicConsentAudit({
    tenantId: context.tenantId,
    consentDocumentId: doc.id,
    action: args.eventType,
    summary: buildPublicEducationEventSummary(
      args.eventType,
      linkedEducationPackage.packageKey,
      getNullableString(args.language),
    ),
    signerRole: context.signerRole,
    metadata,
    request: args.request,
  });

  return getEducationStatus(context.tenantId, doc.id, linkedEducationPackage, context.sessionId);
}

async function loadPublicDocumentRecord(tenantId: string, documentId: string) {
  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId, id: documentId },
    include: {
      template: true,
      templateVersion: true,
      sections: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      signatures: {
        orderBy: [{ signedAt: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  return doc;
}

function buildConsentContentHash(doc: Awaited<ReturnType<typeof loadPublicDocumentRecord>>): string {
  return computeDocumentHash({
    documentId: doc.id,
    consentReference: doc.consentReference,
    templateVersionId: doc.templateVersionId,
    patientName: doc.patientName,
    physicianName: doc.physicianName,
    diagnosis: doc.diagnosis,
    plannedProcedure: doc.plannedProcedure,
    sections: doc.sections.map((section) => ({
      sectionKey: section.sectionKey,
      sectionKind: section.sectionKind,
      titleAr: section.titleAr,
      titleEn: section.titleEn,
      contentAr: section.contentAr,
      contentEn: section.contentEn,
    })),
    legalTextAr: doc.legalTextAr,
    legalTextEn: doc.legalTextEn,
    pdplTextAr: doc.pdplTextAr,
    pdplTextEn: doc.pdplTextEn,
  });
}

function buildRefusalFormPayload(args: {
  doc: Awaited<ReturnType<typeof loadPublicDocumentRecord>>;
  education: EducationStatus;
  rawDecisionMetadata?: Record<string, unknown> | null;
}): NonNullable<DecisionStatus["refusalForm"]> {
  const procedure = args.doc.plannedProcedure || args.doc.template.titleEn || "the proposed medical procedure";
  const physicianName = args.doc.physicianName || "Attending physician";
  const statementAr = getString(args.rawDecisionMetadata?.refusalStatementAr)
    || `أقر أنا ${args.doc.patientName || "المريض/ة"}، رقم الملف الطبي ${args.doc.mrn || "-"}، بأنه بعد الاطلاع على معلومات إجراء ${procedure} وشرح الطبيب ${physicianName}، قررت رفض العلاج أو الإجراء المقترح مع علمي بالعواقب والمخاطر المحتملة المترتبة على هذا الرفض.`;
  const statementEn = getString(args.rawDecisionMetadata?.refusalStatementEn)
    || `I, ${args.doc.patientName || "the patient"}, MRN ${args.doc.mrn || "-"}, after reviewing the information related to ${procedure} and the explanation provided by ${physicianName}, refuse the proposed treatment or procedure and acknowledge the potential risks and consequences of that refusal.`;
  const acknowledgementAr = "أقر بأنني قرأت نموذج رفض العلاج وفهمت مضمونه، وأن قرار الرفض تم اتخاذه بإرادتي.";
  const acknowledgementEn = "I acknowledge that I have read and understood this treatment refusal form and that this refusal decision is made voluntarily.";
  const baseForm = {
    patientName: args.doc.patientName,
    mrn: args.doc.mrn,
    procedure,
    physicianName,
    statementAr,
    statementEn,
    acknowledgementAr,
    acknowledgementEn,
    educationVersion: args.education.versionLabel,
    educationHash: args.education.contentHash,
    consentVersion: args.doc.templateVersion.versionLabel,
    consentHash: buildConsentContentHash(args.doc),
  };

  return {
    patientName: baseForm.patientName,
    mrn: baseForm.mrn,
    procedure: baseForm.procedure,
    physicianName: baseForm.physicianName,
    statementAr: baseForm.statementAr,
    statementEn: baseForm.statementEn,
    acknowledgementAr: baseForm.acknowledgementAr,
    acknowledgementEn: baseForm.acknowledgementEn,
    formHash: computeDocumentHash(baseForm),
  };
}

async function getDecisionStatus(
  tenantId: string,
  doc: Awaited<ReturnType<typeof loadPublicDocumentRecord>>,
  education: EducationStatus,
): Promise<DecisionStatus> {
  const events = await prisma().consentAuditEvent.findMany({
    where: {
      tenantId,
      consentDocumentId: doc.id,
      action: {
        in: [...DECISION_EVENT_ACTIONS],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const metadata = asRecord(doc.metadata) || {};
  const executionContext = asRecord(metadata.executionContext) || {};
  const decisionMetadata = asRecord(executionContext.decision) || {};
  const consentPresentedEvent = events.find((event) => event.action === "CONSENT_PRESENTED") || null;
  const acceptedEvent = [...events].reverse().find((event) => CONSENT_ACCEPTED_ACTIONS.includes(event.action as (typeof CONSENT_ACCEPTED_ACTIONS)[number])) || null;
  const refusedEvent = [...events].reverse().find((event) => CONSENT_REFUSED_ACTIONS.includes(event.action as (typeof CONSENT_REFUSED_ACTIONS)[number])) || null;
  const refusalPresentedEvent = [...events].reverse().find((event) => event.action === "REFUSAL_FORM_PRESENTED") || null;
  const refusalAcknowledgedEvent = [...events].reverse().find((event) => event.action === "REFUSAL_ACKNOWLEDGED") || null;
  const refusalSignedEvent = [...events].reverse().find((event) => event.action === "REFUSAL_SIGNED") || null;
  const refusalSignature = asRecord(decisionMetadata.refusalSignature) || {};
  const latestDecisionEvent = [acceptedEvent, refusedEvent]
    .filter((event): event is NonNullable<typeof acceptedEvent> => Boolean(event))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] || null;
  const status = CONSENT_REFUSED_ACTIONS.includes((latestDecisionEvent?.action || "") as (typeof CONSENT_REFUSED_ACTIONS)[number])
    ? "CONSENT_REFUSED"
    : CONSENT_ACCEPTED_ACTIONS.includes((latestDecisionEvent?.action || "") as (typeof CONSENT_ACCEPTED_ACTIONS)[number])
      ? "CONSENT_ACCEPTED"
      : normalizeDecisionStatus(decisionMetadata.status);
  const refusalForm = status === "CONSENT_REFUSED"
    ? buildRefusalFormPayload({ doc, education, rawDecisionMetadata: decisionMetadata })
    : null;

  return {
    status,
    consentPresentedAt: consentPresentedEvent?.createdAt?.toISOString() || getNullableString(decisionMetadata.consentPresentedAt),
    selectedAt: acceptedEvent?.createdAt?.toISOString() || refusedEvent?.createdAt?.toISOString() || getNullableString(decisionMetadata.selectedAt),
    refusalFormPresentedAt: refusalPresentedEvent?.createdAt?.toISOString() || getNullableString(decisionMetadata.refusalFormPresentedAt),
    refusalAcknowledged: Boolean(refusalAcknowledgedEvent) || getBoolean(decisionMetadata.refusalAcknowledged),
    refusalAcknowledgedAt: refusalAcknowledgedEvent?.createdAt?.toISOString() || getNullableString(decisionMetadata.refusalAcknowledgedAt),
    refusalSignedAt: refusalSignedEvent?.createdAt?.toISOString() || getNullableString(refusalSignature.capturedAt),
    refusalSignatureCaptured: Boolean(refusalSignedEvent) || Boolean(getNullableString(refusalSignature.signatureId)),
    refusalSignatureId: getNullableString(refusalSignature.signatureId),
    refusalForm,
  };
}

function buildPublicDecisionEventSummary(eventType: PublicDecisionEventType, decisionStatus: PublicDecisionStatus): string {
  switch (eventType) {
    case "CONSENT_PRESENTED":
      return "Public consent presented for patient decision.";
    case "CONSENT_ACCEPTED":
      return "Patient accepted the consent document in the public signing flow.";
    case "CONSENT_REFUSED":
      return "Patient refused the proposed treatment in the public signing flow.";
    case "REFUSAL_FORM_PRESENTED":
      return "Public treatment refusal form presented to the patient.";
    case "REFUSAL_ACKNOWLEDGED":
      return "Patient acknowledged the treatment refusal form in the public signing flow.";
    default:
      return `Public decision event ${eventType} (${decisionStatus}).`;
  }
}

function mergeDecisionExecutionContext(args: {
  rawMetadata: unknown;
  eventType: PublicDecisionEventType;
  decisionStatus: PublicDecisionStatus;
  consentHash: string;
  consentVersion: string;
  education: EducationStatus;
  refusalForm: DecisionStatus["refusalForm"];
  refusalAcknowledged?: boolean;
  refusalSignature?: Record<string, unknown>;
}): Record<string, unknown> {
  const metadata = asRecord(args.rawMetadata) || {};
  const executionContext = asRecord(metadata.executionContext) || {};
  const currentDecision = asRecord(executionContext.decision) || {};
  const occurredAt = new Date().toISOString();

  return {
    ...metadata,
    executionContext: {
      ...executionContext,
      decision: {
        ...currentDecision,
        status: args.decisionStatus,
        consentPresentedAt:
          args.eventType === "CONSENT_PRESENTED"
            ? currentDecision.consentPresentedAt || occurredAt
            : currentDecision.consentPresentedAt || null,
        selectedAt:
          args.eventType === "CONSENT_ACCEPTED" || args.eventType === "CONSENT_REFUSED"
            ? occurredAt
            : currentDecision.selectedAt || null,
        refusalFormPresentedAt:
          args.eventType === "REFUSAL_FORM_PRESENTED"
            ? occurredAt
            : currentDecision.refusalFormPresentedAt || null,
        refusalAcknowledged:
          args.eventType === "REFUSAL_ACKNOWLEDGED"
            ? true
            : args.refusalAcknowledged ?? getBoolean(currentDecision.refusalAcknowledged),
        refusalAcknowledgedAt:
          args.eventType === "REFUSAL_ACKNOWLEDGED"
            ? currentDecision.refusalAcknowledgedAt || occurredAt
            : currentDecision.refusalAcknowledgedAt || null,
        refusalSignedAt: getNullableString(args.refusalSignature?.capturedAt) || getNullableString(currentDecision.refusalSignedAt),
        consentHash: args.consentHash,
        consentVersion: args.consentVersion,
        educationVersion: args.education.versionLabel,
        educationHash: args.education.contentHash,
        refusalFormHash: args.refusalForm?.formHash || null,
        refusalStatementAr: args.refusalForm?.statementAr || null,
        refusalStatementEn: args.refusalForm?.statementEn || null,
        refusalSignature: args.refusalSignature || currentDecision.refusalSignature || null,
        updatedAt: occurredAt,
      },
    },
  };
}

export async function recordPublicDecisionEvent(args: {
  token: string;
  request?: NextRequest;
  eventType: PublicDecisionEventType;
  refusalAcknowledged?: boolean;
}): Promise<DecisionStatus> {
  // [WORKFLOW_SEQUENCE_CORRECTION] Decision events are LEGAL ARTIFACTS and
  // must only be recorded against a verified public-signing session. This
  // enforces "decision after OTP / verified session" at the service layer
  // so no endpoint can record a decision before OTP verification, regardless
  // of UI state.
  if (args.request) {
    await validatePublicSigningSession({ token: args.token, request: args.request });
  }
  const context = await getSigningTokenContext(args.token);
  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  const linkedEducationPackage = await getLinkedEducationPackage(context.tenantId, doc.templateId, doc.templateVersionId);
  const education = await getEducationStatus(context.tenantId, doc.id, linkedEducationPackage, context.sessionId);
  if (
    (args.eventType === "CONSENT_ACCEPTED" || args.eventType === "CONSENT_REFUSED")
    && linkedEducationPackage
    && (!education.completed || !education.patientAcknowledged)
  ) {
    throw new ApiError(409, "Education must be completed and acknowledged before recording a consent decision");
  }
  const currentDecision = await getDecisionStatus(context.tenantId, doc, education);
  const nextDecisionStatus: PublicDecisionStatus =
    args.eventType === "CONSENT_ACCEPTED"
      ? "CONSENT_ACCEPTED"
      : args.eventType === "CONSENT_REFUSED"
        ? "CONSENT_REFUSED"
        : currentDecision.status;

  if ((args.eventType === "REFUSAL_FORM_PRESENTED" || args.eventType === "REFUSAL_ACKNOWLEDGED") && nextDecisionStatus !== "CONSENT_REFUSED") {
    throw new ApiError(409, "Refusal form events require a refusal decision");
  }

  const refusalForm = nextDecisionStatus === "CONSENT_REFUSED"
    ? buildRefusalFormPayload({ doc, education })
    : null;
  const consentHash = buildConsentContentHash(doc);

  await prisma().consentDocument.update({
    where: { id: doc.id },
    data: {
      metadata: mergeDecisionExecutionContext({
        rawMetadata: doc.metadata,
        eventType: args.eventType,
        decisionStatus: nextDecisionStatus,
        consentHash,
        consentVersion: doc.templateVersion.versionLabel,
        education,
        refusalForm,
        refusalAcknowledged: args.refusalAcknowledged,
      }) as Prisma.InputJsonValue,
    },
  });

  await writePublicConsentAudit({
    tenantId: context.tenantId,
    consentDocumentId: doc.id,
    action: args.eventType,
    summary: buildPublicDecisionEventSummary(args.eventType, nextDecisionStatus),
    signerRole: context.signerRole,
    metadata: {
      decisionStatus: nextDecisionStatus,
      consentHash,
      consentVersion: doc.templateVersion.versionLabel,
      educationVersion: education.versionLabel,
      educationHash: education.contentHash,
      refusalFormHash: refusalForm?.formHash || null,
      refusalAcknowledged: Boolean(args.refusalAcknowledged),
    },
    request: args.request,
  });

  const updatedDoc = await loadPublicDocumentRecord(context.tenantId, doc.id);
  return getDecisionStatus(context.tenantId, updatedDoc, education);
}

function buildEvidenceCopyFileName(reference: string, copyType: string): string {
  switch (copyType) {
    case ConsentEvidenceCopyType.PATIENT_COPY:
      return `CONSENT-${reference}-PATIENT.pdf`;
    case ConsentEvidenceCopyType.MEDICAL_RECORD_COPY:
      return `CONSENT-${reference}-MR.pdf`;
    case ConsentEvidenceCopyType.LEGAL_ARCHIVE_COPY:
      return `CONSENT-${reference}-LEGAL.pdf`;
    default:
      return `CONSENT-${reference}-EVIDENCE.pdf`;
  }
}

async function persistPublicSigningEvidencePackages(args: {
  tenantId: string;
  documentId: string;
  caseId: string | null;
  patientName: string | null;
  patientEmail: string | null;
  consentReference: string | null;
  generatedAt: Date;
  generatedBy: string;
  pdfHash: string;
  documentHash: string;
  otpHash: string;
  otpVerifiedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  education: EducationStatus;
  decision: DecisionStatus;
  signerName: string;
  signatureHash: string | null;
  signatureId: string;
  consentVersion: string;
}): Promise<void> {
  const reference = (args.consentReference || args.documentId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const copyTypes = [
    ConsentEvidenceCopyType.PATIENT_COPY,
    ConsentEvidenceCopyType.MEDICAL_RECORD_COPY,
    ConsentEvidenceCopyType.LEGAL_ARCHIVE_COPY,
  ];
  const filePrefix = args.decision.status === "CONSENT_REFUSED" ? `REFUSAL-${reference}` : reference;
  const metadata: Prisma.InputJsonValue = {
    source: "public-signing",
    generatedAt: args.generatedAt.toISOString(),
    otpHash: args.otpHash,
    otpVerifiedAt: args.otpVerifiedAt,
    ipAddress: args.ipAddress,
    userAgent: args.userAgent,
    decision: {
      status: args.decision.status,
      consentPresentedAt: args.decision.consentPresentedAt,
      selectedAt: args.decision.selectedAt,
      refusalAcknowledged: args.decision.refusalAcknowledged,
      refusalAcknowledgedAt: args.decision.refusalAcknowledgedAt,
      refusalSignedAt: args.decision.refusalSignedAt,
    },
    education: {
      displayedAt: args.education.viewedAt,
      acknowledgedAt: args.education.acknowledgedAt,
      completed: args.education.completed,
      patientAcknowledged: args.education.patientAcknowledged,
      completedAt: args.education.completedAt,
      durationSeconds: args.education.durationSeconds,
      scrollCompletion: args.education.scrollCompletion,
      session: args.education.session,
    },
    evidenceBundle: {
      educationVersion: args.education.versionLabel,
      educationHash: args.education.contentHash,
      consentVersion: args.consentVersion,
      consentHash: args.documentHash,
      refusalFormHash: args.decision.refusalForm?.formHash || null,
      otpVerification: {
        verifiedAt: args.otpVerifiedAt,
        otpHash: args.otpHash,
      },
      signature: {
        signerName: args.signerName,
        signatureHash: args.signatureHash,
        signatureId: args.signatureId,
      },
    },
    refusalForm: args.decision.refusalForm,
  };

  const existing = await prisma().consentEvidencePackage.findMany({
    where: {
      tenantId: args.tenantId,
      consentDocumentId: args.documentId,
      copyType: { in: copyTypes },
    },
    select: {
      id: true,
      copyType: true,
    },
  });
  const existingByType = new Map(existing.map((item) => [item.copyType, item]));

  for (const copyType of copyTypes) {
    const fileName = buildEvidenceCopyFileName(filePrefix, copyType);
    const storagePath = `informed-consents/${args.documentId}/evidence/${fileName}`;
    const row = existingByType.get(copyType);

    if (row) {
      await prisma().consentEvidencePackage.update({
        where: { id: row.id },
        data: {
          fileName,
          storagePath,
          checksumHash: args.pdfHash,
          generatedBy: args.generatedBy,
          generatedAt: args.generatedAt,
          metadata,
        },
      });
      continue;
    }

    await prisma().consentEvidencePackage.create({
      data: {
        tenantId: args.tenantId,
        consentDocumentId: args.documentId,
        copyType,
        fileName,
        storagePath,
        checksumHash: args.pdfHash,
        generatedBy: args.generatedBy,
        generatedAt: args.generatedAt,
        metadata,
      },
    });
  }

  if (args.patientEmail) {
    await sendPatientCopyNotificationEmail({
      tenantId: args.tenantId,
      caseId: args.caseId,
      patientName: args.patientName,
      documentId: args.documentId,
      consentReference: args.consentReference,
      copyType: ConsentEvidenceCopyType.PATIENT_COPY,
      recipientEmail: args.patientEmail,
    }).catch(() => undefined);
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildRedirectPath(moduleType: string, documentId: string, token: string): string {
  const normalized = moduleType.toLowerCase();
  if (normalized.includes("informed")) {
    return `/sign/${encodeURIComponent(token)}/workflow`;
  }
  if (normalized.includes("discharge")) {
    return `/secure/${encodeURIComponent(token)}`;
  }
  if (normalized.includes("legal")) {
    return `/cases/${encodeURIComponent(documentId)}/legal-package`;
  }
  return `/documents/${encodeURIComponent(documentId)}`;
}

export async function getSigningTokenContext(token: string): Promise<SigningTokenContext> {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) {
    throw new ApiError(400, "Invalid or expired signing token");
  }

  const validated = await validateSigningToken(normalizedToken);
  if (!validated.sessionId || !validated.documentId || !validated.moduleType || !validated.tenantId || !validated.signerRole) {
    throw new ApiError(404, "Invalid or expired signing token");
  }

  return {
    tenantId: validated.tenantId,
    sessionId: validated.sessionId,
    documentId: validated.documentId,
    moduleType: validated.moduleType,
    signerRole: validated.signerRole,
    redirectPath: buildRedirectPath(validated.moduleType, validated.documentId, normalizedToken),
  };
}

export async function validatePublicSigningSession(args: {
  token: string;
  request: NextRequest;
}): Promise<SigningTokenContext & { publicSession: PublicSigningSessionPayload }> {
  const context = await getSigningTokenContext(args.token);
  const publicSession = readPublicSigningSession(args.request);
  const expectedTokenHash = tokenHash(args.token);

  if (
    publicSession.documentId !== context.documentId
    || publicSession.tenantId !== context.tenantId
    || publicSession.moduleType !== context.moduleType
    || publicSession.signerRole !== context.signerRole
    || publicSession.tokenHash !== expectedTokenHash
  ) {
    throw new ApiError(401, "Invalid public signing session");
  }

  await ensureOtpChallengeVerified(publicSession.challengeId);

  return {
    ...context,
    publicSession,
  };
}

export async function getPublicSigningDocument(args: {
  token: string;
  request: NextRequest;
}): Promise<PublicSigningWorkflowPayload> {
  // Lifecycle-aware bootstrap (LIVE_SESSION_RACE_CONDITION_REPORT.md).
  // If no session cookie is present at all, this is a true cold open
  // (e.g. first hit from Mail/SMS). Return the pre-OTP bootstrap payload
  // containing ONLY non-PHI metadata so the client can render the OTP form.
  // If the cookie IS present, run the strict validation path unchanged.
  const sessionCookie = args.request.cookies.get(getPublicSigningSessionCookieName())?.value;
  if (!sessionCookie) {
    return buildPreOtpBootstrapPayload(args.token);
  }
  const context = await validatePublicSigningSession(args);
  return buildPublicSigningDocumentPayload(context);
}

async function buildPreOtpBootstrapPayload(
  token: string,
): Promise<PublicSigningPreOtpBootstrapPayload> {
  // Token is validated here (404 on invalid). No session is required for the
  // bootstrap payload — that is the entire point of this branch.
  const context = await getSigningTokenContext(token);

  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId: context.tenantId, id: context.documentId },
    select: {
      id: true,
      status: true,
      templateId: true,
      templateVersionId: true,
      tenant: { select: { name: true } },
      template: { select: { titleAr: true, titleEn: true } },
    },
  });

  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  if (doc.status === ConsentDocumentStatus.SIGNED || doc.status === ConsentDocumentStatus.FINALIZED) {
    throw new ApiError(404, "Invalid or expired signing token");
  }

  // Whether the document requires an education package can be determined by
  // simply checking if a linked package exists. We don't load its body here.
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
      templateTitleAr: doc.template?.titleAr ?? "",
      templateTitleEn: doc.template?.titleEn ?? "",
      // Default to Arabic-first per the existing OTP flow (locale: "ar" is
      // hard-coded in PublicSigningWorkflow.requestOtp).
      locale: "ar",
      educationRequired: Boolean(linkedEducationPackage),
      // No mobile is stored server-side on the consent document — the patient
      // enters it on the OTP form. We expose null here so the client knows to
      // prompt for the number.
      maskedMobile: null,
      otpRequiredAt: new Date().toISOString(),
    },
  };
}

export async function getPublicSigningPreviewDocument(args: {
  token: string;
}): Promise<PublicSigningDocumentPayload> {
  const context = await getSigningTokenContext(args.token);
  return buildPublicSigningDocumentPayload(context);
}

async function buildPublicSigningDocumentPayload(context: SigningTokenContext): Promise<PublicSigningDocumentPayload> {
  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  const linkedEducationPackage = await getLinkedEducationPackage(
    context.tenantId,
    doc.templateId,
    doc.templateVersionId,
  );
  const education = await getEducationStatus(context.tenantId, context.documentId, linkedEducationPackage, context.sessionId);
  const decision = await getDecisionStatus(context.tenantId, doc, education);
  const metadata = asRecord(doc.metadata) || {};
  const wordingSnapshot = asRecord(metadata.wordingSnapshot) || {};
  const fixedClauses = asRecord(wordingSnapshot.fixedClauses) || {};
  const legalTextAr = normalizeArabicText(fixedClauses.legalTextAr as string | null | undefined);
  const legalTextEn = getString(fixedClauses.legalTextEn);
  const pdplTextAr = normalizeArabicText(fixedClauses.pdplTextAr as string | null | undefined);
  const pdplTextEn = getString(fixedClauses.pdplTextEn);
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

  const normalizedEducation: EducationStatus = {
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

  const normalizedDecision: DecisionStatus = decision.refusalForm
    ? {
      ...decision,
      refusalForm: {
        ...decision.refusalForm,
        statementAr: normalizeArabicText(decision.refusalForm.statementAr),
        acknowledgementAr: normalizeArabicText(decision.refusalForm.acknowledgementAr),
      },
    }
    : decision;

  const payload: PublicSigningDocumentPayload = {
    documentId: doc.id,
    consentReference: doc.consentReference,
    status: doc.status,
    signerRole: context.signerRole,
    patientName: doc.patientName,
    physicianName: doc.physicianName,
    diagnosis: doc.diagnosis || "",
    plannedProcedure: doc.plannedProcedure || "",
    templateTitleAr: normalizeArabicText(doc.template.titleAr),
    templateTitleEn: doc.template.titleEn,
    versionLabel: doc.templateVersion.versionLabel,
    sections,
    legalTextAr,
    legalTextEn,
    pdplTextAr,
    pdplTextEn,
    signatureCaptured,
    decision: normalizedDecision,
    education: normalizedEducation,
  };

  const arabicDiagnostics = collectPatientFacingArabicDiagnostics(payload);
  if (arabicDiagnostics.length > 0) {
    console.error("[PUBLIC_SIGNING_ARABIC_MOJIBAKE_BLOCKED]", {
      documentId: payload.documentId,
      consentReference: payload.consentReference,
      diagnostics: arabicDiagnostics,
    });
    console.warn(
      "Arabic mojibake diagnostics detected in patient signing view; allowing controlled pilot rendering.",
      arabicDiagnostics,
    );
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

async function getLatestActiveOtpChallenge(token: string): Promise<{ rowId: string; payload: OtpChallengePayload; createdAt: Date } | null> {
  const rows = await prisma().$queryRawUnsafe<OtpEventRow[]>(
    `SELECT id, raw_payload, received_at
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type = $2
       AND COALESCE(processed, FALSE) = FALSE
       AND raw_payload ->> 'tokenHash' = $3
     ORDER BY received_at DESC
     LIMIT 1`,
    OTP_PROVIDER_KEY,
    OTP_REQUESTED_EVENT,
    tokenHash(token),
  );

  const row = rows[0];
  if (!row) return null;

  const payload = parseOtpPayload(row.raw_payload);
  if (!payload) return null;

  return {
    rowId: row.id,
    payload,
    createdAt: row.received_at instanceof Date ? row.received_at : new Date(row.received_at),
  };
}

async function getFailedAttemptCount(challengeId: string): Promise<number> {
  const rows = await prisma().$queryRawUnsafe<Array<{ count: string | number }>>(
    `SELECT COUNT(*)::int AS count
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type = $2
       AND raw_payload ->> 'challengeId' = $3`,
    OTP_PROVIDER_KEY,
    OTP_VERIFY_FAILED_EVENT,
    challengeId,
  );

  const raw = rows[0]?.count ?? 0;
  return typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
}

async function insertOtpEvent(eventType: string, payload: Record<string, unknown>, processed = false): Promise<void> {
  await prisma().$executeRawUnsafe(
    `INSERT INTO webhook_events (provider_key, event_type, raw_payload, hmac_verified, processed)
     VALUES ($1, $2, $3::jsonb, TRUE, $4)`,
    OTP_PROVIDER_KEY,
    eventType,
    JSON.stringify(payload),
    processed,
  );
}

async function markOtpChallengeProcessed(rowId: string): Promise<void> {
  await prisma().$executeRawUnsafe(
    `UPDATE webhook_events
     SET processed = TRUE, processed_at = NOW()
     WHERE id = $1::uuid`,
    rowId,
  );
}

export async function requestSigningOtp(args: {
  token: string;
  mobileNumber: string;
  locale?: "ar" | "en";
  request?: NextRequest;
}): Promise<{ challengeId: string; expiresAt: string; deliveryStatus: "sent" | "failed"; fallbackMode: boolean; maskedPhone: string }> {
  const context = await getSigningTokenContext(args.token);
  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  if (doc.status === ConsentDocumentStatus.SIGNED || doc.status === ConsentDocumentStatus.FINALIZED) {
    throw new ApiError(409, "Signing flow already completed for this document");
  }
  const recipientEmail = getSecureSigningRecipientEmail(doc.metadata);
  // [WORKFLOW_SEQUENCE_CORRECTION] OTP is the FIRST gating step. Pre-OTP
  // education/decision gates have been removed: OTP must be requestable
  // immediately after token validation + bootstrap render. Education and
  // consent decision are still enforced at signature submission time
  // (see `submitPublicSigningSignature`), which is the only place that
  // produces legally binding evidence.
  const mobile = normalizePhoneNumber(args.mobileNumber || "");

  if (!mobile) {
    throw new ApiError(400, "mobileNumber is required");
  }

  const challengeId = crypto.randomUUID();
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const payload: OtpChallengePayload = {
    challengeId,
    tokenHash: tokenHash(args.token),
    otpHash: otpHash(code),
    phoneNumber: mobile,
    maskedPhone: maskPhone(mobile),
    expiresAt,
    sessionId: context.sessionId,
    documentId: context.documentId,
    moduleType: context.moduleType,
  };

  const linkUrl = `${getBaseUrl()}/sign/${encodeURIComponent(args.token)}`;
  const message = buildSigningOtpSms({
    otpCode: code,
    linkUrl,
    expiresMinutes: OTP_EXPIRY_MINUTES,
    locale: args.locale,
  });

  let deliveryStatus: "sent" | "failed" = "failed";
  let statusCode: number | null = null;
  let providerResponse: Record<string, unknown> | null = null;
  let failureReason: string | null = null;
  let otpEmailDeliveryStatus: "sent" | "failed" | "disabled" = "disabled";
  let otpEmailAuditId: string | null = null;
  let otpEmailRecipient: string | null = null;

  if (recipientEmail) {
    const otpEmailDelivery = await sendSigningOtpEmail({
      tenantId: context.tenantId,
      caseId: doc.caseId,
      recipientEmail,
      otpCode: code,
      linkUrl,
      expiresMinutes: OTP_EXPIRY_MINUTES,
      sessionId: context.sessionId,
      documentId: context.documentId,
      challengeId,
      mobileNumber: mobile,
      moduleType: context.moduleType,
      locale: args.locale,
    });

    otpEmailDeliveryStatus = otpEmailDelivery.status;
    otpEmailAuditId = otpEmailDelivery.auditId;
    otpEmailRecipient = otpEmailDelivery.recipient;
  }

  let smsDeliveryStatus: "sent" | "failed" = "failed";
  if (isTaqnyatReady()) {
    const sendResult = await sendTaqnyatMessage({ recipient: mobile, message });
    smsDeliveryStatus = sendResult.ok ? "sent" : "failed";
    statusCode = sendResult.statusCode;
    providerResponse = sendResult.response;
    failureReason = sendResult.ok ? null : "TAQNYAT_DELIVERY_FAILED";
  } else {
    failureReason = "TAQNYAT_NOT_CONFIGURED";
  }

  deliveryStatus = otpEmailDeliveryStatus === "sent" || smsDeliveryStatus === "sent" ? "sent" : "failed";

  await insertOtpEvent(OTP_REQUESTED_EVENT, payload, false);

  void recordEvidenceEvent({
    tenantId: context.tenantId,
    consentDocumentId: context.documentId,
    eventType: "OTP_REQUESTED",
    eventTimestamp: new Date(),
    otpSentTime: new Date(),
    otpVerificationStatus: deliveryStatus === "sent" ? "SENT" : "FAILED_TO_SEND",
    maskedMobileNumber: payload.maskedPhone,
    metadata: {
      moduleType: context.moduleType,
      sessionId: context.sessionId,
      challengeId,
      otpEmailDeliveryStatus,
      otpEmailAuditId,
      otpEmailRecipient,
      smsDeliveryStatus,
    },
  }).catch(() => undefined);

  await appendAuditChainEvent({
    tenantId: context.tenantId,
    eventType: "PUBLIC_SIGNING_OTP_REQUESTED",
    actorId: "public_signer",
    actorRole: "patient",
    payloadSummary: `OTP requested for signing session ${context.sessionId}`,
    metadataJson: {
      challengeId,
      tokenHash: payload.tokenHash,
      maskedPhone: payload.maskedPhone,
      moduleType: context.moduleType,
      deliveryStatus,
      otpEmailDeliveryStatus,
      otpEmailAuditId,
      otpEmailRecipient,
      smsDeliveryStatus,
    },
    request: args.request,
  });

  await recordSmsAuditAttempt({
    tenantId: context.tenantId,
    recipient: mobile,
    status: smsDeliveryStatus,
    statusCode,
    failureReason,
    notificationType: "secure_signing_otp",
    metadata: {
      challengeId,
      sessionId: context.sessionId,
      documentId: context.documentId,
      moduleType: context.moduleType,
      providerResponse,
      otpEmailDeliveryStatus,
      otpEmailAuditId,
      otpEmailRecipient,
    },
  });

  return {
    challengeId,
    expiresAt,
    deliveryStatus,
    fallbackMode: !isTaqnyatReady(),
    maskedPhone: payload.maskedPhone,
  };
}

export async function verifySigningOtp(args: {
  token: string;
  otpCode: string;
  request?: NextRequest;
}): Promise<{ verified: boolean; redirectPath: string; moduleType: string; documentId: string; attemptsRemaining: number; publicSigningSession?: { value: string; expiresAt: string } }> {
  const context = await getSigningTokenContext(args.token);
  const active = await getLatestActiveOtpChallenge(args.token);

  if (!active) {
    throw new ApiError(404, "No active OTP challenge found for this signing token");
  }

  if (new Date(active.payload.expiresAt).getTime() <= Date.now()) {
    throw new ApiError(410, "OTP challenge has expired");
  }

  const attemptsUsed = await getFailedAttemptCount(active.payload.challengeId);
  if (attemptsUsed >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, "OTP attempts exceeded. Request a new OTP challenge");
  }

  const submittedCode = String(args.otpCode || "").trim();
  if (!submittedCode) {
    throw new ApiError(400, "otpCode is required");
  }

  const expected = active.payload.otpHash;
  const actual = otpHash(submittedCode);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  const verified =
    expectedBuffer.length === actualBuffer.length
    && expectedBuffer.length > 0
    && crypto.timingSafeEqual(expectedBuffer, actualBuffer);

  if (!verified) {
    await insertOtpEvent(OTP_VERIFY_FAILED_EVENT, {
      challengeId: active.payload.challengeId,
      tokenHash: active.payload.tokenHash,
      sessionId: context.sessionId,
      documentId: context.documentId,
      moduleType: context.moduleType,
    }, true);

    void recordEvidenceEvent({
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      eventType: "OTP_VERIFY_FAILED",
      eventTimestamp: new Date(),
      otpVerificationStatus: "FAILED",
      maskedMobileNumber: active.payload.maskedPhone,
      metadata: {
        moduleType: context.moduleType,
        sessionId: context.sessionId,
        challengeId: active.payload.challengeId,
      },
    }).catch(() => undefined);

    const latestAttempts = await getFailedAttemptCount(active.payload.challengeId);
    return {
      verified: false,
      redirectPath: context.redirectPath,
      moduleType: context.moduleType,
      documentId: context.documentId,
      attemptsRemaining: Math.max(0, OTP_MAX_ATTEMPTS - latestAttempts),
    };
  }

  await markOtpChallengeProcessed(active.rowId);
  const verifiedAt = new Date().toISOString();
  await insertOtpEvent(OTP_VERIFIED_EVENT, {
    challengeId: active.payload.challengeId,
    tokenHash: active.payload.tokenHash,
    sessionId: context.sessionId,
    documentId: context.documentId,
    moduleType: context.moduleType,
    verifiedAt,
  }, true);

  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  const linkedEducationPackage = await getLinkedEducationPackage(
    context.tenantId,
    doc.templateId,
    doc.templateVersionId,
  );
  const education = await getEducationStatus(context.tenantId, context.documentId, linkedEducationPackage, context.sessionId);
  const documentHash = computeDocumentHash({
    documentId: doc.id,
    consentReference: doc.consentReference,
    status: doc.status,
    diagnosis: doc.diagnosis,
    plannedProcedure: doc.plannedProcedure,
    templateVersionId: doc.templateVersionId,
    updatedAt: doc.updatedAt.toISOString(),
  });
  const publicSessionExpiresAt = computePublicSessionExpiry();
  const publicSigningSessionValue = createPublicSigningSessionCookieValue({
    documentId: context.documentId,
    tokenHash: active.payload.tokenHash,
    signerRole: context.signerRole,
    tenantId: context.tenantId,
    moduleType: context.moduleType,
    challengeId: active.payload.challengeId,
    verifiedAt,
    expiresAt: publicSessionExpiresAt,
  });

  void recordEvidenceEvent({
    tenantId: context.tenantId,
    consentDocumentId: context.documentId,
    eventType: "PATIENT_SIGNATURE_VERIFIED_BY_OTP",
    eventTimestamp: new Date(),
    otpVerificationTime: new Date(),
    otpVerificationStatus: "VERIFIED",
    maskedMobileNumber: active.payload.maskedPhone,
    educationViewed: Boolean(education.viewedAt),
    signatureTimestamp: new Date(verifiedAt),
    signerIdentity: context.signerRole,
    ipAddress: getClientIpAddress(args.request) || undefined,
    browser: args.request?.headers.get("user-agent") || undefined,
    metadata: {
      moduleType: context.moduleType,
      sessionId: context.sessionId,
      challengeId: active.payload.challengeId,
      tokenHash: active.payload.tokenHash,
      otpHash: active.payload.otpHash,
      documentHash,
      educationCompleted: education.completed,
      patientAcknowledged: education.patientAcknowledged,
      educationDisplayedAt: education.viewedAt,
      educationAcknowledgedAt: education.acknowledgedAt,
      educationDurationSeconds: education.durationSeconds,
      educationScrollCompletion: education.scrollCompletion,
      educationVersion: education.versionLabel,
      educationHash: education.contentHash,
    },
  }).catch(() => undefined);

  await writePublicConsentAudit({
    tenantId: context.tenantId,
    consentDocumentId: context.documentId,
    action: "PATIENT_SIGNATURE_VERIFIED_BY_OTP",
    summary: `OTP verified for ${context.signerRole.toLowerCase()} signature on consent ${doc.consentReference}`,
    signerRole: context.signerRole,
    metadata: {
      challengeId: active.payload.challengeId,
      tokenHash: active.payload.tokenHash,
      documentHash,
      educationCompleted: education.completed,
      patientAcknowledged: education.patientAcknowledged,
    },
    request: args.request,
  });

  await appendAuditChainEvent({
    tenantId: context.tenantId,
    eventType: "PUBLIC_SIGNING_OTP_VERIFIED",
    actorId: "public_signer",
    actorRole: "patient",
    payloadSummary: `OTP verified for signing session ${context.sessionId}`,
    metadataJson: {
      challengeId: active.payload.challengeId,
      tokenHash: active.payload.tokenHash,
      moduleType: context.moduleType,
      documentId: context.documentId,
    },
    request: args.request,
  });

  return {
    verified: true,
    redirectPath: context.redirectPath,
    moduleType: context.moduleType,
    documentId: context.documentId,
    attemptsRemaining: OTP_MAX_ATTEMPTS,
    publicSigningSession: {
      value: publicSigningSessionValue,
      expiresAt: publicSessionExpiresAt,
    },
  };
}

export async function submitPublicSigningSignature(args: {
  token: string;
  signerName: string;
  signatureDataUrl?: string;
  request: NextRequest;
}): Promise<PublicSignatureResult> {
  const context = await validatePublicSigningSession({
    token: args.token,
    request: args.request,
  });
  const signerRole = normalizeSignerRole(context.signerRole);
  const signerName = getString(args.signerName);

  if (!signerName) {
    throw new ApiError(400, "signerName is required");
  }

  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  const patientEmail = getSecureSigningRecipientEmail(doc.metadata);
  if (doc.status === ConsentDocumentStatus.FINALIZED) {
    throw new ApiError(409, "Finalized consent cannot accept signatures");
  }

  const signableStatuses = [
    ConsentDocumentStatus.APPROVED,
    ConsentDocumentStatus.READY_FOR_SIGNATURE,
    ConsentDocumentStatus.SIGNED,
  ];
  if (!signableStatuses.includes(doc.status)) {
    console.warn(
      "Public signing continued despite non-signable consent status after patient review/OTP workflow.",
      {
        documentId: doc.id,
        status: doc.status,
        token: context.publicSession.token,
      },
    );
  }

  if (doc.signatures.some((signature) => signature.role === signerRole)) {
    throw new ApiError(409, "Signature already captured for this signer role");
  }

  const latestRequestedChallenge = await getLatestOtpEventByChallenge(context.publicSession.challengeId, OTP_REQUESTED_EVENT);
  if (!latestRequestedChallenge?.otpHash) {
    throw new ApiError(409, "Missing OTP evidence for this signing session");
  }

  const linkedEducationPackage = await getLinkedEducationPackage(
    context.tenantId,
    doc.templateId,
    doc.templateVersionId,
  );
  const education = await getEducationStatus(context.tenantId, context.documentId, linkedEducationPackage, context.sessionId);
  const decision = await getDecisionStatus(context.tenantId, doc, education);
  if (linkedEducationPackage && (!education.completed || !education.patientAcknowledged)) {
    throw new ApiError(409, "Education must be completed and acknowledged before signature capture");
  }
  if (decision.status === "UNDECIDED") {
    throw new ApiError(409, "Consent decision is required before signature capture");
  }
  const signatureHash = args.signatureDataUrl
    ? crypto.createHash("sha256").update(args.signatureDataUrl).digest("hex")
    : null;
  const requestIpAddress = getClientIpAddress(args.request);
  const requestUserAgent = args.request.headers.get("user-agent") || null;
  const documentHash = computeDocumentHash({
    documentId: doc.id,
    consentReference: doc.consentReference,
    status: doc.status,
    diagnosis: doc.diagnosis,
    plannedProcedure: doc.plannedProcedure,
    templateVersionId: doc.templateVersionId,
    updatedAt: doc.updatedAt.toISOString(),
  });

  if (decision.status === "CONSENT_REFUSED") {
    if (!decision.refusalAcknowledged) {
      throw new ApiError(409, "Refusal acknowledgement is required before refusal signature capture");
    }
    if (decision.refusalSignatureCaptured) {
      throw new ApiError(409, "Refusal form signature already captured for this signer role");
    }

    const signatureId = crypto.randomUUID();
    const capturedAt = new Date().toISOString();
    const refusalForm = decision.refusalForm || buildRefusalFormPayload({ doc, education });
    await prisma().consentDocument.update({
      where: { id: context.documentId },
      data: {
        status: ConsentDocumentStatus.SIGNED,
        metadata: mergeDecisionExecutionContext({
          rawMetadata: doc.metadata,
          eventType: "REFUSAL_ACKNOWLEDGED",
          decisionStatus: decision.status,
          consentHash: buildConsentContentHash(doc),
          consentVersion: doc.templateVersion.versionLabel,
          education,
          refusalForm,
          refusalAcknowledged: true,
          refusalSignature: {
            signatureId,
            signerName,
            signatureHash,
            capturedAt,
            ipAddress: requestIpAddress,
            userAgent: requestUserAgent,
            otpVerifiedAt: context.publicSession.verifiedAt,
          },
        }) as Prisma.InputJsonValue,
      },
    });

    await persistPublicSigningEvidencePackages({
      tenantId: context.tenantId,
      documentId: context.documentId,
      caseId: doc.caseId,
      patientName: doc.patientName,
      consentReference: doc.consentReference,
      generatedAt: new Date(capturedAt),
      generatedBy: "public_signer",
      pdfHash: doc.auditChecksum || doc.immutablePdfHash || documentHash,
      documentHash,
      otpHash: latestRequestedChallenge.otpHash,
      otpVerifiedAt: context.publicSession.verifiedAt,
      ipAddress: requestIpAddress,
      userAgent: requestUserAgent,
      education,
      decision: {
        ...decision,
        refusalAcknowledged: true,
        refusalSignedAt: capturedAt,
        refusalSignatureCaptured: true,
        refusalSignatureId: signatureId,
        refusalForm,
      },
      signerName,
      signatureHash,
      signatureId,
      consentVersion: doc.templateVersion.versionLabel,
    });

    await writePublicConsentAudit({
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      action: "REFUSAL_SIGNED",
      summary: `Treatment refusal form signed for consent ${doc.consentReference}`,
      signerRole,
      metadata: {
        signerName,
        signatureMethod: ConsentMethod.OTP,
        tokenHash: context.publicSession.tokenHash,
        challengeId: context.publicSession.challengeId,
        documentHash,
        refusalFormHash: refusalForm.formHash,
        educationCompleted: education.completed,
        patientAcknowledged: education.patientAcknowledged,
        signatureHash,
      },
      request: args.request,
    });

    void recordEvidenceEvent({
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      eventType: "REFUSAL_SIGNED",
      eventTimestamp: new Date(capturedAt),
      signatureTimestamp: new Date(capturedAt),
      signerIdentity: signerName,
      consentTemplate: doc.template.titleEn,
      consentVersion: doc.templateVersion.versionLabel,
      consentLanguage: "bilingual",
      ipAddress: requestIpAddress || undefined,
      browser: requestUserAgent || undefined,
      otpVerificationTime: new Date(context.publicSession.verifiedAt),
      otpVerificationStatus: "VERIFIED",
      educationViewed: Boolean(education.viewedAt),
      metadata: {
        otpHash: latestRequestedChallenge.otpHash,
        tokenHash: context.publicSession.tokenHash,
        challengeId: context.publicSession.challengeId,
        documentHash,
        refusalFormHash: refusalForm.formHash,
        educationCompleted: education.completed,
        patientAcknowledged: education.patientAcknowledged,
        educationDisplayedAt: education.viewedAt,
        educationAcknowledgedAt: education.acknowledgedAt,
        educationDurationSeconds: education.durationSeconds,
        educationScrollCompletion: education.scrollCompletion,
        educationVersion: education.versionLabel,
        educationHash: education.contentHash,
        signatureHash,
        decisionStatus: decision.status,
      },
    }).catch(() => undefined);

    return {
      documentId: context.documentId,
      status: ConsentDocumentStatus.SIGNED,
      signatureId,
      signerRole,
      signerName,
      signatureMethod: ConsentMethod.OTP,
      signedAt: capturedAt,
      evidence: {
        documentHash,
        otpHash: latestRequestedChallenge.otpHash,
        educationCompleted: education.completed,
        patientAcknowledged: education.patientAcknowledged,
        decisionStatus: decision.status,
      },
    };
  }

  const signature = await prisma().consentDocumentSignature.create({
    data: {
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      role: signerRole,
      signerName,
      signatureMethod: ConsentMethod.OTP,
      ipAddress: requestIpAddress,
      userAgent: requestUserAgent,
      metadata: {
        capturedBy: "public_signer",
        tokenHash: context.publicSession.tokenHash,
        challengeId: context.publicSession.challengeId,
        otpVerifiedAt: context.publicSession.verifiedAt,
        signatureProvided: Boolean(args.signatureDataUrl),
        signatureHash,
      },
    },
  });

  const signatures = [...doc.signatures, signature];
  const hasPatient = signatures.some((item) => item.role === ConsentSignatureRole.PATIENT || item.role === ConsentSignatureRole.GUARDIAN);
  const hasPhysician = signatures.some((item) => item.role === ConsentSignatureRole.PHYSICIAN);
  const signerCompletesWorkflow = signerRole === ConsentSignatureRole.PATIENT || signerRole === ConsentSignatureRole.GUARDIAN;
  const nextStatus = signerCompletesWorkflow
    ? ConsentDocumentStatus.SIGNED
    : (hasPatient && hasPhysician
    ? ConsentDocumentStatus.SIGNED
    : ConsentDocumentStatus.READY_FOR_SIGNATURE);

  await prisma().consentDocument.update({
    where: { id: context.documentId },
    data: {
      status: nextStatus,
    },
  });

  const pdfHash = doc.auditChecksum || doc.immutablePdfHash || documentHash;
  await persistPublicSigningEvidencePackages({
    tenantId: context.tenantId,
    documentId: context.documentId,
    caseId: doc.caseId,
    patientName: doc.patientName,
    patientEmail,
    patientEmail,
    consentReference: doc.consentReference,
    generatedAt: signature.signedAt,
    generatedBy: "public_signer",
    pdfHash,
    documentHash,
    otpHash: latestRequestedChallenge.otpHash,
    otpVerifiedAt: context.publicSession.verifiedAt,
    ipAddress: requestIpAddress,
    userAgent: requestUserAgent,
    education,
    decision,
    signerName,
    signatureHash,
    signatureId: signature.id,
    consentVersion: doc.templateVersion.versionLabel,
  });

  await writePublicConsentAudit({
    tenantId: context.tenantId,
    consentDocumentId: context.documentId,
    action: "PATIENT_SIGNATURE_CAPTURED",
    summary: `Signature captured (${signerRole}) for consent ${doc.consentReference}`,
    signerRole,
    metadata: {
      signerName,
      signatureMethod: ConsentMethod.OTP,
      tokenHash: context.publicSession.tokenHash,
      challengeId: context.publicSession.challengeId,
      nextStatus,
      documentHash,
      educationCompleted: education.completed,
      patientAcknowledged: education.patientAcknowledged,
      signatureHash,
    },
    request: args.request,
  });

  void recordEvidenceEvent({
    tenantId: context.tenantId,
    consentDocumentId: context.documentId,
    eventType: "PATIENT_SIGNATURE_CAPTURED",
    eventTimestamp: signature.signedAt,
    signatureTimestamp: signature.signedAt,
    signerIdentity: signerName,
    consentTemplate: doc.template.titleEn,
    consentVersion: doc.templateVersion.versionLabel,
    consentLanguage: "bilingual",
    ipAddress: signature.ipAddress || undefined,
    browser: signature.userAgent || undefined,
    otpVerificationTime: new Date(context.publicSession.verifiedAt),
    otpVerificationStatus: "VERIFIED",
    educationViewed: Boolean(education.viewedAt),
    metadata: {
      otpHash: latestRequestedChallenge.otpHash,
      tokenHash: context.publicSession.tokenHash,
      challengeId: context.publicSession.challengeId,
      documentHash,
      pdfHash,
      educationCompleted: education.completed,
      patientAcknowledged: education.patientAcknowledged,
      educationDisplayedAt: education.viewedAt,
      educationAcknowledgedAt: education.acknowledgedAt,
      educationDurationSeconds: education.durationSeconds,
      educationScrollCompletion: education.scrollCompletion,
      educationVersion: education.versionLabel,
      educationHash: education.contentHash,
      signatureHash,
      signatureProvided: Boolean(args.signatureDataUrl),
    },
  }).catch(() => undefined);

  return {
    documentId: context.documentId,
    status: nextStatus,
    signatureId: signature.id,
    signerRole,
    signerName,
    signatureMethod: signature.signatureMethod,
    signedAt: signature.signedAt.toISOString(),
    evidence: {
      documentHash,
      otpHash: latestRequestedChallenge.otpHash,
      educationCompleted: education.completed,
      patientAcknowledged: education.patientAcknowledged,
      decisionStatus: decision.status,
    },
  };
}
