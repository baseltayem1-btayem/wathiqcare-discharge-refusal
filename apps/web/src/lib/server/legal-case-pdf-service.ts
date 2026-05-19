import crypto from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { DocumentStatus, DocumentType } from "@/lib/server/prisma-enums";
import type { NextRequest } from "next/server";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import QRCode from "qrcode";
import type { Browser, LaunchOptions } from "puppeteer";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { canonicalizeUserRole } from "@/lib/server/roles";
import { writeAuditLog } from "@/lib/server/saas-services";
import { getLegalReadiness } from "@/lib/server/legal-readiness-service";
import { asRecord, readBoolean, readString } from "@/lib/server/compliance-utils";
import { getTenantBrandingProfile } from "@/lib/server/tenantBrandingStore";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { logReportAccess } from "@/lib/server/report-access-service";
import { evaluateWitnessIntegrity } from "@/lib/server/witness-integrity-service";
import { logRuntimeIncident, recordRuntimeMetric } from "@/lib/server/runtime-observability";

const prisma = () => getPrisma();
let sharedPdfBrowserPromise: Promise<Browser> | null = null;

const PDF_TEMPLATE_VERSION = "1.0.0";
const CASE_PDF_TEMPLATE_KEY = "legal_case_pdf";
const SYSTEM_LABEL = "IMC Clinical System";
const IMC_LOGO_URL = "https://www.imc.med.sa/images/logo.jpg";

type PdfRuntimeTarget = "local_windows" | "preview" | "production" | "local_other";

type GenerateTrigger =
  | "manual_generate"
  | "manual_regenerate"
  | "auto_ready_for_legal"
  | "auto_escalated"
  | "auto_closed";

type CasePdfChecklistItem = {
  key: string;
  label: string;
  required: boolean;
  satisfied: boolean;
  reason: string;
};

export type CasePdfValidationResult = {
  canFinalize: boolean;
  checklist: CasePdfChecklistItem[];
  missingRequired: string[];
};

export type CasePdfVersionSummary = {
  id: string;
  version: number;
  fileName: string;
  generatedAt: string;
  status: "draft" | "final" | "failed";
  isFinal: boolean;
  templateVersion: string;
  language: string;
  mimeType: string;
  fileSize: number;
  sha256Hash: string | null;
  generatedBy: string | null;
  binaryAvailable: boolean;
  recoveryRequired: boolean;
  recoveryMessage: string | null;
};

function detectPdfRuntimeTarget(): PdfRuntimeTarget {
  if (process.env.VERCEL === "1") {
    const vercelEnvironment = (process.env.VERCEL_ENV || process.env.VERCEL_TARGET_ENV || "preview").trim().toLowerCase();
    return vercelEnvironment === "production" ? "production" : "preview";
  }

  if (process.platform === "win32") {
    return "local_windows";
  }

  return process.env.NODE_ENV === "production" ? "production" : "local_other";
}

function getConfiguredPuppeteerExecutablePath(runtimeTarget = detectPdfRuntimeTarget()): string | null {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (!configuredPath) {
    return null;
  }

  if (runtimeTarget === "preview") {
    return null;
  }

  if (runtimeTarget === "production") {
    if (!path.isAbsolute(configuredPath)) {
      return null;
    }
    if (/^[A-Za-z]:\\/.test(configuredPath)) {
      return null;
    }
    return existsSync(configuredPath) ? configuredPath : null;
  }

  if (runtimeTarget === "local_windows") {
    return /^[A-Za-z]:\\/.test(configuredPath) && existsSync(configuredPath) ? configuredPath : null;
  }

  return path.isAbsolute(configuredPath) && existsSync(configuredPath) ? configuredPath : null;
}

export type GeneratedCasePdfResult = {
  report: CasePdfVersionSummary;
  validation: CasePdfValidationResult;
  previewUrl: string;
  downloadUrl: string;
};

export type LatestCasePdfResponse = {
  latest: CasePdfVersionSummary | null;
  latestValid: CasePdfVersionSummary | null;
  latestKnown: CasePdfVersionSummary | null;
  fallbackApplied: boolean;
  forceRegenerateRequired: boolean;
  validation: CasePdfValidationResult;
};

type PdfBinaryAvailability = {
  available: boolean;
  reason: "db_inline_payload_missing" | "db_inline_payload_empty" | "local_file_missing" | null;
};

type PersistedPdfBinary = {
  storagePath: string;
  payloadJson: JsonInputObject;
  cleanup: (() => Promise<void>) | null;
};

