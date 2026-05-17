import fs from "node:fs";
import path from "node:path";

import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_TARGET_TENANT_ID = "8f20716f-7136-4f2f-9e80-d72e84f05865";
let targetTenantId = DEFAULT_TARGET_TENANT_ID;

type SeedCase = {
  mrn: string;
  caseNumber: string;
  patientName: string;
  patientIdNumber: string;
  encounterId: string;
  department: string;
  attendingPhysician: string;
  roomNumber: string;
};

const TARGET_CASES: SeedCase[] = [
  {
    mrn: "IMC-2026-02000",
    caseNumber: "CASE-2026-0001",
    patientName: "Najib الفلاح",
    patientIdNumber: "UAT-ID-02000",
    encounterId: "ENC-2026-02000",
    department: "INTERNAL MEDICINE",
    attendingPhysician: "Dr. Salim Al-Harbi",
    roomNumber: "3A",
  },
  {
    mrn: "IMC-2026-02001",
    caseNumber: "CASE-2026-0002",
    patientName: "Mariam القحطاني",
    patientIdNumber: "UAT-ID-02001",
    encounterId: "ENC-2026-02001",
    department: "CARDIOLOGY",
    attendingPhysician: "Dr. Hana Al-Qahtani",
    roomNumber: "5B",
  },
  {
    mrn: "IMC-2026-02024",
    caseNumber: "CASE-2026-0024",
    patientName: "Yousef العتيبي",
    patientIdNumber: "UAT-ID-02024",
    encounterId: "ENC-2026-02024",
    department: "ORTHOPEDICS",
    attendingPhysician: "Dr. Faisal Al-Otaibi",
    roomNumber: "7C",
  },
];

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

