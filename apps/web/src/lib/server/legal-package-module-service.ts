import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";

import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { asRecord } from "@/lib/server/compliance-utils";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { writeAuditLog } from "@/lib/server/saas-services";
import { logReportAccess } from "@/lib/server/report-access-service";
import {
  checkSignatureStatus,
  createSignatureRequest,
  downloadCertificate,
  downloadSignedDocument,
  isPdfFillerConfigured,
} from "@/lib/server/integrations/pdffiller";
import { buildArabicSigningSms, isTaqnyatConfigured, sendTaqnyatSms } from "@/lib/server/integrations/taqnyat";

const prisma = getPrisma();

export type LegalPackageStatus =
  | "DRAFT"
  | "READY_TO_GENERATE"
  | "GENERATED"
  | "SENT_FOR_SIGNATURE"
  | "SIGNED"
  | "LOCKED"
  | "COURT_READY"
  | "FAILED";

type ValidationItem = {
  key: string;
  label: string;
  passed: boolean;
  reason: string;
};

type PackageValidation = {
  canGenerate: boolean;
  missing: ValidationItem[];
  checklist: ValidationItem[];
};

type LegalPackageDocumentRecord = {
  document_type: string;
  document_version: number;
  document_hash: string;
  document_id: string;
  mime_type: string;
  file_name: string;
  generated_at: string;
};

type LegalPackageSignatureRequest = {
  signature_status: "PENDING" | "SENT" | "SIGNED" | "FAILED";
  pdffiller_document_id: string | null;
  pdffiller_signature_request_id: string | null;
  signer_mobile: string | null;
  signing_link: string | null;
  sms_sent_at: string | null;
  signed_at: string | null;
  signer_ip: string | null;
  signer_device: string | null;
  certificate_file_id: string | null;
  signed_pdf_file_id: string | null;
  external_not_configured: boolean;
  external_message: string | null;
};

type LegalPackageAuditEventRecord = {
  at: string;
  action: string;
  actor_user_id: string;
  details: string;
};

type LegalPackageState = {
  case_id: string;
  package_status: LegalPackageStatus;
  generated_at: string | null;
  generated_by: string | null;
  package_hash: string | null;
  audit_trail_reference: string | null;
  documents: LegalPackageDocumentRecord[];
  signature_request: LegalPackageSignatureRequest;
  court_bundle_document_id: string | null;
  signed_locked_at: string | null;
  audit_events: LegalPackageAuditEventRecord[];
};

type LegalPackageResponse = {
  case_id: string;
  package_status: LegalPackageStatus;
  generated_at: string | null;
  generated_by: string | null;
  package_hash: string | null;
  audit_trail_reference: string | null;
  validation: PackageValidation;
  documents: LegalPackageDocumentRecord[];
  signature_request: LegalPackageSignatureRequest;
  external_signing_message: string | null;
  can_send_for_signature: boolean;
  can_generate_court_bundle: boolean;
  signed_document_download_url: string | null;
  court_bundle_download_url: string | null;
  integration_status: {
    pdffiller_configured: boolean;
    taqnyat_configured: boolean;
  };
  compatibility: {
    version: number;
    download_url: string | null;
  };
};

const PACKAGE_METADATA_KEY = "legal_package_module";
const MAX_AUDIT_EVENTS = 100;

const TEMPLATE_FILES: Array<{ key: string; fileName: string; documentType: DocumentType }> = [
  { key: "discharge_refusal_form", fileName: "discharge-refusal.ar.html", documentType: DocumentType.DISCHARGE_REFUSAL_FORM },
  { key: "financial_responsibility_notification", fileName: "financial-notification.ar.html", documentType: DocumentType.FINANCIAL_RESPONSIBILITY_NOTICE },
  { key: "financial_undertaking", fileName: "financial-undertaking.ar.html", documentType: DocumentType.CASE_FILE },
  { key: "discharge_notification", fileName: "discharge-notification.ar.html", documentType: DocumentType.CASE_FILE },
  { key: "risk_disclosure", fileName: "risk-disclosure.ar.html", documentType: DocumentType.CASE_FILE },
  { key: "court_evidence_report", fileName: "court-evidence-report.ar.html", documentType: DocumentType.CASE_FILE },
];

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function normalizeMobile(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("0")) return `+966${digits.slice(1)}`;
  if (digits.startsWith("5")) return `+966${digits}`;
  return `+${digits}`;
}

