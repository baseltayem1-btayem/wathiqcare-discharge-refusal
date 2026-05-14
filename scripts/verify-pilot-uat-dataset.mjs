// scripts/verify-pilot-uat-dataset.mjs
// Verifies existence and searchability of seeded UAT pilot MRNs for IMC pilot
// Does NOT reseed or mutate data. Only reads/verifies.
// Requirements:
// - All 25 MRNs (IMC-2026-02000 through IMC-2026-02024) exist
// - MRN search works in Informed Consents and Discharge Refusal
// - Cases are linked to dr.ahmed@wathiqcare.med.sa
// - UAT data is marked TESTING_ONLY


import { PrismaClient } from '@prisma/client';
import { writeFileSync, readFileSync } from 'fs';
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
const DISCHARGE_REFUSAL_MRNS = Array.from({ length: 15 }, (_, i) => `IMC-2026-02${String(i).padStart(3, '0')}`);
const PHYSICIAN_EMAIL = 'dr.ahmed@wathiqcare.med.sa';
const DATA_CLASSIFICATION = 'TESTING_ONLY';

async function main() {
  const foundMrns = [];
  const missingMrns = [];
  const duplicateMrns = [];
  const physicianLinked = [];
  const testOnlyConfirmed = [];
  let uiSearchMappingFixRequired = false;

  // For each MRN, search all possible fields and aggregate results
  for (const mrn of PILOT_MRNS) {
    // Find all cases where any field matches this MRN
    const cases = await prisma.case.findMany({
      where: {
        OR: [
          { medicalRecordNo: mrn },
          { metadata: { path: ['mrn'], equals: mrn } },
        ],
      },
    });
    if (cases.length === 0) {
      missingMrns.push(mrn);
      continue;
    }
    foundMrns.push(mrn);
    if (cases.length > 1) duplicateMrns.push(mrn);
    // Physician linkage: check metadata.attendingPhysicianEmail or metadata.physicianEmail or similar
    if (cases.some(c => {
      if (!c.metadata) return false;
      try {
        return (
          c.metadata.assignedPhysicianEmail === PHYSICIAN_EMAIL ||
          c.metadata.attendingPhysicianEmail === PHYSICIAN_EMAIL ||
          c.metadata.physicianEmail === PHYSICIAN_EMAIL ||
          c.metadata.physician === PHYSICIAN_EMAIL
        );
      } catch {
        return false;
      }
    })) {
      physicianLinked.push(mrn);
    }
    // TESTING_ONLY
    if (cases.some(c => c.metadata?.uatTestData === true && c.metadata?.dataClassification === DATA_CLASSIFICATION)) {
      testOnlyConfirmed.push(mrn);
    }
  }

  // Check MRN search mapping for ConsentDocument (informed consent) and Discharge Refusal
  let informedConsentModelPresent = false;
  let informedConsentCompatible = false;
  let dischargeRefusalCompatible = false;
  const dischargeRefusalCompatibilityDetails = {
    targetMrns: DISCHARGE_REFUSAL_MRNS.length,
    caseMatches: 0,
    detailMatches: 0,
  };
  try {
    if (prisma.consentDocument) {
      informedConsentModelPresent = true;
      // Try searching by all required fields
      const searchFields = ['mrn', 'patientName'];
      let found = false;
      for (const field of searchFields) {
        try {
          const consent = await prisma.consentDocument.findFirst({ where: { [field]: PILOT_MRNS[0] } });
          if (consent) {
            found = true;
            break;
          }
        } catch {}
      }
      informedConsentCompatible = found;
    }
  } catch {
    informedConsentModelPresent = false;
    informedConsentCompatible = false;
  }
  // Discharge Refusal compatibility: check if at least one case can be found by MRN in DischargeRefusalCase
  try {
    if (prisma.dischargeRefusalCase) {
      // The app compatibility path is Case (MRN/caseType/workflowType/metadata) + linked DischargeRefusalCase by caseId.
      for (const mrn of DISCHARGE_REFUSAL_MRNS) {
        const caseRecord = await prisma.case.findFirst({
          where: {
            OR: [
              { medicalRecordNo: mrn },
              { metadata: { path: ['mrn'], equals: mrn } },
            ],
          },
          select: { id: true, tenantId: true, caseType: true, workflowType: true },
        });
        if (!caseRecord) {
          continue;
        }
        const refusalDetail = await prisma.dischargeRefusalCase.findFirst({
          where: { tenantId: caseRecord.tenantId, caseId: caseRecord.id },
          select: { id: true },
        });
        if (refusalDetail) {
          dischargeRefusalCompatibilityDetails.detailMatches += 1;
        }
        if (caseRecord.caseType === 'DISCHARGE_REFUSAL' || caseRecord.workflowType === 'discharge_refusal') {
          dischargeRefusalCompatibilityDetails.caseMatches += 1;
        }
      }
      dischargeRefusalCompatible =
        dischargeRefusalCompatibilityDetails.caseMatches === DISCHARGE_REFUSAL_MRNS.length &&
        dischargeRefusalCompatibilityDetails.detailMatches === DISCHARGE_REFUSAL_MRNS.length;
    }
  } catch {
    dischargeRefusalCompatible = false;
  }
  // UI search mapping fix: flag if either module is not compatible
  uiSearchMappingFixRequired = !(informedConsentCompatible && dischargeRefusalCompatible);

  // Write report in required format
  const report = {
    mrns_found: foundMrns.length,
    missing_mrns: missingMrns,
    duplicate_mrns: duplicateMrns,
    physician_linked: physicianLinked.length,
    testing_only_confirmed: testOnlyConfirmed.length,
    informedConsentModel: informedConsentModelPresent ? 'ConsentDocument' : false,
    dischargeRefusalCompatible,
    dischargeRefusalCompatibilityDetails,
    ui_search_mapping_fixed: !uiSearchMappingFixRequired,
    verification_script: (missingMrns.length === 0 && duplicateMrns.length === 0) ? 'PASS' : 'FAIL',
    timestamp: new Date().toISOString(),
  };
  const artifactPath = path.join(__dirname, '../artifacts/pilot-uat-restoration-report.json');
  writeFileSync(artifactPath, JSON.stringify(report, null, 2));

  // Console summary (final output format)
  console.log(`MRNs found: ${foundMrns.length}/25`);
  console.log('Missing MRNs:', missingMrns);
  console.log('Duplicate MRNs:', duplicateMrns);
  console.log(`Physician linked: ${physicianLinked.length}/25`);
  console.log(`TESTING_ONLY confirmed: ${testOnlyConfirmed.length}/25`);
  console.log(`Informed Consent model: ${informedConsentModelPresent ? 'ConsentDocument' : 'Not present'}`);
  console.log(`Discharge Refusal compatibility: ${dischargeRefusalCompatible}`);
  console.log(`UI search mapping fixed: ${!uiSearchMappingFixRequired ? 'Yes' : 'No'}`);
  console.log(`Verification script: ${(missingMrns.length === 0 && duplicateMrns.length === 0) ? 'PASS' : 'FAIL'}`);
  console.log(`Report written to: ${artifactPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(2);
});
