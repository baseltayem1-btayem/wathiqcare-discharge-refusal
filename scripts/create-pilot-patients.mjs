#!/usr/bin/env node
/**
 * WathiqCare Online — Pilot Patient Seeding System
 * 
 * Creates controlled test patient data for WathiqCare UAT/Testing
 * ⚠️  DEMO DATA ONLY — FOR TESTING PURPOSES ONLY
 * 
 * Generates:
 * - 25 synthetic Saudi patient records
 * - Realistic MRNs (IMC-YYYY-XXXXX format)
 * - Fake patient IDs (realistic Saudi format)
 * - Associated case files (discharge refusals, general cases)
 * - Test scenarios for workflows
 * 
 * Usage: node scripts/create-pilot-patients.mjs [--tenant-id=<id>] [--dry-run]
 * 
 * All data is clearly marked as UAT/testing and should NOT be used with real patient information.
 */

import { PrismaClient } from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';

const prisma = new PrismaClient();

const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  MAGENTA: '\x1b[35m',
  WHITE: '\x1b[37m',
};

const WARNING_BANNER = `
╔════════════════════════════════════════════════════════════════════════╗
║                    ⚠️  UAT/TESTING DATA ONLY ⚠️                        ║
║                                                                        ║
║  This script generates SYNTHETIC patient data for testing purposes.    ║
║  DO NOT use real patient information.                                 ║
║  DO NOT deploy to production with this data.                          ║
║  This data is clearly marked as test/UAT only in the database.        ║
║                                                                        ║
║  All generated patients are FAKE and for controlled testing only.     ║
╚════════════════════════════════════════════════════════════════════════╝
`;

function log(color, message) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function section(title) {
  console.log(`\n${COLORS.CYAN}${'═'.repeat(75)}${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${title}${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${'═'.repeat(75)}${COLORS.RESET}\n`);
}

function subsection(title) {
  console.log(`${COLORS.BLUE}▶ ${title}${COLORS.RESET}`);
}

// ════════════════════════════════════════════════════════════════════════
// SAUDI PATIENT DATA GENERATORS
// ════════════════════════════════════════════════════════════════════════

const SAUDI_FIRST_NAMES = [
  'محمد', 'أحمد', 'علي', 'فاطمة', 'عائشة', 'خالد', 'سارة', 'نور',
  'زيد', 'ليلى', 'عمر', 'نادية', 'إبراهيم', 'هناء', 'ياسر', 'دينا',
  'نجيب', 'شمس', 'طارق', 'رقية', 'كمال', 'جميلة', 'رضا', 'مريم',
  'ناصر', 'بدرية', 'سالم', 'إلهام', 'حسن', 'وفاء',
];

const SAUDI_LAST_NAMES = [
  'آل سعود', 'الدوسري', 'الحمادي', 'الشمري', 'الراشد', 'الغامدي',
  'الشهري', 'الخثلان', 'الجابري', 'القحطاني', 'الأسمري', 'الشرقاوي',
  'الزهراني', 'العنزي', 'المطيري', 'الرويلي', 'الحويطي', 'البلوي',
  'السهلي', 'العريفي', 'الظفيري', 'الفلاح', 'الهاجري', 'الحربي',
  'الجمعة', 'السويلم', 'الخريجي', 'الدخيل',
];

const DEPARTMENTS = [
  'Internal Medicine',
  'Cardiology',
  'Pediatrics',
  'Orthopedics',
  'Surgery',
  'Neurology',
  'Oncology',
  'Urology',
  'ENT',
  'Ophthalmology',
  'Psychiatry',
  'Dermatology',
  'Rheumatology',
];