type AuthoritativeCaseFacts = {
  treatingPhysician: string | null;
  dischargeDecisionAt: string | null;
  refusalStartedAt: string | null;
  incidentTimestamp: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function logCasePdfLifecycle(event: string, data: Record<string, unknown>): void {
  const payload = {
    timestamp: nowIso(),
    component: "legal_case_pdf",
    event,
    ...data,
  };

  console.info(JSON.stringify(payload));
}

function hashSha256(value: string | Buffer | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getPdfBinaryStorageMode(): "db_inline" | "local_file" {
  const mode = String(process.env.PDF_BINARY_STORAGE_MODE || "db_inline")
    .trim()
    .toLowerCase();
  return mode === "local_file" ? "local_file" : "db_inline";
}

function getPdfLocalStorageRoot(): string {
  const configured =
    process.env.PDF_STORAGE_ROOT || process.env.DOCUMENT_STORAGE_ROOT || process.env.STORAGE_ROOT;

  if (configured && configured.trim()) {
    return path.resolve(configured.trim());
  }

  return path.resolve(process.cwd(), ".pdf-storage");
}

function getRelativeLocalPdfPath(args: { tenantId: string; caseId: string; version: number; fileName: string }): string {
  const safeFileName = args.fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(args.tenantId, args.caseId, `v${args.version}`, safeFileName).replace(/\\/g, "/");
}

function resolveLocalPdfPath(storagePath: string): string | null {
  const normalized = storagePath.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("local://")) {
    const relativePath = normalized.slice("local://".length).replace(/^\/+/, "");
    return path.resolve(getPdfLocalStorageRoot(), relativePath);
  }

  if (normalized.startsWith("file://")) {
    return path.resolve(normalized.slice("file://".length));
  }

  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  return null;
}

function getInlinePdfBase64(payload: Record<string, unknown> | null | undefined): string | null {
  return readString(payload, "pdf_base64", "pdfBase64", "binary_base64", "binaryBase64");
}

async function getDocumentBinaryAvailability(document: {
  storagePath: string | null;
  payloadJson: Prisma.JsonValue | null;
}): Promise<PdfBinaryAvailability> {
  const payload = asRecord(document.payloadJson);
  const inlineBase64 = getInlinePdfBase64(payload);

  if (document.storagePath?.startsWith("local://") || document.storagePath?.startsWith("file://")) {
    const absolutePath = resolveLocalPdfPath(document.storagePath);
    if (!absolutePath) {
      return { available: false, reason: "local_file_missing" };
    }

    try {
      const stat = await fs.stat(absolutePath);
      if (stat.isFile() && stat.size > 0) {
        return { available: true, reason: null };
      }
      return { available: false, reason: "local_file_missing" };
    } catch {
      return { available: false, reason: "local_file_missing" };
    }
  }

  if (document.storagePath?.startsWith("db-inline://") || !document.storagePath) {
    if (!inlineBase64) {
      return { available: false, reason: "db_inline_payload_missing" };
    }
    if (!inlineBase64.trim()) {
      return { available: false, reason: "db_inline_payload_empty" };
    }
    return { available: true, reason: null };
  }

  if (inlineBase64 && inlineBase64.trim()) {
    return { available: true, reason: null };
  }

  return { available: false, reason: "db_inline_payload_missing" };
}

async function persistPdfBinary(args: {
  tenantId: string;
  caseId: string;
  version: number;
  fileName: string;
  pdfBuffer: Buffer;
  reportPayload: Record<string, unknown>;
}): Promise<PersistedPdfBinary> {
  const storageMode = getPdfBinaryStorageMode();
  const environment = process.env.NODE_ENV === "production" ? "prod" : "dev";

  if (storageMode === "local_file") {
    if (process.env.VERCEL === "1" || process.env.NEXT_RUNTIME === "edge") {
      throw new Error(
        "Local disk PDF storage is not allowed on Vercel/edge runtime. Configure external object storage (S3/blob).",
      );
    }

    const relativePath = getRelativeLocalPdfPath(args);
    const absolutePath = path.resolve(getPdfLocalStorageRoot(), relativePath);

    logCasePdfLifecycle("binary_write_started", {
      tenantId: args.tenantId,
      caseId: args.caseId,
      version: args.version,
      storageMode,
      filePath: relativePath,
      absolutePath,
      environment,
    });

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, args.pdfBuffer);

    // Critical write verification: fail fast before metadata can be persisted.
    const fileExists = existsSync(absolutePath);
    if (!fileExists) {
      throw new Error(`PDF storage write verification failed at exists check: ${absolutePath}`);
    }

    const stat = await fs.stat(absolutePath);
    if (!stat.isFile() || stat.size <= 0) {
      throw new Error(`PDF storage write verification failed at size check: ${absolutePath}`);
    }

    try {
      const readBack = await fs.readFile(absolutePath);
      if (readBack.byteLength <= 0) {
        throw new Error(`PDF storage read-after-write returned empty file: ${absolutePath}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PDF storage read-after-write failed: ${message}`);
    }

    logCasePdfLifecycle("binary_write_verified", {
      tenantId: args.tenantId,
      caseId: args.caseId,
      version: args.version,
      storageMode,
      filePath: relativePath,
      absolutePath,
      environment,
      sizeBytes: stat.size,
    });

    return {
      storagePath: `local://${relativePath}`,
      payloadJson: {
        report_payload: args.reportPayload as JsonInputValue,
        binary_storage_mode: "local_file",
        binary_storage_key: `local://${relativePath}`,
      },
      cleanup: async () => {
        await fs.rm(absolutePath, { force: true });
      },
    };
  }

  const base64 = Buffer.from(args.pdfBuffer).toString("base64");
  if (!base64) {
    throw new Error("PDF base64 encoding failed");
  }

  return {
    storagePath: "db-inline://payload",
    payloadJson: {
      report_payload: args.reportPayload as JsonInputValue,
      pdf_base64: base64,
      binary_storage_mode: "db_inline",
    },
    cleanup: null,
  };
}

function formatDateForFileName(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderValue(value: string | null | undefined, fallback = "N/A"): string {
  const normalized = (value || "").trim();
  return normalized || fallback;
}

function parseNumericVersion(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPdfReportDocument(document: { templateKey: string; mimeType: string }): boolean {
  return document.templateKey === CASE_PDF_TEMPLATE_KEY && document.mimeType === "application/pdf";
}

async function getAuthorizedCase(auth: AuthContext, caseId: string) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const caseRecord = await prisma().case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
          metadata: true,
        },
      },
      documents: {
        orderBy: { generatedAt: "desc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: {
            select: {
              fullName: true,
              role: true,
            },
          },
        },
      },
      dischargeRefusalCases: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!caseRecord) {
    throw new ApiError(404, "Case not found");
  }

  return caseRecord;
}

function canAccessCasePdf(auth: AuthContext, caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>): boolean {
  const role = canonicalizeUserRole(auth.role);
  const adminLikeRoles = new Set(["tenant_owner", "tenant_admin", "legal_admin", "quality", "compliance"]);

  if (auth.user_type === "platform_admin") {
    return true;
  }

  if (adminLikeRoles.has(role)) {
    return true;
  }

  if (role === "doctor" || role === "medical_director") {
    const metadata = asRecord(caseRecord.metadata);
    const workflow = asRecord(metadata?.workflow);
    const attendingPhysicianId = readString(workflow, "attending_physician_id");
    if (!attendingPhysicianId || attendingPhysicianId === auth.sub) {
      return true;
    }
  }

  return false;
}

function ensureCasePdfAccess(auth: AuthContext, caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>): void {
  if (!canAccessCasePdf(auth, caseRecord)) {
    throw new ApiError(403, "Unauthorized to access legal case PDF reports");
  }
}

function buildValidation(caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>): CasePdfValidationResult {
  const metadata = asRecord(caseRecord.metadata);
  const workflow = asRecord(metadata?.workflow);
  const presentation = asRecord(metadata?.presentation);
  const signature = asRecord(metadata?.signature);

  const authoritative = getAuthoritativeCaseFacts(caseRecord);

  const patientMrn = caseRecord.medicalRecordNo || readString(metadata, "medical_record_number");
  const diagnosisSummary =
    readString(workflow, "icd_code", "icd11_code", "diagnosis_summary") ||
    readString(workflow, "discussion_summary", "refusal_reason") ||
    readString(metadata, "icd_code", "icd11_code", "diagnosis_summary", "discussion_summary") ||
    caseRecord.title ||
    null;
  const patientDecision = readString(signature, "outcome");
  const riskDisclosure =
    readBoolean(presentation, "risks_explained") ||
    Boolean(readString(workflow, "discussion_summary")) ||
    Boolean(readString(metadata, "discussion_summary"));
  const witnessIntegrity = evaluateWitnessIntegrity(caseRecord.metadata);
  const hasAuditSummary = caseRecord.auditLogs.length > 0;

  const checklist: CasePdfChecklistItem[] = [
    {
      key: "case_id",
      label: "Case ID",
      required: true,
      satisfied: Boolean(caseRecord.id),
      reason: caseRecord.id ? "Available" : "Missing case identifier",
    },
    {
      key: "patient_mrn",
      label: "Patient MRN",
      required: true,
      satisfied: Boolean(patientMrn),
      reason: patientMrn ? "Available" : "Missing patient MRN",
    },
    {
      key: "treating_physician",
      label: "Treating physician",
      required: true,
      satisfied: Boolean(authoritative.treatingPhysician),
      reason: authoritative.treatingPhysician ? "Available" : "Missing treating physician",
    },
    {
      key: "diagnosis_summary",
      label: "Diagnosis (ICD)",
      required: true,
      satisfied: Boolean(diagnosisSummary),
      reason: diagnosisSummary ? "Available" : "Missing diagnosis (ICD)",
    },
    {
      key: "incident_timestamp",
      label: "Incident timestamp",
      required: true,
      satisfied: Boolean(authoritative.incidentTimestamp),
      reason: authoritative.incidentTimestamp ? "Available" : "Missing refusal/incident timestamp",
    },
    {
      key: "discharge_decision",
      label: "Decision",
      required: true,
      satisfied: Boolean(authoritative.dischargeDecisionAt),
      reason: authoritative.dischargeDecisionAt ? "Available" : "Missing discharge decision",
    },
    {
      key: "patient_decision",
      label: "Patient decision",
      required: true,
      satisfied: Boolean(patientDecision),
      reason: patientDecision ? "Available" : "Missing patient decision",
    },
    {
      key: "risk_disclosure",
      label: "Risk disclosure",
      required: true,
      satisfied: Boolean(riskDisclosure),
      reason: riskDisclosure ? "Available" : "Missing risk disclosure record",
    },
    {
      key: "minimum_witnesses_requirement",
      label: "Minimum witnesses requirement not met",
      required: true,
      satisfied: witnessIntegrity.minimumWitnessesMet,
      reason: witnessIntegrity.minimumWitnessesMet
        ? `Captured (${witnessIntegrity.witnessCount})`
        : "At least two legally valid witnesses are required",
    },
    {
      key: "witness_identity_verified",
      label: "Witness identity not verified",
      required: true,
      satisfied: witnessIntegrity.identityVerified,
      reason: witnessIntegrity.identityVerified
        ? "Witness identities are verified"
        : "Witness identity verification failed",
    },
    {
      key: "witness_roles_compliant",
      label: "Witness roles not compliant",
      required: true,
      satisfied: witnessIntegrity.roleCompositionValid,
      reason: witnessIntegrity.roleCompositionValid
        ? "Clinical and non-clinical witnesses are present"
        : "Witness composition must include one clinical and one non-clinical witness",
    },
    {
      key: "witness_attestation_complete",
      label: "Witness attestation incomplete",
      required: true,
      satisfied: witnessIntegrity.attestationComplete,
      reason: witnessIntegrity.attestationComplete
        ? "Attestation evidence is complete"
        : "Witness attestation evidence is incomplete",
    },
    {
      key: "audit_summary",
      label: "Audit summary",
      required: true,
      satisfied: hasAuditSummary,
      reason: hasAuditSummary ? "Available" : "No audit events available",
    },
  ];

  const missingRequired = checklist.filter((item) => item.required && !item.satisfied).map((item) => item.label);

  return {
    canFinalize: missingRequired.length === 0,
    checklist,
    missingRequired,
  };
}