function getString(record: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function getLegalPackageState(metadata: Prisma.JsonValue | null | undefined, caseId: string): LegalPackageState {
  const root = asRecord(metadata);
  const raw = asRecord(root?.[PACKAGE_METADATA_KEY]);
  const signatureRaw = asRecord(raw?.signature_request);
  const docsRaw = Array.isArray(raw?.documents) ? raw?.documents : [];
  const auditEventsRaw = Array.isArray(raw?.audit_events) ? raw?.audit_events : [];

  return {
    case_id: caseId,
    package_status: (getString(raw, "package_status") as LegalPackageStatus) || "DRAFT",
    generated_at: getString(raw, "generated_at") || null,
    generated_by: getString(raw, "generated_by") || null,
    package_hash: getString(raw, "package_hash") || null,
    audit_trail_reference: getString(raw, "audit_trail_reference") || null,
    documents: docsRaw
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        document_type: getString(item, "document_type"),
        document_version: Number(item.document_version || 1),
        document_hash: getString(item, "document_hash"),
        document_id: getString(item, "document_id"),
        mime_type: getString(item, "mime_type"),
        file_name: getString(item, "file_name"),
        generated_at: getString(item, "generated_at"),
      })),
    signature_request: {
      signature_status: (getString(signatureRaw, "signature_status") as LegalPackageSignatureRequest["signature_status"]) || "PENDING",
      pdffiller_document_id: getString(signatureRaw, "pdffiller_document_id") || null,
      pdffiller_signature_request_id: getString(signatureRaw, "pdffiller_signature_request_id") || null,
      signer_mobile: getString(signatureRaw, "signer_mobile") || null,
      signing_link: getString(signatureRaw, "signing_link") || null,
      sms_sent_at: getString(signatureRaw, "sms_sent_at") || null,
      signed_at: getString(signatureRaw, "signed_at") || null,
      signer_ip: getString(signatureRaw, "signer_ip") || null,
      signer_device: getString(signatureRaw, "signer_device") || null,
      certificate_file_id: getString(signatureRaw, "certificate_file_id") || null,
      signed_pdf_file_id: getString(signatureRaw, "signed_pdf_file_id") || null,
      external_not_configured: Boolean(signatureRaw?.external_not_configured),
      external_message: getString(signatureRaw, "external_message") || null,
    },
    court_bundle_document_id: getString(raw, "court_bundle_document_id") || null,
    signed_locked_at: getString(raw, "signed_locked_at") || null,
    audit_events: auditEventsRaw
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        at: getString(item, "at"),
        action: getString(item, "action"),
        actor_user_id: getString(item, "actor_user_id"),
        details: getString(item, "details"),
      })),
  };
}

function mergePackageMetadata(
  currentMetadata: Prisma.JsonValue | null | undefined,
  state: LegalPackageState,
): Prisma.InputJsonValue {
  const root = asRecord(currentMetadata) ?? {};
  return {
    ...root,
    [PACKAGE_METADATA_KEY]: state,
  } as Prisma.InputJsonValue;
}

async function getAuthorizedCase(auth: AuthContext, caseId: string) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      documents: true,
      auditLogs: true,
      auditChainEvents: true,
    },
  });

  if (!caseRecord) {
    throw new ApiError(422, "Case is not available for legal package processing");
  }

  if (caseRecord.tenantId !== auth.tenant_id) {
    throw new ApiError(403, "Case not accessible for current tenant");
  }

  return caseRecord;
}