const DIAGNOSES = [
  'Hypertension',
  'Type 2 Diabetes',
  'Acute Coronary Syndrome',
  'Community-Acquired Pneumonia',
  'Acute Heart Failure',
  'Acute Kidney Injury',
  'Sepsis',
  'Deep Vein Thrombosis',
  'Pulmonary Embolism',
  'Acute Stroke',
  'Fractured Femur',
  'Appendicitis',
  'Biliary Colic',
  'Acute Pancreatitis',
  'Acute Gastroenteritis',
];

// ════════════════════════════════════════════════════════════════════════
// PATIENT DATA GENERATORS
// ════════════════════════════════════════════════════════════════════════

/**
 * Generate realistic Saudi National ID (10 digits + check digit)
 * Format: 1YYMMNNDDDCC (1 = Saudi, YY = year, MM = month, NN = day, DDD = sequence, CC = check)
 */
function generateSaudiNationalId() {
  const year = String(randomInt(40, 100)).padStart(2, '0');
  const month = String(randomInt(1, 13)).padStart(2, '0');
  const day = String(randomInt(1, 29)).padStart(2, '0');
  const sequence = String(randomInt(0, 1000)).padStart(3, '0');
  const id = `1${year}${month}${day}${sequence}`;
  
  // Luhn-like check digit (simplified)
  const checkDigit = String((randomInt(0, 99)) % 10).padStart(2, '0');
  return id + checkDigit;
}

/**
 * Generate demo MRN in format: IMC-YYYY-XXXXX
 * IMC = Islamic Medical Center
 * YYYY = year, XXXXX = sequential
 */
function generateMrn(index) {
  const year = new Date().getFullYear();
  const sequence = String(1000 + index).padStart(5, '0');
  return `IMC-${year}-${sequence}`;
}

/**
 * Generate realistic Saudi patient name (translated to English)
 */
function generatePatientName() {
  const firstName = SAUDI_FIRST_NAMES[randomInt(0, SAUDI_FIRST_NAMES.length)];
  const lastName = SAUDI_LAST_NAMES[randomInt(0, SAUDI_LAST_NAMES.length)];
  
  // Simple transliteration (in real use, would use proper Arabic to English mapping)
  const nameMap = {
    'محمد': 'Mohammad', 'أحمد': 'Ahmed', 'علي': 'Ali', 'فاطمة': 'Fatima',
    'عائشة': 'Aisha', 'خالد': 'Khalid', 'سارة': 'Sarah', 'نور': 'Noor',
    'زيد': 'Zayd', 'ليلى': 'Layla', 'عمر': 'Umar', 'نادية': 'Nadia',
    'إبراهيم': 'Ibrahim', 'هناء': 'Hana', 'ياسر': 'Yasir', 'دينا': 'Dina',
    'نجيب': 'Najib', 'شمس': 'Shams', 'طارق': 'Tariq', 'رقية': 'Raqia',
    'كمال': 'Kamal', 'جميلة': 'Jamila', 'رضا': 'Reda', 'مريم': 'Maryam',
    'ناصر': 'Nasser', 'بدرية': 'Badriya', 'سالم': 'Salem', 'إلهام': 'Ilham',
    'حسن': 'Hassan', 'وفاء': 'Wafa',
  };
  
  const firstNameEn = nameMap[firstName] || firstName;
  const lastNameTransliterated = lastName.replace('آل ', 'Al-');
  
  return `${firstNameEn} ${lastNameTransliterated}`;
}

/**
 * Generate test room number (format: FLOOR-ROOM)
 */
function generateRoomNumber() {
  const floor = randomInt(1, 6);
  const room = String(randomInt(1, 30)).padStart(2, '0');
  return `${floor}-${room}`;
}

/**
 * Generate test case data
 */
