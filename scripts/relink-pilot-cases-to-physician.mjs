// scripts/relink-pilot-cases-to-physician.mjs
// Relinks pilot UAT cases to the pilot physician and updates metadata as specified.

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-load DATABASE_URL from apps/web/.env.local if not set
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.join(__dirname, '../apps/web/.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const dbUrlMatch = envContent.match(/DATABASE_URL=([^\n]+)/);
    if (dbUrlMatch) {
      process.env.DATABASE_URL = dbUrlMatch[1];
      console.log('Loaded DATABASE_URL from .env.local');
    } else {
      console.error('DATABASE_URL not found in .env.local');
    }
  } catch (e) {
    console.error('Failed to load .env.local:', e);
  }
}

const prisma = new PrismaClient();

const PILOT_MRNS = Array.from({ length: 25 }, (_, i) => `IMC-2026-02${String(i).padStart(3, '0')}`);
const PHYSICIAN_EMAIL = 'dr.ahmed@wathiqcare.med.sa';
const PHYSICIAN_NAME_EN = 'Dr. Ahmed Al-Salmi';
const PHYSICIAN_NAME_AR = 'د. أحمد السالمي';
const PHYSICIAN_SPECIALTY = 'Internal Medicine / Emergency Medicine';
const DATA_CLASSIFICATION = 'TESTING_ONLY';

async function main() {
  // 1. Find the pilot physician
  const physician = await prisma.user.findUnique({ where: { email: PHYSICIAN_EMAIL } });
  if (!physician) {
    console.error('Pilot physician not found:', PHYSICIAN_EMAIL);
    process.exit(1);
  }

  let updated = 0;
  for (const mrn of PILOT_MRNS) {
    // 2. Find the case by MRN (medicalRecordNo or metadata.mrn)
    const cases = await prisma.case.findMany({
      where: {
        OR: [
          { medicalRecordNo: mrn },
          { metadata: { path: ['mrn'], equals: mrn } },
        ],
      },
    });
    for (const c of cases) {
      // 3. Update linkage and metadata
      const newMeta = {
        ...(c.metadata || {}),
        assignedPhysicianId: physician.id,
        assignedPhysicianEmail: PHYSICIAN_EMAIL,
        assignedPhysicianNameEn: PHYSICIAN_NAME_EN,
        assignedPhysicianNameAr: PHYSICIAN_NAME_AR,
        physicianSpecialty: PHYSICIAN_SPECIALTY,
        physicianAssignedAt: new Date().toISOString(),
        uatTestData: true,
        dataClassification: DATA_CLASSIFICATION,
      };
      await prisma.case.update({
        where: { id: c.id },
        data: {
          createdByUserId: physician.id,
          metadata: newMeta,
        },
      });
      updated++;
    }
  }
  console.log(`Relinked ${updated} pilot UAT cases to physician.`);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(2);
});
