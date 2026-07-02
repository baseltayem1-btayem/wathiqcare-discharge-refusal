#!/usr/bin/env node
/**
 * Generate CSV and Markdown artifacts from the typed pilot patient dataset.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const tsFile = path.join(
  repoRoot,
  "apps",
  "web",
  "src",
  "components",
  "informed-consents",
  "production-workspace",
  "lib",
  "pilot-patients.ts"
);

async function main() {
// Import the TS module dynamically via tsx loader
const { imcPilotPatients } = await import(pathToFileURL(tsFile).href);

const patients = imcPilotPatients;

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const headers = [
  "Pilot ID",
  "URN",
  "MRN",
  "Patient Name",
  "Gender",
  "DOB",
  "Age",
  "National ID",
  "Nationality",
  "Mobile",
  "Email",
  "Visit No",
  "Encounter No",
  "Admission Date",
  "Visit Date",
  "Discharge Date",
  "Department",
  "Ward",
  "Room",
  "Bed",
  "Planned Surgery",
  "Diagnosis",
  "Consultant",
  "Surgeon",
  "Anesthesiologist",
  "Procedure Date",
  "Blood Group",
  "Height (cm)",
  "Weight (kg)",
  "BMI",
  "Allergies",
  "Chronic Disease",
  "Current Medication",
  "Payor Name",
  "Plan Name",
  "Policy No",
  "Eligibility",
  "Approval Code",
  "Claim Form No",
  "Tax Invoice No",
  "Tax Invoice Date",
  "Receipt No",
  "VAT Reg No",
  "VAT Rep Name",
  "Payor TRN",
  "Admitting DRG",
  "Final DRG",
  "Employee No",
  "Consent Status",
  "OTP Status",
  "Signature Status",
  "Audit Status",
  "Final PDF ID",
  "Evidence Package ID",
  "QR Code ID",
  "Case Coordinator",
  "Nurse Assigned",
  "OR Number",
  "Theatre Schedule",
  "ASA Classification",
  "NPO Status",
  "Fall Risk",
  "Infection Status",
  "Isolation Status",
  "Pregnancy Status",
];

const rows = patients.map((p) => [
  p.pilotId,
  p.urn,
  p.mrn,
  p.name,
  p.gender,
  p.dateOfBirth,
  p.age,
  p.nationalId,
  p.nationality,
  p.mobile,
  p.email,
  p.visitNo,
  p.encounterNo,
  p.admissionDate,
  p.visitDate,
  p.dischargeDate,
  p.department,
  p.ward,
  p.room,
  p.bed,
  p.plannedSurgery,
  p.diagnosis,
  p.consultant,
  p.surgeon,
  p.anesthesiologist,
  p.procedureDate,
  p.bloodGroup,
  p.heightCm,
  p.weightKg,
  p.bmi,
  p.allergies,
  p.chronicDisease,
  p.currentMedication,
  p.payorName,
  p.planName,
  p.policyNo,
  p.eligibility,
  p.approvalCode,
  p.claimFormNo,
  p.taxInvoiceNo,
  p.taxInvoiceDate,
  p.receiptNo,
  p.vatRegNo,
  p.vatRepName,
  p.payorTrn,
  p.admittingDrg,
  p.finalDrg,
  p.employeeNo,
  p.consentStatus,
  p.otpStatus,
  p.signatureStatus,
  p.auditStatus,
  p.finalPdfId,
  p.evidencePackageId,
  p.qrCodeId,
  p.caseCoordinator,
  p.nurseAssigned,
  p.orNumber,
  p.theatreSchedule,
  p.asaClassification,
  p.npoStatus,
  p.fallRisk,
  p.infectionStatus,
  p.isolationStatus,
  p.pregnancyStatus,
]);

const csv = [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");

const csvPath = path.join(repoRoot, "docs", "release", "IMC_PILOT_PATIENTS_DATASET.csv");
fs.writeFileSync(csvPath, csv, "utf8");
console.log(`CSV written: ${csvPath}`);

const md = `# IMC Pilot Patients Dataset

**Status:** PILOT TEST DATA ONLY — NOT REAL PATIENT DATA  
**Source file:** \`apps/web/src/components/informed-consents/production-workspace/lib/pilot-patients.ts\`  
**Records:** ${patients.length}  
**Feature flag:** \`ENABLE_IMC_PILOT_PATIENTS\` (default: false)  

## Purpose

This dataset provides synthetic HIS-like inpatient records for the WathiqCare Internal IMC Pilot. It is used to validate the informed-consent workflow end-to-end without touching production real patient data.

## Important safety rules

1. **Do not connect to real patient records** unless explicitly instructed.
2. **Do not use outside the pilot environment** unless approved.
3. **All records are clearly prefixed with "PILOT"** in the patient name.
4. **Exposure to the workspace is gated** by \`ENABLE_IMC_PILOT_PATIENTS=true\`.

## Record summary

| # | Pilot ID | Name | MRN | Procedure | Consultant |
|---|----------|------|-----|-----------|------------|
${patients
  .map(
    (p, idx) =>
      `| ${idx + 1} | ${p.pilotId} | ${p.name} | ${p.mrn} | ${p.plannedSurgery} | ${p.consultant} |`
  )
  .join("\n")}

## Field coverage

Each record includes the full field schema required for pilot testing. Fields not provided in the source brief are left empty / null and marked as Pending where applicable.

## Artifacts

- \`docs/release/IMC_PILOT_PATIENTS_DATASET.csv\` — full dataset in CSV form.
- \`apps/web/src/components/informed-consents/production-workspace/lib/pilot-patients.ts\` — typed TypeScript source.

## Wiring

When \`ENABLE_IMC_PILOT_PATIENTS=true\` is set, the workspace patient search will include these records as a static pilot fallback. When the flag is false or unset, the records are not exposed through the API.
`;

const mdPath = path.join(repoRoot, "docs", "release", "IMC_PILOT_PATIENTS_DATASET.md");
fs.writeFileSync(mdPath, md, "utf8");
console.log(`Markdown written: ${mdPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