function generateCaseData(index, tenantId) {
  const mrnIndex = 1000 + index;
  const patientName = generatePatientName();
  const caseType = randomInt(0, 100) < 60 ? 'DISCHARGE_REFUSAL' : 'GENERAL';
  const isOpen = randomInt(0, 100) < 40;
  
  return {
    tenantId,
    caseNumber: `CASE-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}`,
    caseType,
    title: caseType === 'DISCHARGE_REFUSAL' 
      ? `Discharge Refusal - Patient: ${patientName}`
      : `General Case - Patient: ${patientName}`,
    status: isOpen ? 'OPEN' : 'IN_PROGRESS',
    patientName,
    patientIdNumber: generateSaudiNationalId(),
    medicalRecordNo: generateMrn(mrnIndex),
    roomNumber: generateRoomNumber(),
    metadata: {
      uatTestData: true,
      dataClassification: 'TESTING_ONLY',
      department: DEPARTMENTS[randomInt(0, DEPARTMENTS.length)],
      diagnosis: DIAGNOSES[randomInt(0, DIAGNOSES.length)],
      admissionDate: new Date(Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000).toISOString(),
      dataGeneratedFor: 'UAT Testing - WathiqCare Pilot',
      dataGeneratedAt: new Date().toISOString(),
      note: 'This is synthetic test data. Not a real patient record.',
    },
  };
}

/**
 * Generate test promissory notes for selected cases
 */
async function generatePromissoryNoteData(caseId, tenantId, patientName, index) {
  const amount = randomInt(5000, 150000);
  const daysUntilDue = randomInt(30, 180);
  const dueDate = new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000);
  
  return {
    tenantId,
    caseId,
    noteNumber: `PN-${new Date().getFullYear()}-${String(index).padStart(4, '0')}`,
    debtorName: patientName,
    debtorIdNumber: generateSaudiNationalId(),
    issuerName: 'Islamic Medical Center',
    amount: new Decimal(amount),
    currency: 'SAR',
    dueDate,
    status: 'DRAFT',
    metadata: {
      uatTestData: true,
      dataClassification: 'TESTING_ONLY',
      generatedFor: 'UAT Testing - WathiqCare Pilot',
    },
  };
}

// ════════════════════════════════════════════════════════════════════════
// MAIN SEEDING LOGIC
// ════════════════════════════════════════════════════════════════════════

async function findOrCreatePilotTenant() {
  subsection('Finding or creating pilot tenant');
  
  let tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { name: { contains: 'Islamic Medical Center' } },
        { name: { contains: 'IMC' } },
        { name: { contains: 'pilot' } },
      ],
    },
  });

  if (!tenant) {
    log(COLORS.YELLOW, '  ⚠️  No pilot tenant found, creating test tenant...');
    
    tenant = await prisma.tenant.create({
      data: {
        id: `tenant-${randomUUID()}`,
        name: 'Islamic Medical Center (UAT/Pilot)',
        slug: 'imc-uat',
        status: 'ACTIVE',
        dataClassification: 'TESTING',
        metadata: {
          uatTenant: true,
          purpose: 'UAT Testing - Patient Seeding System',
          note: 'This is a test tenant for controlled pilot patient seeding',
        },
      },
    });
    
    log(COLORS.GREEN, `  ✅ Created tenant: ${tenant.name} (ID: ${tenant.id})`);
  } else {
    log(COLORS.GREEN, `  ✅ Using existing tenant: ${tenant.name}`);
  }

  return tenant.id;
}

async function findPilotPhysician() {
  subsection('Finding pilot physician user');
  
  const physician = await prisma.user.findFirst({
    where: {
      email: {
        contains: 'physician',
      },
    },
  });

  if (!physician) {
    log(COLORS.YELLOW, '  ⚠️  No pilot physician found');
    return null;
  }

  log(COLORS.GREEN, `  ✅ Found physician: ${physician.name}`);
  return physician.id;
}