function extractTemplateVars(caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>): Record<string, string> {
  const metadata = asRecord(caseRecord.metadata);
  const workflow = asRecord(metadata?.workflow);
  const signature = asRecord(metadata?.signature);
  const witnessRaw = Array.isArray(metadata?.witnesses) ? metadata?.witnesses : [];
  const witness1 = asRecord(witnessRaw[0]);
  const witness2 = asRecord(witnessRaw[1]);

  const patientName = caseRecord.patientName?.trim() || getString(metadata, "patient_name") || "";
  const patientId = getString(metadata, "patient_id_number", "national_id", "id_number");
  const medicalRecordNumber = caseRecord.medicalRecordNo?.trim() || getString(metadata, "medical_record_number", "mrn");
  const roomNumber = getString(metadata, "room_number", "room_no");
  const attendingPhysician = getString(workflow, "attending_physician") || getString(metadata, "attending_physician");
  const dischargeDecisionDate = getString(workflow, "discharge_decision_at", "discharge_date");
  const refusalReasons = getString(workflow, "refusal_reason") || getString(metadata, "refusal_reason") || "";
  const signerName = getString(signature, "signer_name") || patientName;
  const signerMobile = normalizeMobile(getString(metadata, "patient_mobile", "mobile", "phone_number", "contact_numbers"));
  const signerIp = getString(signature, "signer_ip");
  const signerDevice = getString(signature, "signer_device");

  return {
    patient_full_name: patientName,
    patient_id_number: patientId,
    medical_record_number: medicalRecordNumber,
    room_number: roomNumber,
    attending_physician_name: attendingPhysician,
    discharge_decision_date: dischargeDecisionDate,
    refusal_reasons: refusalReasons,
    acknowledgment_name: signerName,
    acknowledgment_id_number: patientId,
    patient_signature: getString(signature, "signature") || "",
    acknowledgment_date: new Date().toISOString().slice(0, 10),
    witness_1_signature: getString(witness1, "signature_hash") || "",
    witness_2_signature: getString(witness2, "signature_hash") || "",
    staff_name: getString(metadata, "staff_name", "updated_by_name"),
    official_stamp: getString(metadata, "official_stamp"),
    document_date: new Date().toISOString().slice(0, 10),
    document_reference: `LP-${caseRecord.id.slice(0, 8).toUpperCase()}`,
    patient_or_guardian_name: patientName,
    discharge_decision_at: dischargeDecisionDate,
    signing_mobile: signerMobile,
    signer_ip: signerIp,
    signer_device: signerDevice,
  };
}

function validateGenerationRequirements(caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>): PackageValidation {
  const metadata = asRecord(caseRecord.metadata);
  const workflow = asRecord(metadata?.workflow);
  const signature = asRecord(metadata?.signature);
  const witnesses = Array.isArray(metadata?.witnesses) ? metadata.witnesses : [];

  const auditExists = (caseRecord.auditLogs?.length || 0) > 0 || (caseRecord.auditChainEvents?.length || 0) > 0;

  const checks: ValidationItem[] = [
    {
      key: "patient_decision_documented",
      label: "Patient decision is documented",
      passed: Boolean(getString(signature, "patient_decision") || getString(workflow, "patient_decision")),
      reason: "Patient decision is missing",
    },
    {
      key: "medical_discharge_decision_exists",
      label: "Medical discharge decision exists",
      passed: Boolean(getString(workflow, "discharge_decision_at") || getString(metadata, "discharge_decision_at")),
      reason: "Medical discharge decision is missing",
    },
    {
      key: "patient_mobile_exists",
      label: "Patient mobile number exists",
      passed: Boolean(normalizeMobile(getString(metadata, "patient_mobile", "mobile", "phone_number", "contact_numbers"))),
      reason: "Patient mobile number is missing",
    },
    {
      key: "refusal_reason_exists",
      label: "Refusal reason exists",
      passed: Boolean(getString(workflow, "refusal_reason") || getString(metadata, "refusal_reason")),
      reason: "Refusal reason is missing",
    },
    {
      key: "risk_disclosure_exists",
      label: "Risk disclosure exists",
      passed: Boolean(getString(workflow, "discussion_summary") || getString(metadata, "risk_disclosure")),
      reason: "Risk disclosure is missing",
    },
    {
      key: "two_witnesses_exist",
      label: "Two witnesses exist",
      passed: witnesses.length >= 2,
      reason: "Two witnesses are required",
    },
    {
      key: "financial_responsibility_data_exists",
      label: "Financial responsibility data exists",
      passed: Boolean(getString(metadata, "insurance_coverage_status", "estimated_amount", "financial_responsibility")),
      reason: "Financial responsibility data is missing",
    },
    {
      key: "audit_trail_exists",
      label: "Audit trail exists",
      passed: auditExists,
      reason: "Audit trail is missing",
    },
  ];

  const missing = checks.filter((item) => !item.passed);
  return {
    canGenerate: missing.length === 0,
    missing,
    checklist: checks,
  };
}

async function readTemplate(fileName: string): Promise<string> {
  const templatePath = path.join(process.cwd(), "templates", "legal-package", fileName);
  return fs.readFile(templatePath, "utf8");
}

