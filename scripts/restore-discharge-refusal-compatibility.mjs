// scripts/restore-discharge-refusal-compatibility.mjs
// Restore discharge refusal compatibility for existing pilot UAT cases only (MRNs 02000..02014).

import { PrismaClient, CaseType } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.join(__dirname, '../apps/web/.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const dbUrlMatch = envContent.match(/DATABASE_URL=([^\n]+)/);
    if (dbUrlMatch) {
      process.env.DATABASE_URL = dbUrlMatch[1];
      console.log('Loaded DATABASE_URL from .env.local');
    }
  } catch (error) {
    console.error('Failed to load DATABASE_URL from apps/web/.env.local:', error);
  }
}

const prisma = new PrismaClient();

const TARGET_MRNS = Array.from({ length: 15 }, (_, i) => `IMC-2026-02${String(i).padStart(3, '0')}`);
const PHYSICIAN_EMAIL = 'dr.ahmed@wathiqcare.med.sa';
const SOURCE = 'restore-discharge-refusal-compatibility';

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function main() {
  const updatedCases = [];
  const createdRefusalDetails = [];
  const existingRefusalDetails = [];

  for (const mrn of TARGET_MRNS) {
    const caseRecord = await prisma.case.findFirst({
      where: {
        OR: [
          { medicalRecordNo: mrn },
          { metadata: { path: ['mrn'], equals: mrn } },
        ],
      },
    });

    if (!caseRecord) {
      continue;
    }

    const metadata = asObject(caseRecord.metadata);
    const nextMetadata = {
      ...metadata,
      uatTestData: true,
      dataClassification: 'TESTING_ONLY',
      source: SOURCE,
      assignedPhysicianEmail: PHYSICIAN_EMAIL,
    };

    await prisma.case.update({
      where: { id: caseRecord.id },
      data: {
        caseType: CaseType.DISCHARGE_REFUSAL,
        workflowType: 'discharge_refusal',
        metadata: nextMetadata,
      },
    });
    updatedCases.push(caseRecord.id);

    const existingDetail = await prisma.dischargeRefusalCase.findFirst({
      where: {
        tenantId: caseRecord.tenantId,
        caseId: caseRecord.id,
      },
      select: { id: true },
    });

    if (existingDetail) {
      existingRefusalDetails.push(existingDetail.id);
      continue;
    }

    const created = await prisma.dischargeRefusalCase.create({
      data: {
        tenantId: caseRecord.tenantId,
        caseId: caseRecord.id,
        dischargeStatus: 'pending_refusal_workflow',
      },
      select: { id: true },
    });
    createdRefusalDetails.push(created.id);
  }

  console.log(`Target MRNs: ${TARGET_MRNS.length}`);
  console.log(`Cases updated for refusal compatibility: ${updatedCases.length}`);
  console.log(`DischargeRefusalCase created: ${createdRefusalDetails.length}`);
  console.log(`DischargeRefusalCase already present: ${existingRefusalDetails.length}`);
}

main()
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
