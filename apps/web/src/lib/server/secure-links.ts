import crypto from "node:crypto";
import { DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import {
  buildWathiqCareEmailHtml,
  buildWathiqCareEmailText,
  sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";

const prisma = getPrisma();

const SECURE_LINK_TEMPLATE_KEY = "secure_discharge_link";
const SECURE_LINK_CODE_PREFIX = "SECURE-LINK:";
const DEFAULT_EXPIRY_HOURS = 72;

type SecureLinkPayload = {
  link_id: string;
  tenant_id: string;
  case_id: string;
  case_reference: string;
  recipient_email: string;
  patient_name: string | null;
  hospital_name: string | null;
  discharge_summary: string | null;
  legal_notice: string;
  home_care_agreement_text: string | null;
  equipment_acknowledgment_text: string | null;
  has_home_care_agreement: boolean;
  has_equipment_acknowledgment: boolean;
  delivery_status: string;
  delivery_channel: string;
  sent_via: string;
  expires_at: string;
  created_at: string;
  accessed_at?: string | null;
  revoked_at?: string | null;
  decision_type?: "accept" | "refuse" | null;
  decision_name?: string | null;
  decision_submitted_at?: string | null;
  refusal_acknowledged?: boolean;
  signature_hash?: string | null;
  signature_provided?: boolean;
  provider_result?: Record<string, unknown> | null;
};

type CreateSecureLinkResult = {
  link_id: string;
  url: string;
  expires_at: string;
  recipient_email: string;
  delivery_status: string;
  delivery_channel: string;
};

type SecureLinkRecord = {
  link_id: string;
  recipient_email: string;
  sent_via: string;
  delivery_status: string;
  decision_type?: string | null;
  decision_submitted_at?: string | null;
  expires_at: string;
  accessed_at?: string | null;
  revoked_at?: string | null;
  created_at?: string | null;
};

type PublicSecureCase = {
  link_id: string;
  hospital_name?: string | null;
  case_id: string;
  case_reference: string;
  patient_name?: string | null;
  discharge_summary?: string | null;
  legal_notice: string;
  expires_at: string;
  accessed_at?: string | null;
  decision_type?: "accept" | "refuse" | null;
  decision_name?: string | null;
  decision_submitted_at?: string | null;
  has_home_care_agreement?: boolean;
  home_care_agreement_text?: string | null;
  has_equipment_acknowledgment?: boolean;
  equipment_acknowledgment_text?: string | null;
};

type SubmitDecisionResponse = {
  hospital_name?: string | null;
  case_id: string;
  case_reference: string;
  decision_type: "accept" | "refuse";
  typed_name: string;
  submitted_at: string;
  confirmation_message: string;
};

type DecisionInput = {
  decision: "accept" | "refuse";
  typed_name: string;
  refusal_acknowledged?: boolean;
  signature_data?: string;
};

type PublicDecisionAuditAction = {
  action: string;
  details: string;
  eventType: string;
};

type CaseContext = Prisma.CaseGetPayload<{
  select: {
    id: true;
    tenantId: true;
    caseNumber: true;
    title: true;
    patientName: true;
    metadata: true;
    tenant: {
      select: {
        name: true;
      };
    };
  };
}>;

type StoredSecureLinkDocument = Prisma.DocumentGetPayload<{
  include: {
    case: {
      select: {
        id: true;
        caseNumber: true;
        title: true;
        patientName: true;
        metadata: true;
        tenant: {
          select: {
            name: true;
          };
        };
      };
    };
  };
}>;

function safeString(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getNestedString(source: Record<string, unknown> | null, keys: string[]): string | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const direct = source[key];
    if (typeof direct === "string" && direct.trim()) {
      return direct.trim();
    }
  }

  for (const value of Object.values(source)) {
    const nested = asRecord(value);
    const found = getNestedString(nested, keys);
    if (found) {
      return found;
    }
  }

  return null;
}

function buildDefaultLegalNotice(): string {
  return "أقر بأنني أو من أمثله قد اطّلعت على القرار الطبي والتعليمات المرافقة له، وتم شرح المخاطر والبدائل العلاجية والنتائج المحتملة بشكل واضح. أي قرار يتم تسجيله عبر هذا الرابط يُعد توثيقًا رسميًا وملزمًا يُحفظ ضمن سجل الحالة الطبية.";
}

function buildCaseReference(caseRecord: Pick<CaseContext, "id" | "caseNumber">): string {
  return safeString(caseRecord.caseNumber) || `CASE-${caseRecord.id.slice(0, 8).toUpperCase()}`;
}

function getHospitalName(caseRecord: CaseContext | StoredSecureLinkDocument["case"] | null): string | null {
  if (!caseRecord) {
    return null;
  }

  return safeString(caseRecord.tenant.name) || null;
}

function getDischargeSummary(caseRecord: Pick<CaseContext, "title" | "metadata">): string | null {
  const metadata = asRecord(caseRecord.metadata);
  return (
    getNestedString(metadata, ["discharge_summary", "discussion_summary", "refusal_reason"])
    || safeString(caseRecord.title)
    || null
  );
}

function getHomeCareAgreementText(caseRecord: Pick<CaseContext, "metadata">): string | null {
  return getNestedString(asRecord(caseRecord.metadata), [
    "home_care_agreement_text",
    "home_healthcare_agreement_text",
    "home_care_summary",
  ]);
}

function getEquipmentAcknowledgmentText(caseRecord: Pick<CaseContext, "metadata">): string | null {
  return getNestedString(asRecord(caseRecord.metadata), [
    "equipment_acknowledgment_text",
    "equipment_summary",
    "equipment_required_summary",
  ]);
}

function getAppBaseUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_APP_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.APP_BASE_URL?.trim();

  return (explicit || "https://wathiqcare.online").replace(/\/$/, "");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function computeTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function computeSignatureHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function logSecureLinkPublicEvent(event: string, data: Record<string, unknown>): void {
  console.warn(JSON.stringify({
    timestamp: new Date().toISOString(),
    component: "secure_link",
    event,
    ...data,
  }));
}

async function appendPublicDecisionAudit(args: {
  document: StoredSecureLinkDocument;
  token: string;
  payload: SecureLinkPayload;
  typedName: string;
  decision: "accept" | "refuse";
  submittedAt: string;
  signatureProvided: boolean;
  refusalAcknowledged: boolean;
  request?: NextRequest;
}): Promise<void> {
  const baseMetadata = {
    submitted_at: args.submittedAt,
    secure_link_id: args.payload.link_id,
    secure_token_hash: computeTokenHash(args.token),
    typed_name: args.typedName,
    decision_type: args.decision,
    refusal_acknowledged: args.refusalAcknowledged,
    signature_provided: args.signatureProvided,
    public_submission: true,
  } as const;

  const auditActions: PublicDecisionAuditAction[] = [
    {
      action: args.decision === "refuse" ? "public_secure_refusal_submitted" : "public_secure_acceptance_submitted",
      details:
        args.decision === "refuse"
          ? `Public secure refusal submitted by ${args.typedName}`
          : `Public secure acceptance submitted by ${args.typedName}`,
      eventType: args.decision === "refuse" ? "PUBLIC_SECURE_REFUSAL_SUBMITTED" : "PUBLIC_SECURE_ACCEPTANCE_SUBMITTED",
    },
    {
      action: "public_secure_patient_acknowledged",
      details: `Patient acknowledgment recorded via secure link for ${args.typedName}`,
      eventType: "PUBLIC_SECURE_PATIENT_ACKNOWLEDGED",
    },
    {
      action: "public_secure_signature_submitted",
      details: args.signatureProvided
        ? `Signature submitted via public secure link by ${args.typedName}`
        : `Typed-name attestation recorded via public secure link by ${args.typedName}`,
      eventType: "PUBLIC_SECURE_SIGNATURE_SUBMITTED",
    },
    {
      action: "public_secure_decision_recorded",
      details: `Secure link decision recorded as ${args.decision} for ${args.typedName}`,
      eventType: "PUBLIC_SECURE_DECISION_RECORDED",
    },
  ];

  for (const auditAction of auditActions) {
    await writeAuditLog({
      tenantId: args.payload.tenant_id,
        userId: args.document.generatedByUserId ?? args.payload.case_id,
      entityType: "secure_link",
      entityId: args.document.id,
      action: auditAction.action,
      details: auditAction.details,
      caseId: args.payload.case_id,
      documentId: args.document.id,
      metadataJson: baseMetadata,
      request: args.request,
    });

    await appendAuditChainEvent({
      tenantId: args.payload.tenant_id,
      caseId: args.payload.case_id,
      eventType: auditAction.eventType,
      actorId: null,
      actorRole: "public_secure_party",
      payloadSummary: auditAction.details,
      metadataJson: baseMetadata,
      request: args.request,
    }).catch(() => undefined);
  }
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === "P2021" || code === "P2022";
}

function parseSecureLinkPayload(document: { payloadJson: unknown }): SecureLinkPayload {
  const payload = asRecord(document.payloadJson);
  if (!payload) {
    throw new ApiError(500, "بيانات الرابط الآمن تالفة");
  }
  return payload as unknown as SecureLinkPayload;
}

async function getTenantCaseOrThrow(tenantId: string, caseId: string): Promise<CaseContext> {
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId },
    select: {
      id: true,
      tenantId: true,
      caseNumber: true,
      title: true,
      patientName: true,
      metadata: true,
      tenant: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!caseRecord) {
    throw new ApiError(404, "Case not found");
  }

  return caseRecord;
}