async function createDocumentRecord(args: {
  auth: AuthContext;
  caseId: string;
  documentType: DocumentType;
  templateKey: string;
  fileName: string;
  html: string;
  titleAr: string;
  titleEn: string;
  status?: DocumentStatus;
  metadata?: Record<string, unknown>;
}): Promise<LegalPackageDocumentRecord> {
  const bytes = Buffer.from(args.html, "utf8");
  const hash = sha256(bytes);
  const version = await prisma.document.count({
    where: {
      tenantId: args.auth.tenant_id!,
      caseId: args.caseId,
      templateKey: args.templateKey,
    },
  }) + 1;

  const created = await prisma.document.create({
    data: {
      tenantId: args.auth.tenant_id!,
      caseId: args.caseId,
      documentType: args.documentType,
      status: args.status || DocumentStatus.GENERATED,
      documentCode: `${args.templateKey.toUpperCase()}-${version}`,
      titleEn: args.titleEn,
      titleAr: args.titleAr,
      templateKey: args.templateKey,
      versionLabel: String(version),
      fileName: args.fileName,
      mimeType: "text/html",
      previewHtml: args.html,
      payloadJson: {
        document_hash: hash,
      } as Prisma.InputJsonValue,
      metadata: (args.metadata || {}) as Prisma.InputJsonValue,
      sizeBytes: BigInt(bytes.byteLength),
      generatedByUserId: args.auth.sub,
    },
  });

  return {
    document_type: args.templateKey,
    document_version: version,
    document_hash: hash,
    document_id: created.id,
    mime_type: created.mimeType,
    file_name: created.fileName,
    generated_at: created.generatedAt.toISOString(),
  };
}

function toExternalSigningMessage(signature: LegalPackageSignatureRequest): string | null {
  if (signature.external_message) {
    return signature.external_message;
  }
  if (signature.external_not_configured) {
    return "External signing not configured";
  }
  return null;
}

function toResponse(state: LegalPackageState, validation: PackageValidation): LegalPackageResponse {
  const courtBundleDownload = state.court_bundle_document_id
    ? `/api/cases/${state.case_id}/legal-package/court-bundle`
    : null;
  const signedDownload = state.signature_request.signed_pdf_file_id
    ? `/api/cases/${state.case_id}/legal-package/download?kind=signed`
    : null;

  return {
    case_id: state.case_id,
    package_status: state.package_status,
    generated_at: state.generated_at,
    generated_by: state.generated_by,
    package_hash: state.package_hash,
    audit_trail_reference: state.audit_trail_reference,
    validation,
    documents: state.documents,
    signature_request: state.signature_request,
    external_signing_message: toExternalSigningMessage(state.signature_request),
    can_send_for_signature: state.package_status === "GENERATED" || state.package_status === "READY_TO_GENERATE",
    can_generate_court_bundle: state.package_status === "SIGNED" || state.package_status === "LOCKED" || state.package_status === "COURT_READY",
    signed_document_download_url: signedDownload,
    court_bundle_download_url: courtBundleDownload,
    integration_status: {
      pdffiller_configured: isPdfFillerConfigured(),
      taqnyat_configured: isTaqnyatConfigured(),
    },
    compatibility: {
      version: state.documents.length,
      download_url: `/api/cases/${state.case_id}/legal-package/download`,
    },
  };
}

async function persistState(args: {
  auth: AuthContext;
  caseId: string;
  currentMetadata: Prisma.JsonValue | null;
  state: LegalPackageState;
}): Promise<void> {
  await prisma.case.update({
    where: { id: args.caseId },
    data: {
      metadata: mergePackageMetadata(args.currentMetadata, args.state),
      updatedByUserId: args.auth.sub,
    },
  });
}