function getAuthoritativeCaseFacts(caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>): AuthoritativeCaseFacts {
  const metadata = asRecord(caseRecord.metadata);
  const workflow = asRecord(metadata?.workflow);
  const signature = asRecord(metadata?.signature);

  const treatingPhysician =
    readString(workflow, "attending_physician") ||
    readString(metadata, "attending_physician", "doctor_name") ||
    null;

  const dischargeDecisionAt =
    readString(workflow, "discharge_decision_at") ||
    readString(metadata, "discharge_decision_at") ||
    readString(signature, "recorded_at") ||
    null;

  const refusalStartedAt =
    readString(workflow, "refusal_started_at") || readString(metadata, "refusal_started_at") || null;

  return {
    treatingPhysician,
    dischargeDecisionAt,
    refusalStartedAt,
    incidentTimestamp: refusalStartedAt || dischargeDecisionAt,
  };
}

function summarizeCaseStatus(caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>): string {
  const metadata = asRecord(caseRecord.metadata);
  const workflow = asRecord(metadata?.workflow);
  return (
    readString(workflow, "case_status") ||
    readString(workflow, "status") ||
    caseRecord.status ||
    "unknown"
  );
}

function buildAuditRows(caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>) {
  return caseRecord.auditLogs.slice(0, 20).map((log) => ({
    event: log.action,
    user: log.user?.fullName || SYSTEM_LABEL,
    role: log.user?.role || "system",
    timestamp: log.createdAt.toISOString(),
  }));
}

function buildCasePayload(args: {
  caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>;
  validation: CasePdfValidationResult;
  trigger: GenerateTrigger;
  language: "en" | "ar";
  version: number;
  hashForDisplay: string;
  qrDataUrl: string;
  isFinal: boolean;
  generatedAt: string;
}) {
  const { caseRecord, validation } = args;
  const metadata = asRecord(caseRecord.metadata);
  const workflow = asRecord(metadata?.workflow);
  const presentation = asRecord(metadata?.presentation);
  const signature = asRecord(metadata?.signature);
  const witness = asRecord(metadata?.witness);
  const legal = asRecord(metadata?.legal);
  const tenantMeta = asRecord(caseRecord.tenant?.metadata);
  const authoritative = getAuthoritativeCaseFacts(caseRecord);

  const legalReadinessScore = Math.round(
    (validation.checklist.filter((item) => item.satisfied).length / Math.max(validation.checklist.length, 1)) * 100,
  );

  return {
    version: args.version,
    language: args.language,
    generatedAt: args.generatedAt,
    trigger: args.trigger,
    templateVersion: PDF_TEMPLATE_VERSION,
    isFinal: args.isFinal,
    reportStatus: args.isFinal ? "final" : "draft",
    hashForDisplay: args.hashForDisplay,
    qrDataUrl: args.qrDataUrl,
    facility: {
      name: renderValue(caseRecord.tenant?.name),
      logoUrl: readString(tenantMeta, "logo_url", "logoUrl") || null,
      commercialRegistrationNumber: readString(tenantMeta, "commercial_registration_number", "cr_number") || "N/A",
      healthLicenseNumber: readString(tenantMeta, "health_license_number", "license_number") || "N/A",
      department: readString(workflow, "department", "department_name") || "N/A",
      generatedDate: args.generatedAt,
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber || caseRecord.id,
    },
    patient: {
      fullName: renderValue(caseRecord.patientName),
      mrn: renderValue(caseRecord.medicalRecordNo),
      age: readString(metadata, "patient_age") || "N/A",
      gender: readString(metadata, "patient_gender") || "N/A",
      nationality: readString(metadata, "patient_nationality") || "N/A",
      department: readString(workflow, "department", "department_name") || "N/A",
      treatingPhysician: authoritative.treatingPhysician || "N/A",
    },
    medicalSummary: {
      encounterSummary:
        readString(workflow, "discussion_summary") ||
        readString(metadata, "encounter_summary") ||
        "No summary provided.",
      diagnosisSummary:
        readString(workflow, "diagnosis_summary") ||
        readString(metadata, "diagnosis_summary") ||
        renderValue(caseRecord.title),
      dischargeRecommendation:
        readString(workflow, "discharge_recommendation") ||
        readString(metadata, "discharge_recommendation") ||
        "Recommendation not explicitly captured.",
      timestamps: {
        decisionAt: authoritative.dischargeDecisionAt || "N/A",
        refusalStartedAt: authoritative.refusalStartedAt || "N/A",
        escalatedAt: readString(workflow, "escalated_at") || "N/A",
      },
    },
    refusalIncident: {
      refusedBy: readString(workflow, "refused_by") || readString(metadata, "refused_by") || "patient",
      refusalReason:
        readString(workflow, "refusal_reason") ||
        readString(metadata, "refusal_reason") ||
        "No refusal reason captured.",
      refusalAt: authoritative.refusalStartedAt || "N/A",
      documentationMethod:
        readString(workflow, "documentation_method") ||
        readString(metadata, "documentation_method") ||
        "Electronic clinical record",
    },
    riskDisclosure: {
      clinicianName: authoritative.treatingPhysician || "N/A",
      clinicianTitle: readString(legal, "clinician_title") || "Treating physician",
      explainedAt: readString(presentation, "recorded_at") || "N/A",
      explanationMethod: readString(presentation, "method") || "Bedside counseling",
      summary: readString(workflow, "discussion_summary") || "Risk summary not provided",
    },
    patientDecision: {
      decision: readString(signature, "outcome") || "unknown",
      signedState: readString(signature, "outcome") === "signed" ? "signed" : "refused_to_sign",
      recorder: readString(signature, "signer_name") || SYSTEM_LABEL,
      timestamp: readString(signature, "recorded_at") || "N/A",
    },
    witness: {
      name: readString(witness, "witness_name") || "N/A",
      role: readString(witness, "witness_role") || "N/A",
      signature: readString(witness, "signature") || "N/A",
      timestamp: readString(witness, "recorded_at") || "N/A",
      noWitnessReason: readString(witness, "reason_no_witness", "no_witness_reason") || "",
    },
    legalChecklist: validation.checklist,
    auditTrail: buildAuditRows(caseRecord),
    finalAssessment: {
      caseStatus: summarizeCaseStatus(caseRecord),
      complianceStatus: validation.canFinalize ? "compliant" : "incomplete",
      legalReadinessScore,
      completeness: validation.canFinalize ? "complete" : "incomplete",
      missingFields: validation.missingRequired,
    },
    signatures: {
      physician: authoritative.treatingPhysician || "",
      legalRepresentative: readString(legal, "legal_representative") || "",
      qualityRepresentative: readString(legal, "quality_representative") || "",
    },
    legalStatement:
      "This report is issued by International Medical Center as a medico-legal record for clinical governance, regulatory inspection, and legal evidence. WathiqCare serves as the digital evidence platform.",
  };
}