async function sendSecureLinkEmail(args: {
  recipientEmail: string;
  patientName: string | null;
  hospitalName: string | null;
  caseReference: string;
  secureUrl: string;
  expiresAt: string;
}): Promise<{ deliveryStatus: string; deliveryChannel: string; providerResult: Record<string, unknown> | null }> {
  const recipientEmail = args.recipientEmail.trim().toLowerCase();

  if (!isValidEmail(recipientEmail)) {
    throw new ApiError(400, "Invalid recipient email");
  }

  if (!(process.env.SMTP_PASS?.trim() || process.env.RESEND_API_KEY?.trim())) {
    return {
      deliveryStatus: "not_configured",
      deliveryChannel: "manual_share",
      providerResult: {
        provider: "smtp",
        configured: false,
      },
    };
  }

  const hospitalName = args.hospitalName || "WathiqCare";
  const patientName = args.patientName || "the patient";
  const subject = `WathiqCare | Secure Patient Decision Link - ${args.caseReference}`;
  const expiresNote = `This secure link expires on ${new Date(args.expiresAt).toUTCString()}.`;
  const html = buildWathiqCareEmailHtml({
    title: "Secure Patient Decision Link",
    preheader: `A secure discharge decision link is ready for case ${args.caseReference}.`,
    bodyHtml: `<p>A secure patient decision link has been generated for case <strong>${args.caseReference}</strong>.</p><p>Facility: <strong>${hospitalName}</strong></p><p>Patient: <strong>${patientName}</strong></p><p>Please review the medical discharge details and record your decision using the secure link below.</p>`,
    ctaUrl: args.secureUrl,
    ctaText: "Open Secure Decision Link",
    expiresNote,
    securityNote: "This secure link is intended only for the patient or their legal representative. Do not forward it to unauthorized parties.",
  });
  const text = buildWathiqCareEmailText({
    title: "Secure Patient Decision Link",
    bodyLines: [
      `Facility: ${hospitalName}`,
      `Case Reference: ${args.caseReference}`,
      `Patient: ${patientName}`,
      "Please review the medical discharge details and record your decision using the secure link below.",
    ],
    ctaUrl: args.secureUrl,
    ctaLabel: "Open Secure Decision Link",
    expiresNote,
    securityNote: "This secure link is intended only for the patient or their legal representative.",
  });

  const diagnostics = await sendEmailWithDiagnostics({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  return {
    deliveryStatus: "sent",
    deliveryChannel: "email",
    providerResult: {
      provider: diagnostics.provider,
      message_id: diagnostics.messageId ?? null,
      smtp_accepted: diagnostics.smtpAccepted ?? [],
      smtp_rejected: diagnostics.smtpRejected ?? [],
    },
  };
}

function mapLinkRecord(payload: SecureLinkPayload): SecureLinkRecord {
  return {
    link_id: payload.link_id,
    recipient_email: payload.recipient_email,
    sent_via: payload.sent_via,
    delivery_status: payload.delivery_status,
    decision_type: payload.decision_type ?? null,
    decision_submitted_at: payload.decision_submitted_at ?? null,
    expires_at: payload.expires_at,
    accessed_at: payload.accessed_at ?? null,
    revoked_at: payload.revoked_at ?? null,
    created_at: payload.created_at,
  };
}

function mapPublicCase(payload: SecureLinkPayload): PublicSecureCase {
  return {
    link_id: payload.link_id,
    hospital_name: payload.hospital_name,
    case_id: payload.case_id,
    case_reference: payload.case_reference,
    patient_name: payload.patient_name,
    discharge_summary: payload.discharge_summary,
    legal_notice: payload.legal_notice,
    expires_at: payload.expires_at,
    accessed_at: payload.accessed_at ?? null,
    decision_type: payload.decision_type ?? null,
    decision_name: payload.decision_name ?? null,
    decision_submitted_at: payload.decision_submitted_at ?? null,
    has_home_care_agreement: payload.has_home_care_agreement,
    home_care_agreement_text: payload.home_care_agreement_text,
    has_equipment_acknowledgment: payload.has_equipment_acknowledgment,
    equipment_acknowledgment_text: payload.equipment_acknowledgment_text,
  };
}

function ensureLinkActive(payload: SecureLinkPayload): void {
  if (payload.revoked_at) {
    throw new ApiError(410, "تم إلغاء الرابط الآمن");
  }

  const expiresAt = new Date(payload.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new ApiError(410, "انتهت صلاحية الرابط الآمن");
  }
}

async function getStoredSecureLinkByToken(token: string): Promise<StoredSecureLinkDocument> {
  const tokenHash = computeTokenHash(token);
  const document = await prisma.document.findFirst({
    where: {
      templateKey: SECURE_LINK_TEMPLATE_KEY,
      documentCode: `${SECURE_LINK_CODE_PREFIX}${tokenHash}`,
    },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
          patientName: true,
          metadata: true,
          tenant: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!document) {
    logSecureLinkPublicEvent("public_secure_link_lookup_failed", {
      reason: "not_found",
      secure_token_hash: tokenHash,
    });
    throw new ApiError(404, "الرابط الآمن غير موجود");
  }

  return document;
}

export async function createSecureLink(args: {
  tenantId: string;
  userId: string;
  caseId: string;
  recipientEmail: string;
  request?: NextRequest;
}): Promise<CreateSecureLinkResult> {
  const normalizedEmail = args.recipientEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new ApiError(400, "recipient_email is required");
  }
  if (!isValidEmail(normalizedEmail)) {
    throw new ApiError(400, "Invalid recipient email");
  }

  const caseRecord = await getTenantCaseOrThrow(args.tenantId, args.caseId);
  const caseReference = buildCaseReference(caseRecord);
  const hospitalName = getHospitalName(caseRecord);
  const patientName = safeString(caseRecord.patientName) || null;
  const dischargeSummary = getDischargeSummary(caseRecord);
  const homeCareAgreementText = getHomeCareAgreementText(caseRecord);
  const equipmentAcknowledgmentText = getEquipmentAcknowledgmentText(caseRecord);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = computeTokenHash(rawToken);
  const url = `${getAppBaseUrl()}/secure/${encodeURIComponent(rawToken)}`;
  const delivery = await sendSecureLinkEmail({
    recipientEmail: normalizedEmail,
    patientName,
    hospitalName,
    caseReference,
    secureUrl: url,
    expiresAt,
  });
  const linkId = crypto.randomUUID();
  const createdAt = now.toISOString();
  const payload: SecureLinkPayload = {
    link_id: linkId,
    tenant_id: args.tenantId,
    case_id: args.caseId,
    case_reference: caseReference,
    recipient_email: normalizedEmail,
    patient_name: patientName,
    hospital_name: hospitalName,
    discharge_summary: dischargeSummary,
    legal_notice: buildDefaultLegalNotice(),
    home_care_agreement_text: homeCareAgreementText,
    equipment_acknowledgment_text: equipmentAcknowledgmentText,
    has_home_care_agreement: Boolean(homeCareAgreementText),
    has_equipment_acknowledgment: Boolean(equipmentAcknowledgmentText),
    delivery_status: delivery.deliveryStatus,
    delivery_channel: delivery.deliveryChannel,
    sent_via: delivery.deliveryChannel,
    expires_at: expiresAt,
    created_at: createdAt,
    provider_result: delivery.providerResult,
  };

  await prisma.document.create({
    data: {
      id: linkId,
      tenantId: args.tenantId,
      caseId: args.caseId,
      documentType: DocumentType.OTHER,
      status: DocumentStatus.GENERATED,
      documentCode: `${SECURE_LINK_CODE_PREFIX}${tokenHash}`,
      titleEn: "Secure Patient Decision Link",
      titleAr: "رابط قرار خروج آمن",
      templateKey: SECURE_LINK_TEMPLATE_KEY,
      versionLabel: "1.0",
      fileName: `secure_link_${args.caseId}.json`,
      mimeType: "application/json",
      payloadJson: payload as unknown as Prisma.InputJsonValue,
      sizeBytes: BigInt(Buffer.byteLength(JSON.stringify(payload), "utf8")),
      generatedByUserId: args.userId,
      metadata: {
        source: "web_local_secure_link_fallback",
        delivery_status: delivery.deliveryStatus,
      },
    },
  });

  await writeAuditLog({
    tenantId: args.tenantId,
    userId: args.userId,
    entityType: "secure_link",
    entityId: linkId,
    action: "secure_link_created",
    details: `Secure patient link created for ${normalizedEmail}`,
    caseId: args.caseId,
    documentId: linkId,
    metadataJson: {
      recipient_email: normalizedEmail,
      delivery_status: delivery.deliveryStatus,
      delivery_channel: delivery.deliveryChannel,
    },
    request: args.request,
  }).catch(() => undefined);

  return {
    link_id: linkId,
    url,
    expires_at: expiresAt,
    recipient_email: normalizedEmail,
    delivery_status: delivery.deliveryStatus,
    delivery_channel: delivery.deliveryChannel,
  };
}

export async function listSecureLinks(tenantId: string, caseId: string): Promise<SecureLinkRecord[]> {
  await getTenantCaseOrThrow(tenantId, caseId);

  const documents = await prisma.document.findMany({
    where: {
      tenantId,
      caseId,
      templateKey: SECURE_LINK_TEMPLATE_KEY,
    },
    orderBy: { generatedAt: "desc" },
  });

  return documents.map((document) => mapLinkRecord(parseSecureLinkPayload(document)));
}

export async function getSecureLinkDiagnostics(tenantId: string, caseId: string): Promise<Record<string, unknown>> {
  const links = await listSecureLinks(tenantId, caseId);
  const activeLinks = links.filter((item) => !item.revoked_at && new Date(item.expires_at).getTime() > Date.now());
  return {
    count: links.length,
    active_count: activeLinks.length,
    latest: links[0] ?? null,
  };
}

export async function revokeSecureLink(args: {
  tenantId: string;
  caseId: string;
  linkId: string;
  userId: string;
  request?: NextRequest;
}): Promise<void> {
  const document = await prisma.document.findFirst({
    where: {
      id: args.linkId,
      tenantId: args.tenantId,
      caseId: args.caseId,
      templateKey: SECURE_LINK_TEMPLATE_KEY,
    },
  });

  if (!document) {
    throw new ApiError(404, "Secure link not found");
  }

  const payload = parseSecureLinkPayload(document);
  if (payload.revoked_at) {
    return;
  }

  const updatedPayload: SecureLinkPayload = {
    ...payload,
    revoked_at: new Date().toISOString(),
    delivery_status: payload.delivery_status === "sent" ? "revoked" : payload.delivery_status,
  };

  await prisma.document.update({
    where: { id: document.id },
    data: {
      status: DocumentStatus.ARCHIVED,
      payloadJson: updatedPayload as unknown as Prisma.InputJsonValue,
      sizeBytes: BigInt(Buffer.byteLength(JSON.stringify(updatedPayload), "utf8")),
    },
  });

  await writeAuditLog({
    tenantId: args.tenantId,
    userId: args.userId,
    entityType: "secure_link",
    entityId: args.linkId,
    action: "secure_link_revoked",
    details: "Secure patient link revoked",
    caseId: args.caseId,
    documentId: args.linkId,
    request: args.request,
  }).catch(() => undefined);
}

export async function getPublicSecureLink(token: string): Promise<PublicSecureCase> {
  try {
    const document = await getStoredSecureLinkByToken(token);
    const payload = parseSecureLinkPayload(document);
    ensureLinkActive(payload);

    if (!payload.accessed_at) {
      const accessedAt = new Date().toISOString();
      const updatedPayload: SecureLinkPayload = { ...payload, accessed_at: accessedAt };
      await prisma.document.update({
        where: { id: document.id },
        data: {
          payloadJson: updatedPayload as unknown as Prisma.InputJsonValue,
          sizeBytes: BigInt(Buffer.byteLength(JSON.stringify(updatedPayload), "utf8")),
        },
      });
      return mapPublicCase(updatedPayload);
    }

    return mapPublicCase(payload);
  } catch (error) {
    if (error instanceof ApiError) {
      logSecureLinkPublicEvent("public_secure_link_access_rejected", {
        status: error.status,
        reason: error.message,
        secure_token_hash: computeTokenHash(token),
      });
    }
    throw error;
  }
}

export async function submitPublicSecureLinkDecision(token: string, input: DecisionInput, request?: NextRequest): Promise<SubmitDecisionResponse> {
  try {
    const document = await getStoredSecureLinkByToken(token);
    const payload = parseSecureLinkPayload(document);
    ensureLinkActive(payload);

    if (payload.decision_type && payload.decision_submitted_at) {
      return {
        hospital_name: payload.hospital_name,
        case_id: payload.case_id,
        case_reference: payload.case_reference,
        decision_type: payload.decision_type,
        typed_name: payload.decision_name || payload.patient_name || "",
        submitted_at: payload.decision_submitted_at,
        confirmation_message:
          payload.decision_type === "accept"
            ? "تم تسجيل موافقتكم على الخروج مسبقًا."
            : "تم تسجيل رفضكم للخروج مسبقًا وتوثيق الإقرار القانوني.",
      };
    }

    const decision = input.decision;
    if (decision !== "accept" && decision !== "refuse") {
      throw new ApiError(400, "decision must be accept or refuse");
    }

    const typedName = input.typed_name.trim();
    if (typedName.length < 3) {
      throw new ApiError(400, "typed_name is required");
    }

    const refusalAcknowledged = Boolean(input.refusal_acknowledged);
    if (decision === "refuse" && !refusalAcknowledged) {
      throw new ApiError(400, "refusal_acknowledged must be true for refusal decisions");
    }

    const submittedAt = new Date().toISOString();
    const signatureSource = safeString(input.signature_data)
      || `${document.id}:${typedName}:${decision}:${submittedAt}`;
    const signatureHash = computeSignatureHash(signatureSource);
    const updatedPayload: SecureLinkPayload = {
      ...payload,
      decision_type: decision,
      decision_name: typedName,
      decision_submitted_at: submittedAt,
      refusal_acknowledged: refusalAcknowledged,
      signature_hash: signatureHash,
      signature_provided: Boolean(safeString(input.signature_data)),
      accessed_at: payload.accessed_at ?? submittedAt,
    };

    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.SIGNED,
        payloadJson: updatedPayload as unknown as Prisma.InputJsonValue,
        signedAt: new Date(submittedAt),
        sizeBytes: BigInt(Buffer.byteLength(JSON.stringify(updatedPayload), "utf8")),
      },
    });

    await appendPublicDecisionAudit({
      document,
      token,
      payload: updatedPayload,
      typedName,
      decision,
      submittedAt,
      signatureProvided: updatedPayload.signature_provided ?? false,
      refusalAcknowledged,
      request,
    });

    try {
      await prisma.dischargeRefusalCase.upsert({
        where: {
          id: document.id,
        },
        update: {
          dischargeStatus: decision === "accept" ? "accepted_via_secure_link" : "refused_via_secure_link",
          signatureMethod: "SECURE_LINK",
          signatureTimestamp: new Date(submittedAt),
          signatureHash,
          signatureDevice: updatedPayload.signature_provided ? "PUBLIC_SECURE_LINK_SIGNATURE" : "PUBLIC_SECURE_LINK_NO_CANVAS",
          signatureIpAddress: null,
        },
        create: {
          id: document.id,
          tenantId: payload.tenant_id,
          caseId: payload.case_id,
          dischargeStatus: decision === "accept" ? "accepted_via_secure_link" : "refused_via_secure_link",
          signatureMethod: "SECURE_LINK",
          signatureTimestamp: new Date(submittedAt),
          signatureHash,
          signatureDevice: updatedPayload.signature_provided ? "PUBLIC_SECURE_LINK_SIGNATURE" : "PUBLIC_SECURE_LINK_NO_CANVAS",
          signatureIpAddress: null,
        },
      });
    } catch (error) {
      if (isMissingTableError(error)) {
        console.warn("secure-link: discharge_refusal_cases table missing; skipping signature mirror");
      } else {
        const existing = await prisma.dischargeRefusalCase.findFirst({
          where: {
            tenantId: payload.tenant_id,
            caseId: payload.case_id,
          },
          select: { id: true },
        }).catch((findError) => {
          if (isMissingTableError(findError)) {
            console.warn("secure-link: discharge_refusal_cases lookup skipped; table missing");
            return null;
          }
          throw findError;
        });

        if (existing) {
          await prisma.dischargeRefusalCase.update({
            where: { id: existing.id },
            data: {
              dischargeStatus: decision === "accept" ? "accepted_via_secure_link" : "refused_via_secure_link",
              signatureMethod: "SECURE_LINK",
              signatureTimestamp: new Date(submittedAt),
              signatureHash,
              signatureDevice: updatedPayload.signature_provided ? "PUBLIC_SECURE_LINK_SIGNATURE" : "PUBLIC_SECURE_LINK_NO_CANVAS",
              signatureIpAddress: null,
            },
          }).catch((updateError) => {
            if (isMissingTableError(updateError)) {
              console.warn("secure-link: discharge_refusal_cases update skipped; table missing");
              return null;
            }
            throw updateError;
          });
        }
      }
    }

    return {
    hospital_name: payload.hospital_name,
    case_id: payload.case_id,
    case_reference: payload.case_reference,
    decision_type: decision,
    typed_name: typedName,
    submitted_at: submittedAt,
    confirmation_message:
      decision === "accept"
        ? "تم تسجيل موافقتكم على الخروج بنجاح."
        : "تم تسجيل رفضكم للخروج وتوثيق الإقرار القانوني بنجاح.",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      logSecureLinkPublicEvent("public_secure_link_decision_rejected", {
        status: error.status,
        reason: error.message,
        secure_token_hash: computeTokenHash(token),
        decision: input.decision,
      });
    }
    throw error;
  }
}