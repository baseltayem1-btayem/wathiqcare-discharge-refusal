import crypto from "node:crypto";
import { $Enums, Prisma, type PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import { appendAuditChainEventInTransaction } from "@/lib/server/audit-chain-service";
import { deriveEducationSessionState, type EducationSessionState } from "@/lib/server/education-session-service";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {
  readPublicSigningSession,
  type PublicSigningSessionPayload,
} from "@/lib/server/public-signing-session";
import {
  getSigningTokenContext,
  type SigningTokenContext,
} from "@/lib/server/signing-token-context-service";
import { normalizePublicDecisionStatus, type PublicDecisionStatus } from "@/lib/public-signing/decision-status";

const prisma = () => getPrisma();

const OTP_PROVIDER_KEY = "public_signing_otp";

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

export type PublicDecisionEventType =
  | "CONSENT_PRESENTED"
  | "CONSENT_ACCEPTED"
  | "CONSENT_REFUSED"
  | "REFUSAL_FORM_PRESENTED"
  | "REFUSAL_ACKNOWLEDGED";

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

type LocalizedLine = { ar: string; en: string };
type LocalizedFaq = { questionAr: string; answerAr: string; questionEn: string; answerEn: string };

export type LinkedEducationPackagePayload = {
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

export type EducationStatus = {
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

export type PublicDecisionStatusPayload = {
  status: PublicDecisionStatus;
  consentPresentedAt: string | null;
  selectedAt: string | null;
  refusalFormPresentedAt: string | null;
  refusalAcknowledged: boolean;
  refusalAcknowledgedAt: string | null;
  refusalSignedAt: string | null;
  refusalSignatureCaptured: boolean;
  refusalSignatureId: string | null;
  refusalReason: string | null;
  refusalForm: {
    patientName: string | null;
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

export function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getNullableString(value: unknown): string | null {
  const normalized = getString(value);
  return normalized || null;
}

export function getFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  if (typeof value === "number") return value !== 0;
  return false;
}

export function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => getString(item)).filter(Boolean);
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

export function computeDocumentHash(input: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function normalizeDecisionStatus(value: unknown): PublicDecisionStatus {
  return normalizePublicDecisionStatus(value);
}

export async function writePublicConsentAudit(args: {
  tenantId: string;
  consentDocumentId: string;
  action: string;
  summary: string;
  signerRole: string;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
  tx?: PrismaClient | Prisma.TransactionClient;
}) {
  const write = async (tx: PrismaClient | Prisma.TransactionClient) => {
    const audit = await tx.consentAuditEvent.create({
      data: {
        tenantId: args.tenantId,
        consentDocumentId: args.consentDocumentId,
        action: args.action,
        source: "public-signing",
        actorUserId: null,
        actorRole: args.signerRole,
        summary: args.summary,
        metadata: args.metadata as Prisma.InputJsonValue,
      },
    });

    await appendAuditChainEventInTransaction(
      {
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
      },
      tx,
    );

    return audit;
  };

  if (args.tx) {
    return write(args.tx);
  }

  return prisma().$transaction(write);
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
    "OTP_VERIFIED",
    challengeId,
  );

  if (!rows[0]?.id) {
    throw new ApiError(401, "OTP verification is required");
  }
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

export async function getLinkedEducationPackage(
  tenantId: string,
  templateId: string,
  templateVersionId: string,
): Promise<LinkedEducationPackagePayload | null> {
  try {
    const packages = await prisma().procedureEducation.findMany({
      where: {
        tenantId,
        status: $Enums.ProcedureEducationStatus.ACTIVE,
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
      if (!version || version.status !== $Enums.ProcedureEducationStatus.ACTIVE) continue;

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

  try {
    const packages = await prisma().$queryRaw<LegacyEducationPackageRow[]>`
      SELECT
        p.id,
        p.package_key,
        p.title_ar,
        p.title_en,
        v.id AS version_id,
        v.version_label,
        v.content_hash,
        p.summary_ar,
        p.summary_en,
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
  } catch {
    // Legacy education tables are optional in preview. Fall back to no package.
  }

  return null;
}

export async function getEducationStatus(
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

export async function loadPublicDocumentRecord(tenantId: string, documentId: string) {
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

export function buildConsentContentHash(doc: Awaited<ReturnType<typeof loadPublicDocumentRecord>>): string {
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

export function buildRefusalFormPayload(args: {
  doc: Awaited<ReturnType<typeof loadPublicDocumentRecord>>;
  education: EducationStatus;
  rawDecisionMetadata?: Record<string, unknown> | null;
}): NonNullable<PublicDecisionStatusPayload["refusalForm"]> {
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

export async function getDecisionStatus(
  tenantId: string,
  doc: Awaited<ReturnType<typeof loadPublicDocumentRecord>>,
  education: EducationStatus,
): Promise<PublicDecisionStatusPayload> {
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
    refusalReason: getNullableString(decisionMetadata.refusalReason),
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

export function mergeDecisionExecutionContext(args: {
  rawMetadata: unknown;
  eventType: PublicDecisionEventType;
  decisionStatus: PublicDecisionStatus;
  consentHash: string;
  consentVersion: string;
  education: EducationStatus;
  refusalForm: PublicDecisionStatusPayload["refusalForm"];
  refusalAcknowledged?: boolean;
  refusalReason?: string;
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
        refusalReason:
          args.refusalReason
          || getNullableString(currentDecision.refusalReason)
          || null,
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
  refusalReason?: string;
}): Promise<PublicDecisionStatusPayload> {
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

  await prisma().$transaction(async (tx) => {
    await tx.consentDocument.update({
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
          refusalReason: args.refusalReason,
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
        refusalReason: args.refusalReason || null,
      },
      request: args.request,
      tx,
    });
  });

  const updatedDoc = await loadPublicDocumentRecord(context.tenantId, doc.id);
  return getDecisionStatus(context.tenantId, updatedDoc, education);
}