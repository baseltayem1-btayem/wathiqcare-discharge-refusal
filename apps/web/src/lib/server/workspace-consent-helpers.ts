import { getPrisma } from "@/lib/server/prisma";
import { createConsentDocument } from "@/lib/server/consent-library-service";
import type { AuthContext } from "@/lib/server/auth";
import { resolveApprovedProcedureConsentLink } from "@/lib/server/content-mapping-service";
import { resolveApprovedConsentSource } from "@/lib/server/approved-consent-source";
import { ENABLE_IMC_PILOT_PATIENTS } from "@/lib/config/feature-flags";

export function envBool(key: string): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function envList(key: string): string[] {
  const raw = process.env[key]?.trim();
  if (!raw) return [];
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

export function normalizePhoneNumber(value: string): string {
  const compact = value.replace(/[\s\-()]/g, "");
  if (!compact) return "";
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("966")) return `+${compact}`;
  if (compact.startsWith("05") && compact.length === 10) return `+966${compact.slice(1)}`;
  return `+${compact}`;
}

export function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isPilotPatientSendEnabled(): boolean {
  return envBool("FF_PATIENT_FACING_PILOT_SEND") || (process.env.VERCEL_ENV === "preview" && ENABLE_IMC_PILOT_PATIENTS);
}

export type AllowlistEvaluation = {
  allowlisted: boolean;
  mobileAllowed: boolean;
  emailAllowed: boolean;
  configMissing: boolean;
  pilotEnabled: boolean;
  reason: string;
};

const ALLOWLIST_CONFIG_KEYS = [
  "FF_PATIENT_FACING_PILOT_SEND",
  "PILOT_PATIENT_SEND_ALLOWLIST_MOBILE",
  "PILOT_PATIENT_SEND_ALLOWLIST_EMAIL",
];

function buildConfigMissingReason(): string {
  return `Pilot allowlist configuration is missing for this environment. Required keys: ${ALLOWLIST_CONFIG_KEYS.join(", ")}.`;
}

export function evaluateAllowlistedRecipient(
  mobileNumber: string,
  recipientEmail: string,
): AllowlistEvaluation {
  const pilotEnabled = isPilotPatientSendEnabled();

  const allowedMobiles = envList("PILOT_PATIENT_SEND_ALLOWLIST_MOBILE").map(normalizePhoneNumber);
  const allowedEmails = envList("PILOT_PATIENT_SEND_ALLOWLIST_EMAIL").map(normalizeRecipientEmail);

  const normalizedMobile = normalizePhoneNumber(mobileNumber);
  const normalizedEmail = normalizeRecipientEmail(recipientEmail);

  const mobileAllowed = normalizedMobile.length > 0 && allowedMobiles.includes(normalizedMobile);
  const emailAllowed = normalizedEmail.length > 0 && allowedEmails.includes(normalizedEmail);
  const allowlisted = pilotEnabled && (mobileAllowed || emailAllowed);
  const configMissing = pilotEnabled && allowedMobiles.length === 0 && allowedEmails.length === 0;

  let reason: string;
  if (!pilotEnabled) {
    reason = "Patient-facing pilot send is disabled.";
  } else if (configMissing) {
    reason = buildConfigMissingReason();
  } else if (allowlisted) {
    reason = "Recipient is approved for pilot send.";
  } else {
    reason = "Recipient is not in the pilot allowlist.";
  }

  return {
    allowlisted,
    mobileAllowed,
    emailAllowed,
    configMissing,
    pilotEnabled,
    reason,
  };
}

export function isAllowlistedRecipient(mobileNumber: string, recipientEmail: string): boolean {
  return evaluateAllowlistedRecipient(mobileNumber, recipientEmail).allowlisted;
}

export function extractContactDetails(metadata: unknown): {
  mobileNumber: string;
  email: string;
  patientName?: string;
} {
  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  const mobile = String(
    (meta.mobileNumber ?? meta.phone ?? meta.patientPhone ?? "") || "",
  );
  const email = String(
    (meta.email ?? meta.patientEmail ?? meta.emailAddress ?? "") || "",
  );
  const patientName = String((meta.patientName ?? "") || "");

  return {
    mobileNumber: mobile,
    email,
    patientName: patientName || undefined,
  };
}

export async function resolveCaseFromEncounter(tenantId: string, encounterId: string) {
  const prisma = getPrisma();
  const caseRecord = await prisma.case.findFirst({
    where: { id: encounterId, tenantId },
    select: {
      id: true,
      patientName: true,
      medicalRecordNo: true,
      metadata: true,
    },
  });
  return caseRecord;
}