function renderChecklistRows(items: CasePdfChecklistItem[]): string {
  return items
    .map(
      (item) => `<tr>
<td>${escapeHtml(item.label)}</td>
<td>${item.required ? "Yes" : "No"}</td>
<td>${item.satisfied ? "Yes" : "No"}</td>
<td>${escapeHtml(item.reason)}</td>
</tr>`,
    )
    .join("\n");
}

function renderAuditRows(rows: Array<{ event: string; user: string; role: string; timestamp: string }>): string {
  return rows
    .map(
      (row) => `<tr>
<td>${escapeHtml(row.event)}</td>
<td>${escapeHtml(row.user)}</td>
<td>${escapeHtml(row.role)}</td>
<td>${escapeHtml(row.timestamp)}</td>
</tr>`,
    )
    .join("\n");
}

function buildPdfHtml(payload: ReturnType<typeof buildCasePayload>): string {
  const rtl = payload.language === "ar";
  const draftWatermark = payload.reportStatus === "draft" ? '<div class="draft-watermark">DRAFT</div>' : "";
  const logoSrc = payload.facility.logoUrl || IMC_LOGO_URL;

  return `<!doctype html>
<html lang="${payload.language}" dir="${rtl ? "rtl" : "ltr"}">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 24mm 14mm 18mm 14mm; }
      body {
        font-family: "Tajawal", "IBM Plex Sans Arabic", "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        font-size: 12px;
        line-height: 1.5;
      }
      .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 12px; }
      .header-brand { display:flex; align-items:center; gap:10px; }
      .header-brand img { width: 52px; height: 52px; object-fit: contain; }
      .title { font-size: 18px; font-weight: 700; color: #0f766e; }
      .meta { font-size: 11px; color: #334155; }
      .section { margin-bottom: 14px; page-break-inside: avoid; }
      .section h2 { margin: 0 0 8px; font-size: 14px; color: #115e59; border-left: 3px solid #0d9488; padding-left: 8px; }
      .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .field { background:#f8fafc; border:1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; }
      .field .k { color:#475569; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
      .field .v { font-weight: 600; margin-top: 2px; }
      table { width:100%; border-collapse: collapse; }
      th, td { border:1px solid #cbd5e1; padding: 6px; vertical-align: top; text-align: ${rtl ? "right" : "left"}; }
      th { background:#f1f5f9; }
      .small { font-size: 10px; color:#475569; }
      .validation { display:flex; gap: 12px; align-items:center; border:1px solid #cbd5e1; border-radius:8px; padding:10px; }
      .validation img { width: 96px; height: 96px; }
      .draft-watermark {
        position: fixed;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        font-size: 88px;
        color: rgba(239, 68, 68, 0.16);
        font-weight: 800;
        z-index: 1000;
        pointer-events: none;
      }
      .signature-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .signature-box { min-height: 76px; border:1px dashed #94a3b8; border-radius:8px; padding:8px; }
      .legal-note { background:#ecfeff; border:1px solid #a5f3fc; border-radius:8px; padding:10px; }
    </style>
  </head>
  <body>
    ${draftWatermark}
    <div class="header">
      <div class="header-brand">
        <img src="${escapeHtml(logoSrc)}" alt="International Medical Center logo" />
        <div>
          <div class="title">Discharge Refusal Report</div>
          <div class="meta">International Medical Center (IMC)</div>
          <div class="meta">Case ID: ${escapeHtml(payload.facility.caseId)} | Case Number: ${escapeHtml(payload.facility.caseNumber)}</div>
          <div class="meta">Generated: ${escapeHtml(payload.facility.generatedDate)} | Version: ${payload.version}</div>
        </div>
      </div>
      <div class="meta" style="text-align:${rtl ? "left" : "right"}">
        <div>${escapeHtml(payload.facility.name)}</div>
        <div>CR: ${escapeHtml(payload.facility.commercialRegistrationNumber)}</div>
        <div>License: ${escapeHtml(payload.facility.healthLicenseNumber)}</div>
      </div>
    </div>

    <section class="section">
      <h2>1. Facility Information</h2>
      <div class="grid">
        <div class="field"><div class="k">Facility</div><div class="v">${escapeHtml(payload.facility.name)}</div></div>
        <div class="field"><div class="k">Department</div><div class="v">${escapeHtml(payload.facility.department)}</div></div>
        <div class="field"><div class="k">Generated Date</div><div class="v">${escapeHtml(payload.facility.generatedDate)}</div></div>
        <div class="field"><div class="k">Case ID</div><div class="v">${escapeHtml(payload.facility.caseId)}</div></div>
      </div>
    </section>

    <section class="section">
      <h2>2. Patient Information</h2>
      <div class="grid">
        <div class="field"><div class="k">Full Name</div><div class="v">${escapeHtml(payload.patient.fullName)}</div></div>
        <div class="field"><div class="k">MRN</div><div class="v">${escapeHtml(payload.patient.mrn)}</div></div>
        <div class="field"><div class="k">Age / Gender</div><div class="v">${escapeHtml(String(payload.patient.age))} / ${escapeHtml(String(payload.patient.gender))}</div></div>
        <div class="field"><div class="k">Nationality</div><div class="v">${escapeHtml(payload.patient.nationality)}</div></div>
        <div class="field"><div class="k">Department</div><div class="v">${escapeHtml(payload.patient.department)}</div></div>
        <div class="field"><div class="k">Treating Physician</div><div class="v">${escapeHtml(payload.patient.treatingPhysician)}</div></div>
      </div>
    </section>

    <section class="section">
      <h2>3. Medical Case Summary</h2>
      <div class="field"><div class="k">Encounter Summary</div><div class="v">${escapeHtml(payload.medicalSummary.encounterSummary)}</div></div>
      <div class="field"><div class="k">Diagnosis Summary</div><div class="v">${escapeHtml(payload.medicalSummary.diagnosisSummary)}</div></div>
      <div class="field"><div class="k">Discharge Recommendation</div><div class="v">${escapeHtml(payload.medicalSummary.dischargeRecommendation)}</div></div>
      <div class="small">Decision: ${escapeHtml(payload.medicalSummary.timestamps.decisionAt)} | Refusal: ${escapeHtml(payload.medicalSummary.timestamps.refusalStartedAt)} | Escalated: ${escapeHtml(payload.medicalSummary.timestamps.escalatedAt)}</div>
    </section>

    <section class="section">
      <h2>4. Discharge Refusal Incident</h2>
      <div class="grid">
        <div class="field"><div class="k">Refused By</div><div class="v">${escapeHtml(payload.refusalIncident.refusedBy)}</div></div>
        <div class="field"><div class="k">Refusal Date/Time</div><div class="v">${escapeHtml(payload.refusalIncident.refusalAt)}</div></div>
      </div>
      <div class="field"><div class="k">Reason</div><div class="v">${escapeHtml(payload.refusalIncident.refusalReason)}</div></div>
      <div class="field"><div class="k">Documentation Method</div><div class="v">${escapeHtml(payload.refusalIncident.documentationMethod)}</div></div>
    </section>

    <section class="section">
      <h2>5. Risk Disclosure Section</h2>
      <div class="grid">
        <div class="field"><div class="k">Clinician</div><div class="v">${escapeHtml(payload.riskDisclosure.clinicianName)}</div></div>
        <div class="field"><div class="k">Title</div><div class="v">${escapeHtml(payload.riskDisclosure.clinicianTitle)}</div></div>
        <div class="field"><div class="k">Explained At</div><div class="v">${escapeHtml(payload.riskDisclosure.explainedAt)}</div></div>
        <div class="field"><div class="k">Method</div><div class="v">${escapeHtml(payload.riskDisclosure.explanationMethod)}</div></div>
      </div>
      <div class="field"><div class="k">Risk Summary</div><div class="v">${escapeHtml(payload.riskDisclosure.summary)}</div></div>
    </section>

    <section class="section">
      <h2>6. Patient Decision</h2>
      <div class="grid">
        <div class="field"><div class="k">Decision</div><div class="v">${escapeHtml(payload.patientDecision.decision)}</div></div>
        <div class="field"><div class="k">Signed State</div><div class="v">${escapeHtml(payload.patientDecision.signedState)}</div></div>
        <div class="field"><div class="k">Recorder</div><div class="v">${escapeHtml(payload.patientDecision.recorder)}</div></div>
        <div class="field"><div class="k">Timestamp</div><div class="v">${escapeHtml(payload.patientDecision.timestamp)}</div></div>
      </div>
    </section>

    <section class="section">
      <h2>7. Witness Information</h2>
      <div class="grid">
        <div class="field"><div class="k">Witness Name</div><div class="v">${escapeHtml(payload.witness.name)}</div></div>
        <div class="field"><div class="k">Role/Title</div><div class="v">${escapeHtml(payload.witness.role)}</div></div>
        <div class="field"><div class="k">Signature</div><div class="v">${escapeHtml(payload.witness.signature)}</div></div>
        <div class="field"><div class="k">Timestamp</div><div class="v">${escapeHtml(payload.witness.timestamp)}</div></div>
      </div>
      ${payload.witness.noWitnessReason ? `<div class="field"><div class="k">No Witness Reason</div><div class="v">${escapeHtml(payload.witness.noWitnessReason)}</div></div>` : ""}
    </section>

    <section class="section">
      <h2>8. Legal Readiness Checklist</h2>
      <table>
        <thead><tr><th>Item</th><th>Required</th><th>Satisfied</th><th>Reason</th></tr></thead>
        <tbody>${renderChecklistRows(payload.legalChecklist)}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>9. Audit Trail Summary</h2>
      <table>
        <thead><tr><th>Event</th><th>User</th><th>Role</th><th>Timestamp</th></tr></thead>
        <tbody>${renderAuditRows(payload.auditTrail)}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>10. Final Assessment</h2>
      <div class="grid">
        <div class="field"><div class="k">Case Status</div><div class="v">${escapeHtml(payload.finalAssessment.caseStatus)}</div></div>
        <div class="field"><div class="k">Compliance</div><div class="v">${escapeHtml(payload.finalAssessment.complianceStatus)}</div></div>
        <div class="field"><div class="k">Legal Readiness Score</div><div class="v">${payload.finalAssessment.legalReadinessScore}%</div></div>
        <div class="field"><div class="k">Report Completeness</div><div class="v">${escapeHtml(payload.finalAssessment.completeness)}</div></div>
      </div>
    </section>

    <section class="section">
      <h2>11. Digital Validation Block</h2>
      <div class="validation">
        <img src="${payload.qrDataUrl}" alt="validation-qr" />
        <div>
          <div><strong>SHA-256:</strong> ${escapeHtml(payload.hashForDisplay)}</div>
          <div><strong>Version:</strong> ${payload.version}</div>
          <div><strong>Generated At:</strong> ${escapeHtml(payload.generatedAt)}</div>
          <div><strong>Template:</strong> ${escapeHtml(payload.templateVersion)}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>12. Signature Section</h2>
      <div class="signature-grid">
        <div class="signature-box"><strong>Treating Physician</strong><br/>${escapeHtml(payload.signatures.physician)}</div>
        <div class="signature-box"><strong>Legal Affairs Representative</strong><br/>${escapeHtml(payload.signatures.legalRepresentative)}</div>
        <div class="signature-box"><strong>Quality Representative</strong><br/>${escapeHtml(payload.signatures.qualityRepresentative)}</div>
      </div>
    </section>

    <section class="section legal-note">
      <h2>13. Legal Statement</h2>
      <div>${escapeHtml(payload.legalStatement)}</div>
    </section>
  </body>
</html>`;
}