function loadRuntimeEnv(): void {
  const appRoot = path.resolve(__dirname, "..");

  loadEnvFile(path.join(appRoot, ".env.production"));
  loadEnvFile(path.join(appRoot, ".env.vercel.production"));
  loadEnvFile(path.join(appRoot, ".env.vercel.production.release"));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeJson(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    const existing = merged[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      merged[key] = mergeJson(existing, value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function buildMetadata(seedCase: SeedCase, existingMetadata: Prisma.JsonValue | null): Prisma.InputJsonValue {
  const current = isPlainObject(existingMetadata) ? existingMetadata : {};
  const encounterSummary = {
    id: seedCase.encounterId,
    encounter_id: seedCase.encounterId,
    encounter_number: seedCase.encounterId,
    department: seedCase.department,
    attending_physician: seedCase.attendingPhysician,
    patient_name: seedCase.patientName,
    medical_record_number: seedCase.mrn,
  };

  return mergeJson(current, {
    patient_name: seedCase.patientName,
    patient_mrn: seedCase.mrn,
    patient_id_number: seedCase.patientIdNumber,
    medical_record_number: seedCase.mrn,
    encounter_id: seedCase.encounterId,
    encounterId: seedCase.encounterId,
    encounter_number: seedCase.encounterId,
    department: seedCase.department,
    ward: seedCase.department,
    attending_physician: seedCase.attendingPhysician,
    doctor_name: seedCase.attendingPhysician,
    encounter: encounterSummary,
    encounters: [encounterSummary],
    workflow: {
      patient_name: seedCase.patientName,
      patient_id_number: seedCase.patientIdNumber,
      medical_record_number: seedCase.mrn,
      encounter_id: seedCase.encounterId,
      responsible_department: seedCase.department,
      attending_physician: seedCase.attendingPhysician,
      room_number: seedCase.roomNumber,
    },
    uat_seed: {
      source: "apps/web/scripts/seed-uat-patients.ts",
      targetTenantId,
      seededMrn: seedCase.mrn,
      version: 1,
      seededAt: new Date().toISOString(),
    },
  }) as Prisma.InputJsonValue;
}

async function resolveActorUserId(): Promise<string> {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: targetTenantId,
      status: "ACTIVE",
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: { userId: true },
  });

  if (membership?.userId) {
    return membership.userId;
  }

  const actor = await prisma.user.findFirst({
    where: {
      tenantId: targetTenantId,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  if (!actor) {
    throw new Error(`No user found for tenant ${targetTenantId}`);
  }

  return actor.id;
}

async function ensureTargetTenantExists(): Promise<void> {
  const targetTenant = await prisma.tenant.findUnique({
    where: { id: targetTenantId },
    select: { id: true, code: true, name: true, isActive: true, isPlatform: true },
  });

  if (targetTenant) {
    return;
  }

  const imcTenant = await prisma.tenant.findUnique({
    where: { code: "IMC" },
    select: { id: true, code: true, name: true, isActive: true, isPlatform: true },
  });

  const suggestion = imcTenant
    ? ` Active IMC tenant found at ${imcTenant.id} (${imcTenant.name}, active=${imcTenant.isActive}, platform=${imcTenant.isPlatform}).`
    : "";

  throw new Error(`Target tenant ${targetTenantId} was not found in the connected database.${suggestion}`);
}

async function findExistingCase(seedCase: SeedCase) {
  const matches = await prisma.case.findMany({
    where: {
      tenantId: targetTenantId,
      OR: [
        { medicalRecordNo: seedCase.mrn },
        { caseNumber: seedCase.caseNumber },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      caseNumber: true,
      medicalRecordNo: true,
      metadata: true,
    },
  });

  const distinctIds = [...new Set(matches.map((item) => item.id))];
  if (distinctIds.length > 1) {
    throw new Error(
      `Ambiguous existing cases for ${seedCase.mrn}: ${matches
        .map((item) => `${item.id}:${item.caseNumber ?? "NO_CASE"}:${item.medicalRecordNo ?? "NO_MRN"}`)
        .join(", ")}`
    );
  }

  return matches[0] ?? null;
}

async function seedCase(actorUserId: string, seedCaseData: SeedCase) {
  const existing = await findExistingCase(seedCaseData);
  const metadata = buildMetadata(seedCaseData, existing?.metadata ?? null);

  if (existing) {
    const updated = await prisma.case.update({
      where: { id: existing.id },
      data: {
        caseNumber: seedCaseData.caseNumber,
        caseType: "GENERAL",
        title: `UAT seeded patient ${seedCaseData.patientName}`,
        status: "OPEN",
        workflowType: "informed-consent",
        patientName: seedCaseData.patientName,
        patientIdNumber: seedCaseData.patientIdNumber,
        medicalRecordNo: seedCaseData.mrn,
        roomNumber: seedCaseData.roomNumber,
        updatedByUserId: actorUserId,
        metadata,
      },
      select: {
        id: true,
        caseNumber: true,
        medicalRecordNo: true,
      },
    });

    return { action: "updated" as const, ...updated };
  }

  const created = await prisma.case.create({
    data: {
      tenantId: targetTenantId,
      caseNumber: seedCaseData.caseNumber,
      caseType: "GENERAL",
      title: `UAT seeded patient ${seedCaseData.patientName}`,
      status: "OPEN",
      workflowType: "informed-consent",
      patientName: seedCaseData.patientName,
      patientIdNumber: seedCaseData.patientIdNumber,
      medicalRecordNo: seedCaseData.mrn,
      roomNumber: seedCaseData.roomNumber,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      metadata,
    },
    select: {
      id: true,
      caseNumber: true,
      medicalRecordNo: true,
    },
  });

  return { action: "created" as const, ...created };
}

async function main(): Promise<void> {
  loadRuntimeEnv();

  const tenantOverride = process.env.UAT_SEED_TENANT_ID?.trim();
  if (tenantOverride) {
    targetTenantId = tenantOverride;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set after loading production env files");
  }

  await ensureTargetTenantExists();
  const actorUserId = await resolveActorUserId();
  const results = [];

  for (const seedCaseData of TARGET_CASES) {
    results.push(await seedCase(actorUserId, seedCaseData));
  }

  const verification = await prisma.case.findMany({
    where: {
      tenantId: targetTenantId,
      medicalRecordNo: {
        in: TARGET_CASES.map((item) => item.mrn),
      },
    },
    orderBy: [{ medicalRecordNo: "asc" }],
    select: {
      id: true,
      caseNumber: true,
      patientName: true,
      medicalRecordNo: true,
      metadata: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        tenantId: targetTenantId,
        results,
        verification: verification.map((item) => ({
          id: item.id,
          caseNumber: item.caseNumber,
          patientName: item.patientName,
          medicalRecordNo: item.medicalRecordNo,
          encounterId:
            isPlainObject(item.metadata) && typeof item.metadata.encounter_id === "string"
              ? item.metadata.encounter_id
              : null,
        })),
      },
      null,
      2
    )
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