export async function resolveTemplateFromProcedure(tenantId: string, procedureId: string) {
  const prisma = getPrisma();
  const approvedLink = await resolveApprovedProcedureConsentLink({
    tenantId,
    procedure: procedureId,
    procedureId,
  });

  if (!approvedLink) return null;

  const template = await prisma.consentTemplate.findFirst({
    where: { tenantId, id: approvedLink.approvedTemplateId },
  });
  const currentVersion = await prisma.consentTemplateVersion.findFirst({
    where: {
      tenantId,
      id: approvedLink.approvedTemplateVersionId,
      templateId: approvedLink.approvedTemplateId,
    },
  });

  if (!template || !currentVersion) return null;

  return { template, version: currentVersion, approvedLink };
}

function buildApprovedConsentMetadata(approvedLink: NonNullable<Awaited<ReturnType<typeof resolveApprovedProcedureConsentLink>>>) {
  const sourceInfo = resolveApprovedConsentSource(approvedLink.sourcePath);
  const source = approvedLink.approvalStatus === "ACTIVE" ? "imc-approved-library" : "approved-template-directory";

  return {
    approvedConsentFormId: approvedLink.approvedConsentFormId,
    clinicalConsentFormId: approvedLink.approvedConsentFormId,
    approvedConsentFormCode: approvedLink.formCode || approvedLink.templateCode,
    clinicalConsentFormCode: approvedLink.formCode || approvedLink.templateCode,
    approvedConsentFormTitleEn: approvedLink.titleEn,
    approvedConsentFormTitleAr: approvedLink.titleAr,
    clinicalConsentFormTitleEn: approvedLink.titleEn,
    clinicalConsentFormTitleAr: approvedLink.titleAr,
    approvedConsentFormVersion: approvedLink.version,
    clinicalConsentFormVersion: approvedLink.version,
    approvedConsentFormEffectiveDate: approvedLink.effectiveDate,
    pdfTemplateUrl: approvedLink.sourcePath,
    sourcePath: approvedLink.sourcePath,
    approvedConsentSource: source,
    approvedConsentSourceAvailable: sourceInfo.available,
    approvedConsentSourceKind: sourceInfo.sourceKind,
    governanceSnapshot: {
      source,
      sourcePath: approvedLink.sourcePath,
      checksum: approvedLink.checksum,
      effectiveDate: approvedLink.effectiveDate,
      sourceAvailable: sourceInfo.available,
      sourceKind: sourceInfo.sourceKind,
      resolutionPriority: approvedLink.resolutionPriority,
      matchedRuleId: approvedLink.matchedRuleId || null,
    },
  };
}

function needsApprovedConsentMetadata(metadata: unknown): boolean {
  const record = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};

  return !(
    typeof record.approvedConsentFormId === "string" && record.approvedConsentFormId.trim()
    && typeof record.pdfTemplateUrl === "string" && record.pdfTemplateUrl.trim()
    && typeof record.approvedConsentFormVersion === "string" && record.approvedConsentFormVersion.trim()
  );
}

export async function findOrCreateConsentDocument(
  tenantId: string,
  auth: AuthContext,
  caseId: string,
  template: { id: string; titleEn?: string | null; titleAr?: string | null },
  version: { id: string },
  approvedLink?: NonNullable<Awaited<ReturnType<typeof resolveApprovedProcedureConsentLink>>> | null,
) {
  const prisma = getPrisma();
  const approvedMetadata = approvedLink ? buildApprovedConsentMetadata(approvedLink) : null;

  const existing = await prisma.consentDocument.findFirst({
    where: { tenantId, caseId, templateId: template.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      documentVersion: true,
      consentReference: true,
      metadata: true,
    },
  });

  if (existing) {
    if (approvedMetadata && needsApprovedConsentMetadata(existing.metadata)) {
      const existingMetadata = existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? existing.metadata as Record<string, unknown>
        : {};

      await prisma.consentDocument.update({
        where: { id: existing.id },
        data: {
          metadata: {
            ...existingMetadata,
            ...approvedMetadata,
          },
        },
      });
    }

    return prisma.consentDocument.findUniqueOrThrow({
      where: { id: existing.id },
      select: {
        id: true,
        status: true,
        documentVersion: true,
        consentReference: true,
        metadata: true,
      },
    });
  }

  const newDocument = await createConsentDocument(auth, {
    caseId,
    templateId: template.id,
    templateVersionId: version.id,
    language: "bilingual",
    physicianName: auth.email || undefined,
    plannedProcedure: template.titleEn || template.titleAr || undefined,
    metadata: {
      source: "informed-consent-workspace",
      ...(approvedMetadata || {}),
    },
  });

  return prisma.consentDocument.findUniqueOrThrow({
    where: { id: newDocument.id },
    select: {
      id: true,
      status: true,
      documentVersion: true,
      consentReference: true,
      metadata: true,
    },
  });
}