async function launchPdfBrowser(): Promise<Browser> {
  const defaultLaunchOptions: LaunchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  };

  const configuredExecutablePath = getConfiguredPuppeteerExecutablePath();
  if (configuredExecutablePath) {
    try {
      return await puppeteer.launch({
        ...defaultLaunchOptions,
        executablePath: configuredExecutablePath,
      });
    } catch (error) {
      console.warn("Failed to launch with configured Puppeteer executable path:", error);
    }
  }

  try {
    return await puppeteer.launch(defaultLaunchOptions);
  } catch {
    // Vercel/serverless runtimes might not have a system Chrome binary.
    const executablePath = await chromium.executablePath();
    return await puppeteer.launch({
      ...defaultLaunchOptions,
      executablePath,
      args: [...chromium.args, ...(defaultLaunchOptions.args ?? [])],
      headless: true,
    });
  }
}

async function renderPdfBuffer(args: {
  html: string;
  reportStatus: "draft" | "final";
  version: number;
  generatedAt: string;
  hashForFooter: string;
}) {
  if (!sharedPdfBrowserPromise) {
    sharedPdfBrowserPromise = launchPdfBrowser();
  }

  const browser = await sharedPdfBrowserPromise;

  try {
    const page = await browser.newPage();
    await page.setContent(args.html, { waitUntil: "domcontentloaded" });

    const rendered = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: "24mm",
        right: "14mm",
        bottom: "18mm",
        left: "14mm",
      },
      headerTemplate: `
        <div style="font-size:9px;width:100%;padding:0 10mm;color:#334155;display:flex;justify-content:space-between;">
          <span>International Medical Center â€¢ Discharge Refusal Report</span>
          <span>Generated: ${escapeHtml(args.generatedAt)}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size:9px;width:100%;padding:0 10mm;color:#334155;display:flex;justify-content:space-between;">
          <span>Confidential medico-legal record â€¢ Evidence retained via WathiqCare</span>
          <span>v${args.version} | ${escapeHtml(args.reportStatus)} | ${escapeHtml(args.hashForFooter.slice(0, 16))}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    await page.close();

    return Buffer.from(rendered);
  } catch (error) {
    if (sharedPdfBrowserPromise) {
      try {
        const currentBrowser = await sharedPdfBrowserPromise;
        await currentBrowser.close();
      } catch {
        // Ignore close failures; browser will be reinitialized on next call.
      }
      sharedPdfBrowserPromise = null;
    }
    throw error;
  }
}

function toReportSummary(document: {
  id: string;
  versionLabel: string;
  fileName: string;
  generatedAt: Date;
  status: DocumentStatus;
  metadata: Prisma.JsonValue | null;
  mimeType: string;
  sizeBytes: bigint;
  generatedBy?: { fullName: string } | null;
}, binary: PdfBinaryAvailability = { available: true, reason: null }): CasePdfVersionSummary {
  const metadata = asRecord(document.metadata);
  const reportStatus = readString(metadata, "report_status") || "draft";
  const normalizedStatus: "draft" | "final" | "failed" = !binary.available
    ? "failed"
    : reportStatus === "final"
      ? "final"
      : reportStatus === "failed"
        ? "failed"
        : "draft";
  const recoveryMessage =
    !binary.available && reportStatus !== "failed"
      ? "Version metadata exists but file is missing; regenerate required"
      : reportStatus === "failed"
        ? readString(metadata, "error", "recovery_message") || "Regeneration required"
        : null;

  return {
    id: document.id,
    version: parseNumericVersion(document.versionLabel),
    fileName: document.fileName,
    generatedAt: document.generatedAt.toISOString(),
    status: normalizedStatus,
    isFinal: normalizedStatus === "final" && Boolean(readBoolean(metadata, "is_final") || reportStatus === "final"),
    templateVersion: readString(metadata, "template_version") || PDF_TEMPLATE_VERSION,
    language: readString(metadata, "language") || "en",
    mimeType: document.mimeType,
    fileSize: Number(document.sizeBytes),
    sha256Hash: readString(metadata, "sha256_binary_hash", "sha256_hash"),
    generatedBy: document.generatedBy?.fullName || null,
    binaryAvailable: binary.available,
    recoveryRequired: !binary.available || reportStatus === "failed",
    recoveryMessage,
  };
}

async function listPdfDocumentsInternal(tenantId: string, caseId: string) {
  return prisma().document.findMany({
    where: {
      tenantId,
      caseId,
      templateKey: CASE_PDF_TEMPLATE_KEY,
      mimeType: "application/pdf",
    },
    include: {
      generatedBy: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: { generatedAt: "desc" },
  });
}

function buildFileName(caseId: string, date = new Date()): string {
  return `IMC_DischargeRefusal_Report_${caseId}_${formatDateForFileName(date)}.pdf`;
}

function pickLatestValidCasePdfVersion(summaries: CasePdfVersionSummary[]): CasePdfVersionSummary | null {
  for (const summary of summaries) {
    if (summary.binaryAvailable && !summary.recoveryRequired && summary.status !== "failed") {
      return summary;
    }
  }

  return null;
}

async function summarizeAndHealPdfDocuments(documents: Array<{
  id: string;
  versionLabel: string;
  fileName: string;
  generatedAt: Date;
  status: DocumentStatus;
  metadata: Prisma.JsonValue | null;
  mimeType: string;
  sizeBytes: bigint;
  storagePath: string | null;
  payloadJson: Prisma.JsonValue | null;
  generatedBy?: { fullName: string } | null;
}>): Promise<CasePdfVersionSummary[]> {
  const summaries: CasePdfVersionSummary[] = [];

  for (const document of documents) {
    const availability = await getDocumentBinaryAvailability({
      storagePath: document.storagePath,
      payloadJson: document.payloadJson,
    });

    if (!availability.available) {
      await markDocumentAsBinaryMissing({
        documentId: document.id,
        metadata: document.metadata,
        payloadJson: document.payloadJson,
      }).catch(() => undefined);
    }

    summaries.push(toReportSummary(document, availability));
  }

  return summaries;
}

async function createFailedRecord(args: {
  tenantId: string;
  caseId: string;
  generatedBy: string;
  version: number;
  fileName: string;
  trigger: GenerateTrigger;
  language: "en" | "ar";
  errorMessage: string;
  existingDocumentId?: string;
  request?: NextRequest;
}) {
  const metadata: JsonInputObject = {
    trigger: args.trigger,
    report_status: "failed",
    language: args.language,
    template_version: PDF_TEMPLATE_VERSION,
    is_final: false,
    recovery_required: true,
    recovery_message: "Version metadata exists but file is missing; regenerate required",
    error: args.errorMessage,
  };

  const failed = args.existingDocumentId
    ? await prisma().document.update({
        where: { id: args.existingDocumentId },
        data: {
          status: DocumentStatus.DRAFT,
          fileName: args.fileName,
          storagePath: null,
          previewHtml: null,
          payloadJson: {
            error: args.errorMessage,
          },
          sizeBytes: BigInt(0),
          generatedByUserId: args.generatedBy,
          metadata,
        },
      })
    : await prisma().document.create({
        data: {
          tenantId: args.tenantId,
          caseId: args.caseId,
          documentType: DocumentType.CASE_FILE,
          status: DocumentStatus.DRAFT,
          documentCode: `LEGAL-CASE-PDF-${args.version}`,
          titleEn: "Legal Case PDF Report",
          titleAr: "ØªÙ‚Ø±ÙŠØ± Ù…Ù„Ù Ø§Ù„Ù‚Ø¶ÙŠØ© Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ",
          templateKey: CASE_PDF_TEMPLATE_KEY,
          versionLabel: String(args.version),
          fileName: args.fileName,
          mimeType: "application/pdf",
          storagePath: null,
          previewHtml: null,
          payloadJson: {
            error: args.errorMessage,
          },
          sizeBytes: BigInt(0),
          generatedByUserId: args.generatedBy,
          metadata,
        },
      });

  await writeAuditLog({
    tenantId: args.tenantId,
    userId: args.generatedBy,
    entityType: "case_pdf",
    entityId: failed.id,
    action: "pdf_generation_failed",
    details: "Legal case PDF generation failed",
    caseId: args.caseId,
    documentId: failed.id,
    metadataJson: {
      version: args.version,
      trigger: args.trigger,
      message: args.errorMessage,
    },
    request: args.request,
  });

  return failed;
}

export async function generateCasePdfReport(args: {
  auth: AuthContext;
  caseId: string;
  request?: NextRequest;
  trigger: GenerateTrigger;
  requestedFinal?: boolean;
  language?: "en" | "ar";
  bypassAccessCheck?: boolean;
}): Promise<GeneratedCasePdfResult> {
  const startedAt = Date.now();
  const caseRecord = await getAuthorizedCase(args.auth, args.caseId);
  if (!args.bypassAccessCheck) {
    ensureCasePdfAccess(args.auth, caseRecord);
  }

  const language = args.language || "en";
  const validation = buildValidation(caseRecord);
  if (!validation.canFinalize) {
    throw new ApiError(
      400,
      `PDF generation blocked. Missing required fields: ${validation.missingRequired.join(", ")}`,
    );
  }
  const allowFinal = Boolean(args.requestedFinal && validation.canFinalize);
  const lifecycleContext = {
    tenantId: caseRecord.tenantId,
    caseId: args.caseId,
    trigger: args.trigger,
    requestedFinal: Boolean(args.requestedFinal),
    allowFinal,
  };

  const existingPdfDocs = caseRecord.documents.filter(isPdfReportDocument);
  const highestVersion = existingPdfDocs.reduce(
    (maxVersion, document) => Math.max(maxVersion, parseNumericVersion(document.versionLabel)),
    0,
  );
  const version = highestVersion + 1;
  const fileName = buildFileName(args.caseId);
  const generatedAt = nowIso();

  logCasePdfLifecycle("generation_requested", {
    ...lifecycleContext,
    version,
    missingRequired: validation.missingRequired,
  });

  await writeAuditLog({
    tenantId: caseRecord.tenantId,
    userId: args.auth.sub,
    entityType: "case_pdf",
    entityId: args.caseId,
    action: "pdf_generation_requested",
    details: "Legal case PDF generation requested",
    caseId: args.caseId,
    metadataJson: {
      trigger: args.trigger,
      requested_final: Boolean(args.requestedFinal),
      version,
    },
    request: args.request,
  });

  try {
    const brandingProfile = await getTenantBrandingProfile(caseRecord.tenantId).catch(() => null);
    const validationPath = `${process.env.NEXT_PUBLIC_APP_URL || "https://wathiqcare.online"}/api/cases/${encodeURIComponent(
      args.caseId,
    )}/pdf/${version}/preview`;

    const contentHashInput = {
      caseId: caseRecord.id,
      generatedAt,
      validation,
      trigger: args.trigger,
      language,
      readinessSummary: summarizeCaseStatus(caseRecord),
      branding: brandingProfile,
    };

    const contentHash = hashSha256(JSON.stringify(contentHashInput));
    const qrDataUrl = await QRCode.toDataURL(validationPath, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 160,
    });

    const payload = buildCasePayload({
      caseRecord,
      validation,
      trigger: args.trigger,
      language,
      version,
      hashForDisplay: contentHash,
      qrDataUrl,
      isFinal: allowFinal,
      generatedAt,
    });

    const html = buildPdfHtml(payload);
    const pdfBuffer = await renderPdfBuffer({
      html,
      reportStatus: allowFinal ? "final" : "draft",
      version,
      generatedAt,
      hashForFooter: contentHash,
    });

    const binaryHash = hashSha256(pdfBuffer);
    const verificationChecksum = hashSha256(`${contentHash}:${binaryHash}:${version}:${generatedAt}`);

    const persisted = await persistPdfBinary({
      tenantId: caseRecord.tenantId,
      caseId: args.caseId,
      version,
      fileName,
      pdfBuffer,
      reportPayload: payload,
    });

    logCasePdfLifecycle("binary_persisted", {
      ...lifecycleContext,
      version,
      storagePath: persisted.storagePath,
      storageMode: getPdfBinaryStorageMode(),
      sizeBytes: pdfBuffer.byteLength,
      sha256BinaryHash: binaryHash,
    });

    const sharedDocumentData = {
      status: DocumentStatus.GENERATED,
      documentCode: `LEGAL-CASE-PDF-${version}`,
      titleEn: "Legal Case File Report",
      titleAr: "ØªÙ‚Ø±ÙŠØ± Ù…Ù„Ù Ø§Ù„Ù‚Ø¶ÙŠØ© Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ",
      versionLabel: String(version),
      fileName,
      mimeType: "application/pdf",
      storagePath: persisted.storagePath,
      previewHtml: null,
      payloadJson: persisted.payloadJson,
      sizeBytes: BigInt(pdfBuffer.byteLength),
      generatedByUserId: args.auth.sub,
      metadata: {
        trigger: args.trigger,
        report_status: allowFinal ? "final" : "draft",
        is_final: allowFinal,
        template_version: PDF_TEMPLATE_VERSION,
        language,
        sha256_hash: contentHash,
        sha256_binary_hash: binaryHash,
        verification_checksum: verificationChecksum,
        tamper_evidence: {
          algorithm: "sha256",
          checksum_input: "content_hash:binary_hash:version:generated_at",
          generated_at: generatedAt,
          immutable_expected: allowFinal,
        },
        can_finalize: validation.canFinalize,
        missing_required: validation.missingRequired,
        immutable: allowFinal,
      } as JsonInputObject,
    };

    let document;
    try {
      document = await prisma().document.create({
        data: {
          tenantId: caseRecord.tenantId,
          caseId: args.caseId,
          documentType: DocumentType.CASE_FILE,
          templateKey: CASE_PDF_TEMPLATE_KEY,
          ...sharedDocumentData,
        },
        include: {
          generatedBy: {
            select: {
              fullName: true,
            },
          },
        },
      });
    } catch (persistError) {
      if (persisted.cleanup) {
        await persisted.cleanup().catch(() => undefined);
      }
      throw persistError;
    }

    await writeAuditLog({
      tenantId: caseRecord.tenantId,
      userId: args.auth.sub,
      entityType: "case_pdf",
      entityId: document.id,
      action: args.trigger === "manual_regenerate" ? "pdf_regenerated" : "pdf_generated",
      details: `Legal case PDF generated (v${version})`,
      caseId: args.caseId,
      documentId: document.id,
      metadataJson: {
        version,
        status: allowFinal ? "final" : "draft",
        sha256_hash: contentHash,
        sha256_binary_hash: binaryHash,
      },
      request: args.request,
    });

    await writeAuditLog({
      tenantId: caseRecord.tenantId,
      userId: args.auth.sub,
      entityType: "case_pdf",
      entityId: document.id,
      action: "pdf_version_created",
      details: `PDF version created (v${version})`,
      caseId: args.caseId,
      documentId: document.id,
      metadataJson: {
        version,
      },
      request: args.request,
    });

    const auditChainEvent = await appendAuditChainEvent({
      tenantId: caseRecord.tenantId,
      caseId: args.caseId,
      eventType: "PDF_GENERATED",
      actorId: args.auth.sub,
      actorRole: args.auth.role ?? null,
      payloadSummary: `Legal case PDF generated v${version}`,
      documentVersion: String(version),
      metadataJson: {
        documentId: document.id,
        status: allowFinal ? "final" : "draft",
        verification_checksum: verificationChecksum,
      },
      request: args.request,
    }).catch(() => null);

    if (auditChainEvent && typeof auditChainEvent === "object" && "currentHash" in auditChainEvent) {
      const currentHash = (auditChainEvent as { currentHash?: unknown }).currentHash;
      if (typeof currentHash === "string" && currentHash) {
        await prisma().document.update({
          where: { id: document.id },
          data: {
            metadata: {
              ...(sharedDocumentData.metadata as JsonInputObject),
              immutable_audit_reference: currentHash,
            },
          },
        }).catch(() => undefined);
      }
    }

    const summary = toReportSummary(
      document,
      await getDocumentBinaryAvailability({
        storagePath: document.storagePath,
        payloadJson: document.payloadJson,
      }),
    );

    logCasePdfLifecycle("generation_succeeded", {
      ...lifecycleContext,
      version,
      documentId: document.id,
      status: summary.status,
      binaryAvailable: summary.binaryAvailable,
      recoveryRequired: summary.recoveryRequired,
    });
    recordRuntimeMetric("pdf_generation_duration_ms", Date.now() - startedAt);

    return {
      report: summary,
      validation,
      previewUrl: `/api/cases/${encodeURIComponent(args.caseId)}/pdf/${version}/preview`,
      downloadUrl: `/api/cases/${encodeURIComponent(args.caseId)}/pdf/${version}/download`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF generation error";
    logRuntimeIncident({
      request: args.request,
      auth: { sub: args.auth.sub },
      module: "legal_case_pdf",
      type: "PDF_FAILURE",
      error,
      details: {
        caseId: args.caseId,
        trigger: args.trigger,
      },
    });
    logCasePdfLifecycle("generation_failed", {
      ...lifecycleContext,
      version,
      error: message,
    });
    await createFailedRecord({
      tenantId: caseRecord.tenantId,
      caseId: args.caseId,
      generatedBy: args.auth.sub,
      version,
      fileName,
      trigger: args.trigger,
      language,
      errorMessage: message,
      request: args.request,
    });
    throw new ApiError(
      500,
      "PDF generation failed. Please review missing case fields or template rendering errors.",
    );
  } finally {
    recordRuntimeMetric("response_time_ms", Date.now() - startedAt);
  }
}

export async function getLatestCasePdf(auth: AuthContext, caseId: string): Promise<LatestCasePdfResponse> {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  ensureCasePdfAccess(auth, caseRecord);

  const docs = await listPdfDocumentsInternal(caseRecord.tenantId, caseId);
  const validation = buildValidation(caseRecord);
  const summaries = await summarizeAndHealPdfDocuments(docs);
  const latestKnown = summaries[0] ?? null;
  const latestValid = pickLatestValidCasePdfVersion(summaries);
  const fallbackApplied = Boolean(latestKnown && latestValid && latestKnown.id !== latestValid.id);
  const forceRegenerateRequired = !latestValid && summaries.some((summary) => summary.recoveryRequired);

  if (fallbackApplied && latestKnown && latestValid) {
    logCasePdfLifecycle("latest_version_fallback_applied", {
      tenantId: caseRecord.tenantId,
      caseId,
      latestKnownVersion: latestKnown.version,
      latestKnownStatus: latestKnown.status,
      latestValidVersion: latestValid.version,
    });
  }

  if (forceRegenerateRequired) {
    logCasePdfLifecycle("latest_version_force_regenerate_required", {
      tenantId: caseRecord.tenantId,
      caseId,
    });
  }

  return {
    latest: latestValid,
    latestValid,
    latestKnown,
    fallbackApplied,
    forceRegenerateRequired,
    validation,
  };
}

export async function listCasePdfVersions(auth: AuthContext, caseId: string) {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  ensureCasePdfAccess(auth, caseRecord);

  const docs = await listPdfDocumentsInternal(caseRecord.tenantId, caseId);

  return summarizeAndHealPdfDocuments(docs);
}

async function getCasePdfDocumentByVersion(auth: AuthContext, caseId: string, version: number) {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  ensureCasePdfAccess(auth, caseRecord);

  const document = await prisma().document.findFirst({
    where: {
      tenantId: caseRecord.tenantId,
      caseId,
      templateKey: CASE_PDF_TEMPLATE_KEY,
      mimeType: "application/pdf",
      versionLabel: String(version),
    },
    orderBy: { generatedAt: "desc" },
    include: {
      generatedBy: {
        select: {
          fullName: true,
        },
      },
    },
  });

  if (!document) {
    throw new ApiError(404, `PDF version ${version} not found`);
  }

  return { caseRecord, document };
}

async function markDocumentAsBinaryMissing(args: {
  documentId: string;
  metadata: Prisma.JsonValue | null;
  payloadJson: Prisma.JsonValue | null;
}) {
  const previousMetadata = asRecord(args.metadata);
  const previousPayload = asRecord(args.payloadJson);

  await prisma().document.update({
    where: { id: args.documentId },
    data: {
      status: DocumentStatus.DRAFT,
      metadata: {
        ...previousMetadata,
        report_status: "failed",
        recovery_required: true,
        recovery_message: "Version metadata exists but file is missing; regenerate required",
        binary_available: false,
      } as JsonInputObject,
      payloadJson: {
        ...previousPayload,
        error: "Version metadata exists but file is missing; regenerate required",
      } as JsonInputObject,
    },
  });
}

async function readPdfBufferFromDocument(document: {
  id: string;
  storagePath: string | null;
  payloadJson: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
}): Promise<Buffer> {
  const availability = await getDocumentBinaryAvailability(document);
  if (!availability.available) {
    logCasePdfLifecycle("binary_missing", {
      documentId: document.id,
      reason: availability.reason,
    });
    await markDocumentAsBinaryMissing({
      documentId: document.id,
      metadata: document.metadata,
      payloadJson: document.payloadJson,
    }).catch(() => undefined);
    throw new ApiError(410, "Version metadata exists but file is missing; regenerate required");
  }

  if (document.storagePath?.startsWith("local://") || document.storagePath?.startsWith("file://")) {
    const absolutePath = resolveLocalPdfPath(document.storagePath);
    if (absolutePath) {
      try {
        return await fs.readFile(absolutePath);
      } catch {
        // Fall through to inline payload fallback.
      }
    }
  }

  const payload = asRecord(document.payloadJson);
  const base64 = getInlinePdfBase64(payload);
  if (!base64) {
    await markDocumentAsBinaryMissing({
      documentId: document.id,
      metadata: document.metadata,
      payloadJson: document.payloadJson,
    }).catch(() => undefined);
    throw new ApiError(410, "Version metadata exists but file is missing; regenerate required");
  }

  return Buffer.from(base64, "base64");
}

export async function previewCasePdfVersion(args: {
  auth: AuthContext;
  caseId: string;
  version: number;
  request?: NextRequest;
}) {
  const { caseRecord, document } = await getCasePdfDocumentByVersion(args.auth, args.caseId, args.version);

  await writeAuditLog({
    tenantId: caseRecord.tenantId,
    userId: args.auth.sub,
    entityType: "case_pdf",
    entityId: document.id,
    action: "pdf_previewed",
    details: `Previewed legal case PDF v${args.version}`,
    caseId: args.caseId,
    documentId: document.id,
    metadataJson: { version: args.version },
    request: args.request,
  });

  logCasePdfLifecycle("preview_access", {
    tenantId: caseRecord.tenantId,
    caseId: args.caseId,
    version: args.version,
    documentId: document.id,
    userId: args.auth.sub,
    role: args.auth.role ?? null,
  });

  await logReportAccess({
    tenantId: caseRecord.tenantId,
    caseId: args.caseId,
    reportKey: "case_pdf_preview",
    exportFormat: "PDF",
    accessedByUserId: args.auth.sub,
    accessedByRole: args.auth.role ?? null,
    request: args.request,
    metadataJson: {
      version: args.version,
      documentId: document.id,
    },
  }).catch(() => undefined);

  return {
    fileName: document.fileName,
    buffer: await readPdfBufferFromDocument(document),
  };
}

export async function downloadCasePdfVersion(args: {
  auth: AuthContext;
  caseId: string;
  version: number;
  request?: NextRequest;
}) {
  const { caseRecord, document } = await getCasePdfDocumentByVersion(args.auth, args.caseId, args.version);

  await writeAuditLog({
    tenantId: caseRecord.tenantId,
    userId: args.auth.sub,
    entityType: "case_pdf",
    entityId: document.id,
    action: "pdf_downloaded",
    details: `Downloaded legal case PDF v${args.version}`,
    caseId: args.caseId,
    documentId: document.id,
    metadataJson: { version: args.version },
    request: args.request,
  });

  logCasePdfLifecycle("download_access", {
    tenantId: caseRecord.tenantId,
    caseId: args.caseId,
    version: args.version,
    documentId: document.id,
    userId: args.auth.sub,
    role: args.auth.role ?? null,
  });

  await logReportAccess({
    tenantId: caseRecord.tenantId,
    caseId: args.caseId,
    reportKey: "case_pdf_download",
    exportFormat: "PDF",
    accessedByUserId: args.auth.sub,
    accessedByRole: args.auth.role ?? null,
    request: args.request,
    metadataJson: {
      version: args.version,
      documentId: document.id,
    },
  }).catch(() => undefined);

  return {
    fileName: document.fileName,
    buffer: await readPdfBufferFromDocument(document),
  };
}

export const __casePdfStorageInternals = {
  getPdfBinaryStorageMode,
  getPdfLocalStorageRoot,
  detectPdfRuntimeTarget,
  getConfiguredPuppeteerExecutablePath,
  resolveLocalPdfPath,
  getInlinePdfBase64,
  persistPdfBinary,
  getDocumentBinaryAvailability,
  getAuthoritativeCaseFacts,
  pickLatestValidCasePdfVersion,
};

export async function maybeAutoGenerateCasePdf(args: {
  auth: AuthContext;
  caseId: string;
  trigger: "auto_ready_for_legal" | "auto_escalated" | "auto_closed";
  request?: NextRequest;
  statusSnapshot?: string;
}) {
  const caseRecord = await getAuthorizedCase(args.auth, args.caseId);

  const latestPdf = caseRecord.documents
    .filter(isPdfReportDocument)
    .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0];
  const latestMeta = asRecord(latestPdf?.metadata ?? null);

  const currentStatus = args.statusSnapshot || summarizeCaseStatus(caseRecord);
  if (
    latestMeta &&
    readString(latestMeta, "trigger") === args.trigger &&
    readString(latestMeta, "status_snapshot") === currentStatus
  ) {
    return null;
  }

  const readiness = await getLegalReadiness(args.auth, args.caseId).catch(() => null);
  if (args.trigger === "auto_ready_for_legal" && !readiness?.readyForLegal) {
    return null;
  }
  const requestedFinal = args.trigger === "auto_closed" && Boolean(readiness?.readyForLegal);

  const result = await generateCasePdfReport({
    auth: args.auth,
    caseId: args.caseId,
    request: args.request,
    trigger: args.trigger,
    requestedFinal,
    language: "en",
    bypassAccessCheck: true,
  });

  await prisma().document.update({
    where: { id: result.report.id },
    data: {
      metadata: {
        ...(asRecord(
          (
            await prisma().document.findUnique({
              where: { id: result.report.id },
              select: { metadata: true },
            })
          )?.metadata,
        ) ?? {}),
        status_snapshot: currentStatus,
      } as JsonInputObject,
    },
  });

  return result;
}
