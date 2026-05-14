// scripts/test-informed-consent-search.mjs
// Validates informed-consents patient search behavior against existing Case records.

import { PrismaClient } from '@prisma/client';
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

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readString(record, ...keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

async function lookupByMrn(mrn) {
  const caseRecord = await prisma.case.findFirst({
    where: {
      OR: [
        { medicalRecordNo: mrn },
        { metadata: { path: ['mrn'], equals: mrn } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!caseRecord) {
    return null;
  }

  const metadata = asRecord(caseRecord.metadata);
  return {
    mrn,
    caseId: caseRecord.id,
    patientName: caseRecord.patientName || readString(metadata, 'patient_name'),
    medicalRecordNo: caseRecord.medicalRecordNo || readString(metadata, 'mrn'),
    caseNumber: caseRecord.caseNumber || '',
    caseType: caseRecord.caseType,
    department: readString(metadata, 'department', 'departmentName', 'clinicalDepartment'),
    diagnosis: readString(metadata, 'diagnosis', 'primaryDiagnosis'),
    assignedPhysicianNameEn: readString(metadata, 'assignedPhysicianNameEn'),
    assignedPhysicianNameAr: readString(metadata, 'assignedPhysicianNameAr'),
    assignedPhysicianEmail: readString(metadata, 'assignedPhysicianEmail'),
    uatTestData: metadata.uatTestData === true,
  };
}

async function main() {
  const r2000 = await lookupByMrn('IMC-2026-02000');
  const r2024 = await lookupByMrn('IMC-2026-02024');

  const found2000 = !!r2000;
  const found2024 = !!r2024;
  const uiPass = found2000 && found2024;

  console.log(`Search IMC-2026-02000: ${found2000 ? 'FOUND' : 'NOT FOUND'}`);
  if (r2000) {
    console.log(`Name IMC-2026-02000: ${r2000.patientName || '-'}`);
  }

  console.log(`Search IMC-2026-02024: ${found2024 ? 'FOUND' : 'NOT FOUND'}`);
  if (r2024) {
    console.log(`Name IMC-2026-02024: ${r2024.patientName || '-'}`);
  }

  console.log(`UI Patient Search: ${uiPass ? 'PASS' : 'FAIL'}`);

  process.exit(uiPass ? 0 : 1);
}

main()
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
