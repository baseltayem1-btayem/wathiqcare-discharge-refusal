import { getPrisma } from "@/lib/server/prisma";
import { createConsentDocument } from "@/lib/server/consent-library-service";
import type { AuthContext } from "@/lib/server/auth";

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
  return envBool("FF_PATIENT_FACING_PILOT_SEND");
}

export function isAllowlistedRecipient(mobileNumber: string, recipientEmail: string): boolean {
  if (!isPilotPatientSendEnabled()) return false;

  const allowedMobiles = envList("PILOT_PATIENT_SEND_ALLOWLIST_MOBILE").map(normalizePhoneNumber);
  const allowedEmails = envList("PILOT_PATIENT_SEND_ALLOWLIST_EMAIL").map(normalizeRecipientEmail);

  const normalizedMobile = normalizePhoneNumber(mobileNumber);
  const normalizedEmail = normalizeRecipientEmail(recipientEmail);

  const mobileAllowed = normalizedMobile.length > 0 && allowedMobiles.includes(normalizedMobile);
  const emailAllowed = normalizedEmail.length > 0 && allowedEmails.includes(normalizedEmail);

  return mobileAllowed || emailAllowed;
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
  const template = await prisma.consentTemplate.findFirst({
    where: {
      tenantId,
      OR: [
        { id: procedureId },
        { templateCode: { equals: procedureId, mode: "insensitive" } },
      ],
    },
    include: {
      versions: {
        where: { status: { in: ["APPROVED", "ACTIVE"] } },
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!template) return null;

  const currentVersion =
    template.versions[0] ??
    (await prisma.consentTemplateVersion.findFirst({
      where: { templateId: template.id, tenantId },
      orderBy: { versionNumber: "desc" },
      take: 1,
    }));

  if (!currentVersion) return null;

  return { template, version: currentVersion };
}

export async function findOrCreateConsentDocument(
  tenantId: string,
  auth: AuthContext,
  caseId: string,
  template: { id: string; titleEn?: string | null; titleAr?: string | null },
  version: { id: string },
) {
  const prisma = getPrisma();

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

  if (existing) return existing;

  const newDocument = await createConsentDocument(auth, {
    caseId,
    templateId: template.id,
    templateVersionId: version.id,
    language: "bilingual",
    physicianName: auth.email || undefined,
    plannedProcedure: template.titleEn || template.titleAr || undefined,
    metadata: { source: "informed-consent-workspace" },
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