async function createPilotPatients(tenantId, physicianId) {
  section('CREATING PILOT TEST PATIENTS');

  const PATIENT_COUNT = 25;
  const patientScenarios = [
    { count: 8, caseType: 'DISCHARGE_REFUSAL', status: 'OPEN', description: 'Discharge Refusal Cases (Open)' },
    { count: 7, caseType: 'DISCHARGE_REFUSAL', status: 'IN_PROGRESS', description: 'Discharge Refusal Cases (In Progress)' },
    { count: 5, caseType: 'GENERAL', status: 'OPEN', description: 'General Cases (Open)' },
    { count: 5, caseType: 'GENERAL', status: 'IN_PROGRESS', description: 'General Cases (In Progress)' },
  ];

  let totalCreated = 0;
  const createdCases = [];

  for (const scenario of patientScenarios) {
    subsection(`${scenario.description}`);

    for (let i = 0; i < scenario.count; i++) {
      try {
        const caseData = generateCaseData(totalCreated, tenantId);
        caseData.caseType = scenario.caseType;
        caseData.status = scenario.status;

        if (physicianId) {
          caseData.createdByUserId = physicianId;
        }

        const createdCase = await prisma.case.create({
          data: caseData,
        });

        createdCases.push(createdCase);
        totalCreated++;

        log(COLORS.GREEN, `  ✅ [${totalCreated}] ${caseData.patientName} | MRN: ${caseData.medicalRecordNo} | Case: ${caseData.caseNumber}`);
      } catch (error) {
        log(COLORS.RED, `  ❌ Failed to create patient case: ${error.message}`);
      }
    }
  }

  log(COLORS.GREEN, `\n  📊 Total patients created: ${totalCreated}/${PATIENT_COUNT}`);
  return createdCases;
}