async function appendPackageAudit(args: {
  auth: AuthContext;
  caseId: string;
  action: string;
  details: string;
  request?: NextRequest;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await writeAuditLog({
    tenantId: args.auth.tenant_id!,
    userId: args.auth.sub,
    entityType: "legal_package_module",
    entityId: args.caseId,
    action: args.action,
    details: args.details,
    caseId: args.caseId,
    metadataJson: (args.metadata || {}) as Prisma.InputJsonValue,
    request: args.request,
  });

  await appendAuditChainEvent({
    tenantId: args.auth.tenant_id!,
    caseId: args.caseId,
    eventType: "LEGAL_PACKAGE_MODULE_EVENT",
    actorId: args.auth.sub,
    actorRole: args.auth.role ?? null,
    payloadSummary: `${args.action}: ${args.details}`,
    metadataJson: args.metadata || {},
    request: args.request,
  }).catch(() => undefined);
}

export async function getLegalPackageModule(auth: AuthContext, caseId: string): Promise<LegalPackageResponse> {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  const validation = validateGenerationRequirements(caseRecord);
  const state = getLegalPackageState(caseRecord.metadata, caseId);

  return toResponse(state, validation);
}

export async function generateLegalPackageModule(auth: AuthContext, caseId: string, request?: NextRequest): Promise<LegalPackageResponse> {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  const validation = validateGenerationRequirements(caseRecord);
  const nowIso = new Date().toISOString();

  let state = getLegalPackageState(caseRecord.metadata, caseId);
  if (state.package_status === "LOCKED" || state.package_status === "COURT_READY") {
    throw new ApiError(409, "Signed package is immutable");
  }

  if (!validation.canGenerate) {
    state = {
      ...state,
      package_status: "DRAFT",
      audit_events: [
        {
          at: nowIso,
          action: "generation_blocked",
          actor_user_id: auth.sub,
          details: "Generation blocked by missing readiness requirements",
        },
        ...state.audit_events,
      ].slice(0, MAX_AUDIT_EVENTS),
    };

    await persistState({ auth, caseId, currentMetadata: caseRecord.metadata, state });
    await appendPackageAudit({
      auth,
      caseId,
      action: "legal_package_generation_blocked",
      details: "Missing requirements prevent legal package generation",
      request,
      metadata: {
        missing: validation.missing.map((item) => item.key),
      },
    });

    return toResponse(state, validation);
  }

  const vars = extractTemplateVars(caseRecord);
  const generatedDocs: LegalPackageDocumentRecord[] = [];

  for (const template of TEMPLATE_FILES) {
    const templateHtml = await readTemplate(template.fileName);
    const rendered = interpolateTemplate(templateHtml, vars);
    const created = await createDocumentRecord({
      auth,
      caseId,
      documentType: template.documentType,
      templateKey: `legal_package_${template.key}`,
      fileName: `${template.key}-${caseId}.html`,
      html: rendered,
      titleAr: "مستند ضمن الحزمة القانونية",
      titleEn: "Legal package document",
      status: DocumentStatus.GENERATED,
      metadata: {
        legal_package_case_id: caseId,
        legal_package_document_type: template.key,
      },
    });
    generatedDocs.push(created);
  }

  const packageHash = sha256(generatedDocs.map((doc) => doc.document_hash).join("|"));

  state = {
    ...state,
    package_status: "GENERATED",
    generated_at: nowIso,
    generated_by: auth.sub,
    package_hash: packageHash,
    audit_trail_reference: `case:${caseId}:legal_package:${Date.now()}`,
    documents: generatedDocs,
    signature_request: {
      ...state.signature_request,
      external_not_configured: false,
      external_message: null,
      signature_status: "PENDING",
      signed_at: null,
      signed_pdf_file_id: null,
      certificate_file_id: null,
    },
    audit_events: [
      {
        at: nowIso,
        action: "generated",
        actor_user_id: auth.sub,
        details: "Legal package documents generated",
      },
      ...state.audit_events,
    ].slice(0, MAX_AUDIT_EVENTS),
  };

  await persistState({ auth, caseId, currentMetadata: caseRecord.metadata, state });
  await appendPackageAudit({
    auth,
    caseId,
    action: "legal_package_generated",
    details: "Legal package generated",
    request,
    metadata: {
      package_hash: packageHash,
      documents: generatedDocs.length,
    },
  });

  await logReportAccess({
    tenantId: auth.tenant_id!,
    caseId,
    reportKey: "legal_package_module_generate",
    exportFormat: "HTML",
    accessedByUserId: auth.sub,
    accessedByRole: auth.role ?? null,
    request,
    metadataJson: {
      package_hash: packageHash,
      documents: generatedDocs.length,
    },
  }).catch(() => undefined);

  return toResponse(state, validation);
}

export async function sendLegalPackageForSignature(auth: AuthContext, caseId: string, request?: NextRequest): Promise<LegalPackageResponse> {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  const validation = validateGenerationRequirements(caseRecord);
  let state = getLegalPackageState(caseRecord.metadata, caseId);

  if (state.package_status !== "GENERATED" && state.package_status !== "READY_TO_GENERATE") {
    throw new ApiError(409, "Package must be generated before sending for signature");
  }

  const vars = extractTemplateVars(caseRecord);
  const nowIso = new Date().toISOString();

  if (!isPdfFillerConfigured()) {
    state = {
      ...state,
      package_status: "GENERATED",
      signature_request: {
        ...state.signature_request,
        external_not_configured: true,
        external_message: "External signing not configured",
        signature_status: "FAILED",
      },
      audit_events: [
        {
          at: nowIso,
          action: "signature_not_configured",
          actor_user_id: auth.sub,
          details: "PDFfiller not configured; generation continues with manual download",
        },
        ...state.audit_events,
      ].slice(0, MAX_AUDIT_EVENTS),
    };

    await persistState({ auth, caseId, currentMetadata: caseRecord.metadata, state });
    await appendPackageAudit({
      auth,
      caseId,
      action: "legal_package_signature_not_configured",
      details: "External signing not configured",
      request,
    });

    return toResponse(state, validation);
  }

  const primaryDoc = state.documents.find((doc) => doc.document_type === "legal_package_discharge_refusal_form") || state.documents[0];
  if (!primaryDoc) {
    throw new ApiError(400, "No generated legal package document available for signature");
  }

  const callbackBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const callbackUrl = callbackBase
    ? `${callbackBase.replace(/\/$/, "")}/api/webhooks/pdffiller/signature-completed`
    : undefined;

  const requestPayload = await createSignatureRequest({
    documentId: process.env.PDFFILLER_TEMPLATE_DISCHARGE_REFUSAL_ID?.trim() || primaryDoc.document_id,
    recipient: {
      name: vars.acknowledgment_name || vars.patient_full_name || "Patient",
      phone: vars.signing_mobile || undefined,
    },
    callbackUrl,
    metadata: {
      case_id: caseId,
      package_hash: state.package_hash,
    },
  });

  const signatureRequestId = String(requestPayload.id || "");
  const signingLink = String(requestPayload.signing_link || "");

  let smsSentAt: string | null = null;
  if (signingLink && vars.signing_mobile && isTaqnyatConfigured()) {
    const smsMessage = buildArabicSigningSms(signingLink);
    const smsResult = await sendTaqnyatSms({
      mobile: vars.signing_mobile,
      message: smsMessage,
    });

    if (smsResult.success) {
      smsSentAt = nowIso;
    }
  }

  state = {
    ...state,
    package_status: "SENT_FOR_SIGNATURE",
    signature_request: {
      ...state.signature_request,
      signature_status: "SENT",
      pdffiller_document_id: String(requestPayload.document_id || primaryDoc.document_id),
      pdffiller_signature_request_id: signatureRequestId || null,
      signer_mobile: vars.signing_mobile || null,
      signing_link: signingLink || null,
      sms_sent_at: smsSentAt,
      external_not_configured: false,
      external_message: !signingLink
        ? "تم إنشاء طلب التوقيع، ولكن لم يتم إرجاع رابط مباشر من PDFfiller. يرجى فتح الطلب من حساب PDFfiller."
        : !isTaqnyatConfigured()
          ? "تم إنشاء رابط التوقيع بنجاح. لم يتم إرسال SMS لأن خدمة تقنيات غير مفعلة."
          : null,
    },
    audit_events: [
      {
        at: nowIso,
        action: "sent_for_signature",
        actor_user_id: auth.sub,
        details: "Sent to PDFfiller for signature",
      },
      ...state.audit_events,
    ].slice(0, MAX_AUDIT_EVENTS),
  };

  await persistState({ auth, caseId, currentMetadata: caseRecord.metadata, state });
  await appendPackageAudit({
    auth,
    caseId,
    action: "legal_package_sent_for_signature",
    details: "Legal package sent for signature",
    request,
    metadata: {
      signature_request_id: state.signature_request.pdffiller_signature_request_id,
      sms_sent_at: smsSentAt,
    },
  });

  return toResponse(state, validation);
}

export async function refreshLegalPackageSignatureStatus(auth: AuthContext, caseId: string, request?: NextRequest): Promise<LegalPackageResponse> {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  const validation = validateGenerationRequirements(caseRecord);
  let state = getLegalPackageState(caseRecord.metadata, caseId);

  const signatureRequestId = state.signature_request.pdffiller_signature_request_id;
  if (!signatureRequestId || !isPdfFillerConfigured()) {
    return toResponse(state, validation);
  }

  const statusPayload = await checkSignatureStatus(signatureRequestId);
  const statusRaw = String(statusPayload.status || "").toLowerCase();
  const nowIso = new Date().toISOString();

  if (!["completed", "signed"].includes(statusRaw)) {
    return toResponse(state, validation);
  }

  const signedPdfBuffer = await downloadSignedDocument(signatureRequestId);
  const certificateBuffer = await downloadCertificate(signatureRequestId);

  const signedHash = sha256(signedPdfBuffer);
  const certificateHash = sha256(certificateBuffer);

  const signedDoc = await prisma.document.create({
    data: {
      tenantId: auth.tenant_id!,
      caseId,
      documentType: DocumentType.CASE_FILE,
      status: DocumentStatus.SIGNED,
      documentCode: `LEGAL-PACKAGE-SIGNED-${Date.now()}`,
      titleEn: "Signed legal package document",
      titleAr: "نسخة الحزمة القانونية الموقعة",
      templateKey: "legal_package_signed_pdf",
      versionLabel: "1",
      fileName: `legal-package-signed-${caseId}.pdf`,
      mimeType: "application/pdf",
      payloadJson: {
        source: "pdffiller",
        sha256: signedHash,
      } as Prisma.InputJsonValue,
      metadata: {
        content_base64: signedPdfBuffer.toString("base64"),
      } as Prisma.InputJsonValue,
      sizeBytes: BigInt(signedPdfBuffer.byteLength),
      generatedByUserId: auth.sub,
      signedByUserId: auth.sub,
      signedAt: new Date(nowIso),
    },
  });

  const certDoc = await prisma.document.create({
    data: {
      tenantId: auth.tenant_id!,
      caseId,
      documentType: DocumentType.CASE_FILE,
      status: DocumentStatus.ARCHIVED,
      documentCode: `LEGAL-PACKAGE-CERT-${Date.now()}`,
      titleEn: "Signature certificate",
      titleAr: "شهادة التوقيع",
      templateKey: "legal_package_signature_certificate",
      versionLabel: "1",
      fileName: `legal-package-certificate-${caseId}.pdf`,
      mimeType: "application/pdf",
      payloadJson: {
        source: "pdffiller",
        sha256: certificateHash,
      } as Prisma.InputJsonValue,
      metadata: {
        content_base64: certificateBuffer.toString("base64"),
      } as Prisma.InputJsonValue,
      sizeBytes: BigInt(certificateBuffer.byteLength),
      generatedByUserId: auth.sub,
    },
  });

  state = {
    ...state,
    package_status: "SIGNED",
    signature_request: {
      ...state.signature_request,
      signature_status: "SIGNED",
      signed_at: nowIso,
      signed_pdf_file_id: signedDoc.id,
      certificate_file_id: certDoc.id,
      signer_ip: getString(asRecord(statusPayload), "signer_ip") || state.signature_request.signer_ip,
      signer_device: getString(asRecord(statusPayload), "signer_device") || state.signature_request.signer_device,
    },
    signed_locked_at: nowIso,
    audit_events: [
      {
        at: nowIso,
        action: "signature_completed",
        actor_user_id: auth.sub,
        details: "Signed package imported from PDFfiller",
      },
      ...state.audit_events,
    ].slice(0, MAX_AUDIT_EVENTS),
  };

  await persistState({ auth, caseId, currentMetadata: caseRecord.metadata, state });
  await appendPackageAudit({
    auth,
    caseId,
    action: "legal_package_signed",
    details: "Signed legal package imported and locked",
    request,
    metadata: {
      signed_pdf_file_id: signedDoc.id,
      certificate_file_id: certDoc.id,
    },
  });

  return toResponse(state, validation);
}

export async function generateCourtBundle(auth: AuthContext, caseId: string, request?: NextRequest): Promise<LegalPackageResponse> {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  const validation = validateGenerationRequirements(caseRecord);
  let state = getLegalPackageState(caseRecord.metadata, caseId);

  if (state.package_status !== "SIGNED" && state.package_status !== "LOCKED" && state.package_status !== "COURT_READY") {
    throw new ApiError(409, "Signed package is required before generating court bundle");
  }

  const nowIso = new Date().toISOString();
  const indexLines = [
    "Court Evidence Package index",
    `Case ID: ${caseId}`,
    `Generated At: ${nowIso}`,
    "1. Case summary",
    "2. Timeline of events",
    "3. Medical discharge decision",
    "4. Refusal declaration",
    "5. Financial undertaking",
    "6. Notification evidence",
    "7. Risk disclosure",
    "8. Witness record",
    "9. SMS delivery log",
    "10. Signature certificate",
    "11. Signed PDF documents",
    "12. Hash verification sheet",
    `Package Hash: ${state.package_hash || "N/A"}`,
  ];

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Court Evidence Package index</title><style>body{font-family:Arial,sans-serif;margin:24px;} li{margin:6px 0;} pre{background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;}</style></head><body><h1>Court Evidence Package index</h1><ol>${indexLines.slice(3, 15).map((line) => `<li>${line.replace(/^\d+\.\s*/, "")}</li>`).join("")}</ol><pre>${indexLines.join("\n")}</pre></body></html>`;

  const courtDoc = await createDocumentRecord({
    auth,
    caseId,
    documentType: DocumentType.CASE_FILE,
    templateKey: "legal_package_court_bundle_index",
    fileName: `court-evidence-index-${caseId}.html`,
    html,
    titleAr: "فهرس ملف المحكمة",
    titleEn: "Court evidence package index",
    status: DocumentStatus.ARCHIVED,
    metadata: {
      package_hash: state.package_hash,
      signed_pdf_file_id: state.signature_request.signed_pdf_file_id,
      certificate_file_id: state.signature_request.certificate_file_id,
    },
  });

  state = {
    ...state,
    package_status: "COURT_READY",
    court_bundle_document_id: courtDoc.document_id,
    audit_events: [
      {
        at: nowIso,
        action: "court_bundle_generated",
        actor_user_id: auth.sub,
        details: "Court evidence package index generated",
      },
      ...state.audit_events,
    ].slice(0, MAX_AUDIT_EVENTS),
  };

  await persistState({ auth, caseId, currentMetadata: caseRecord.metadata, state });
  await appendPackageAudit({
    auth,
    caseId,
    action: "legal_package_court_bundle_generated",
    details: "Court bundle generated",
    request,
    metadata: {
      court_bundle_document_id: courtDoc.document_id,
    },
  });

  return toResponse(state, validation);
}

async function getDocumentById(auth: AuthContext, caseId: string, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId: auth.tenant_id!,
      caseId,
    },
  });

  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  return document;
}

export async function downloadLegalPackageArtifact(
  auth: AuthContext,
  caseId: string,
  kind: "package" | "signed" | "court" = "package",
): Promise<{ fileName: string; mimeType: string; data: Buffer }> {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  const state = getLegalPackageState(caseRecord.metadata, caseId);

  if (kind === "signed") {
    if (!state.signature_request.signed_pdf_file_id) {
      throw new ApiError(404, "Signed package is not available");
    }

    const signedDoc = await getDocumentById(auth, caseId, state.signature_request.signed_pdf_file_id);
    const metadata = asRecord(signedDoc.metadata);
    const base64 = getString(metadata, "content_base64");
    if (!base64) {
      throw new ApiError(404, "Signed document content is missing");
    }

    return {
      fileName: signedDoc.fileName,
      mimeType: signedDoc.mimeType,
      data: Buffer.from(base64, "base64"),
    };
  }

  if (kind === "court") {
    if (!state.court_bundle_document_id) {
      throw new ApiError(404, "Court bundle is not available");
    }
    const courtDoc = await getDocumentById(auth, caseId, state.court_bundle_document_id);
    return {
      fileName: courtDoc.fileName,
      mimeType: courtDoc.mimeType,
      data: Buffer.from(courtDoc.previewHtml || "", "utf8"),
    };
  }

  if (!state.documents.length) {
    throw new ApiError(404, "Package documents are not available");
  }

  const packageData = {
    case_id: state.case_id,
    package_status: state.package_status,
    package_hash: state.package_hash,
    generated_at: state.generated_at,
    documents: state.documents,
    signature_request: state.signature_request,
  };

  return {
    fileName: `legal-package-${caseId}.json`,
    mimeType: "application/json",
    data: Buffer.from(JSON.stringify(packageData, null, 2), "utf8"),
  };
}

export async function processPdfFillerSignatureWebhook(payload: Record<string, unknown>): Promise<void> {
  const caseId = getString(payload, "case_id") || getString(asRecord(payload.metadata), "case_id");
  if (!caseId) {
    return;
  }

  const systemAuth: AuthContext = {
    sub: "system",
    role: "system",
    email: undefined,
    tenant_id: undefined,
  };

  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { documents: true, auditLogs: true, auditChainEvents: true },
  });

  if (!caseRecord?.tenantId) {
    return;
  }

  const auth: AuthContext = {
    ...systemAuth,
    tenant_id: caseRecord.tenantId,
  };

  await refreshLegalPackageSignatureStatus(auth, caseId);
}