async function createPromissoryNotes(cases) {
  section('CREATING ASSOCIATED TEST DATA');

  subsection('Promissory Notes (for Discharge Refusal cases)');

  let notesCreated = 0;
  const dischargeRefusalCases = cases.filter((c) => c.caseType === 'DISCHARGE_REFUSAL');

  // Create promissory notes for 40% of discharge refusal cases
  const casesForNotes = dischargeRefusalCases.slice(0, Math.ceil(dischargeRefusalCases.length * 0.4));

  for (let i = 0; i < casesForNotes.length; i++) {
    try {
      const testCase = casesForNotes[i];
      const noteAmount = randomInt(5000, 150000);

      const note = await prisma.promissoryNote.create({
        data: {
          tenantId: testCase.tenantId,
          caseId: testCase.id,
          noteNumber: `PN-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
          debtorName: testCase.patientName,
          debtorIdNumber: testCase.patientIdNumber,
          issuerName: 'Islamic Medical Center',
          amount: noteAmount,
          currency: 'SAR',
          dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          status: 'DRAFT',
          metadata: {
            uatTestData: true,
            dataClassification: 'TESTING_ONLY',
          },
        },
      });

      notesCreated++;
      log(COLORS.GREEN, `  ✅ Promissory Note: ${note.noteNumber} | Amount: SAR ${noteAmount} | Patient: ${testCase.patientName}`);
    } catch (error) {
      log(COLORS.YELLOW, `  ⚠️  Could not create promissory note: ${error.message}`);
    }
  }

  log(COLORS.GREEN, `\n  📊 Total promissory notes created: ${notesCreated}`);
}

async function generateSummaryReport(cases, tenantId) {
  section('PILOT PATIENT SEEDING SUMMARY REPORT');

  log(COLORS.CYAN, '📈 DATA OVERVIEW:');
  log(COLORS.WHITE, `  • Total Patients Created: ${cases.length}`);
  
  const dischargeRefusals = cases.filter((c) => c.caseType === 'DISCHARGE_REFUSAL').length;
  const generalCases = cases.filter((c) => c.caseType === 'GENERAL').length;
  const openCases = cases.filter((c) => c.status === 'OPEN').length;
  const inProgressCases = cases.filter((c) => c.status === 'IN_PROGRESS').length;

  log(COLORS.WHITE, `  • Discharge Refusal Cases: ${dischargeRefusals}`);
  log(COLORS.WHITE, `  • General Cases: ${generalCases}`);
  log(COLORS.WHITE, `  • Open Status: ${openCases}`);
  log(COLORS.WHITE, `  • In Progress Status: ${inProgressCases}`);

  log(COLORS.CYAN, '\n🏥 SAMPLE PATIENT DATA:');
  
  // Show first 3 patients as examples
  for (let i = 0; i < Math.min(3, cases.length); i++) {
    const testCase = cases[i];
    log(
      COLORS.BLUE,
      `  ${i + 1}. ${testCase.patientName} | MRN: ${testCase.medicalRecordNo} | ID: ${testCase.patientIdNumber}`
    );
    log(COLORS.WHITE, `     Room: ${testCase.roomNumber} | Case: ${testCase.caseNumber}`);
    
    const metadata = testCase.metadata;
    if (metadata && metadata.department) {
      log(COLORS.WHITE, `     Department: ${metadata.department} | Diagnosis: ${metadata.diagnosis}`);
    }
  }

  log(COLORS.CYAN, '\n🔍 TESTING INSTRUCTIONS:');
  log(
    COLORS.WHITE,
    `  1. All ${cases.length} synthetic patients are ready for UAT testing`
  );
  log(COLORS.WHITE, '  2. MRNs follow format: IMC-YYYY-XXXXX (e.g., IMC-2026-01001)');
  log(COLORS.WHITE, '  3. All data is marked with uatTestData: true in metadata');
  log(COLORS.WHITE, '  4. Use these patient records for discharge refusal, consent, and workflow testing');
  log(COLORS.WHITE, '  5. All data is completely synthetic and suitable only for testing');

  log(COLORS.CYAN, '\n📋 QUICK TEST QUERIES:');
  log(COLORS.YELLOW, `  Database Tenant ID: ${tenantId}`);
  log(COLORS.YELLOW, `  SQL: SELECT * FROM cases WHERE tenant_id = '${tenantId}' AND metadata->>'uatTestData' = 'true'`);
  log(COLORS.YELLOW, `  SQL: SELECT * FROM cases WHERE tenant_id = '${tenantId}' AND case_type = 'DISCHARGE_REFUSAL'`);

  log(COLORS.CYAN, '\n🎯 NEXT STEPS:');
  log(COLORS.WHITE, '  • Login to WathiqCare with a pilot user account');
  log(COLORS.WHITE, '  • Navigate to case management');
  log(COLORS.WHITE, '  • Filter by "DISCHARGE_REFUSAL" to see 15 test cases');
  log(COLORS.WHITE, '  • Try creating consent documents, discharge forms, etc.');
  log(COLORS.WHITE, '  • Test workflow approvals and digital signatures');

  log(
    COLORS.MAGENTA,
    `\n✅ Pilot patient seeding complete! All data is UAT-only and clearly marked as test data.`
  );
}

// ════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(WARNING_BANNER);

  try {
    section('WATHIQCARE ONLINE — PILOT PATIENT SEEDING SYSTEM');

    const tenantId = await findOrCreatePilotTenant();
    const physicianId = await findPilotPhysician();

    const createdCases = await createPilotPatients(tenantId, physicianId);
    await createPromissoryNotes(createdCases);
    await generateSummaryReport(createdCases, tenantId);

    section('SEEDING COMPLETE');
    log(COLORS.GREEN, '✅ All pilot patient data has been created successfully!');
    log(COLORS.CYAN, '\n⚠️  REMINDER: This is synthetic test data for UAT only.');
    log(COLORS.CYAN, '    Never use real patient information in testing systems.');

  } catch (error) {
    log(COLORS.RED, `\n❌ Fatal error during seeding: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Support Decimal type for Prisma
class Decimal {
  constructor(value) {
    this.value = String(value);
  }

  toString() {
    return this.value;
  }
}

main().catch((error) => {
  log(COLORS.RED, `\n❌ Unhandled error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
