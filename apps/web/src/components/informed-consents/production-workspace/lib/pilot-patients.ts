/**
 * PILOT TEST DATA ONLY — NOT REAL PATIENT DATA
 *
 * IMC Internal Pilot patient dataset for the Informed Consents workflow.
 * These records are synthetic HIS-like test cases explicitly created for
 * pilot verification. They must NEVER be mixed with, mistaken for, or
 * connected to production real patient records unless explicitly instructed.
 *
 * Gating:
 *   - Exposed to the workspace patient search only when
 *     ENABLE_IMC_PILOT_PATIENTS === "true".
 *   - Default is false (disabled).
 */

export type PilotPatient = {
  /** Internal pilot identifier */
  pilotId: string;
  /** Unique Record Number (pilot) */
  urn: string;
  /** Medical Record Number (pilot) */
  mrn: string;
  /** Patient full name */
  name: string;
  /** Gender */
  gender: "Male" | "Female" | "Other";
  /** Date of birth (DD/MM/YYYY) */
  dateOfBirth: string;
  /** Computed age in years */
  age: number;
  /** Saudi National ID / Iqama (pilot test number) */
  nationalId: string;
  /** Nationality */
  nationality: string;
  /** Mobile number (pilot) */
  mobile: string;
  /** Pilot email address (test domain only) */
  email: string | null;
  /** Inpatient visit number */
  visitNo: string;
  /** Encounter number */
  encounterNo: string;
  /** Admission date (ISO 8601 or null) */
  admissionDate: string | null;
  /** Visit date (ISO 8601 or null) */
  visitDate: string | null;
  /** Discharge date (ISO 8601 or null) */
  dischargeDate: string | null;
  /** Department */
  department: string;
  /** Ward */
  ward: string | null;
  /** Room */
  room: string | null;
  /** Bed */
  bed: string | null;
  /** Planned surgery / procedure */
  plannedSurgery: string;
  /** Primary diagnosis */
  diagnosis: string;
  /** Attending consultant */
  consultant: string;
  /** Operating surgeon */
  surgeon: string;
  /** Anesthesiologist */
  anesthesiologist: string | null;
  /** Procedure date (ISO 8601 or null) */
  procedureDate: string | null;
  /** Blood group */
  bloodGroup: string | null;
  /** Height (cm) */
  heightCm: number | null;
  /** Weight (kg) */
  weightKg: number | null;
  /** BMI */
  bmi: number | null;
  /** Known allergies */
  allergies: string | null;
  /** Chronic diseases */
  chronicDisease: string | null;
  /** Current medications */
  currentMedication: string | null;
  /** Insurance payor name */
  payorName: string | null;
  /** Insurance plan name */
  planName: string | null;
  /** Policy number */
  policyNo: string | null;
  /** Eligibility status */
  eligibility: string | null;
  /** Approval code */
  approvalCode: string | null;
  /** Claim form number */
  claimFormNo: string | null;
  /** Tax invoice number */
  taxInvoiceNo: string | null;
  /** Tax invoice date */
  taxInvoiceDate: string | null;
  /** Receipt number */
  receiptNo: string | null;
  /** VAT registration number */
  vatRegNo: string | null;
  /** VAT representative name */
  vatRepName: string | null;
  /** Payor tax registration number */
  payorTrn: string | null;
  /** Admitting DRG */
  admittingDrg: string | null;
  /** Final DRG */
  finalDrg: string | null;
  /** Employee number (if staff patient) */
  employeeNo: string | null;
  /** Consent status */
  consentStatus: string | null;
  /** OTP delivery status */
  otpStatus: string | null;
  /** Signature status */
  signatureStatus: string | null;
  /** Audit status */
  auditStatus: string | null;
  /** Final PDF document ID */
  finalPdfId: string | null;
  /** Evidence package ID */
  evidencePackageId: string | null;
  /** QR code ID */
  qrCodeId: string | null;
  /** Case coordinator */
  caseCoordinator: string | null;
  /** Assigned nurse */
  nurseAssigned: string | null;
  /** Operating room number */
  orNumber: string | null;
  /** Theatre schedule */
  theatreSchedule: string | null;
  /** ASA classification */
  asaClassification: string | null;
  /** NPO status */
  npoStatus: string | null;
  /** Fall risk flag */
  fallRisk: string | null;
  /** Infection status */
  infectionStatus: string | null;
  /** Isolation status */
  isolationStatus: string | null;
  /** Pregnancy status (if applicable) */
  pregnancyStatus: string | null;
};

function parseDateOfBirth(dob: string): Date {
  const [day, month, year] = dob.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function computeAge(dob: string): number {
  const birth = parseDateOfBirth(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function buildPatient(record: Omit<PilotPatient, "age">): PilotPatient {
  return {
    ...record,
    age: computeAge(record.dateOfBirth),
  };
}

export const imcPilotPatients: PilotPatient[] = [
  buildPatient({
    pilotId: "IMC-PILOT-PT-000",
    urn: "974000",
    mrn: "MRN-2024-0847",
    name: "PILOT - Mohammed Ibrahim Al-Rashidi",
    gender: "Male",
    dateOfBirth: "14/03/1978",
    nationalId: "1012345678",
    nationality: "Saudi Arabian",
    mobile: "+966 50 234 5678",
    email: "m.alrashidi.pilot@wathiqcare.test",
    visitNo: "VISIT-2026-11452",
    encounterNo: "CASE-CRITICAL-CARE-KANZ-V9-20260612155742",
    admissionDate: null,
    visitDate: null,
    dischargeDate: null,
    department: "General Surgery",
    ward: null,
    room: null,
    bed: null,
    plannedSurgery: "General Surgery Consultation",
    diagnosis: "Insulin-Dependent Diabetes Mellitus",
    consultant: "Dr. Khalid Al-Qahtani",
    surgeon: "Dr. Khalid Al-Qahtani",
    anesthesiologist: null,
    procedureDate: null,
    bloodGroup: "A+",
    heightCm: null,
    weightKg: null,
    bmi: null,
    allergies: "Penicillin, NSAIDs",
    chronicDisease: null,
    currentMedication: null,
    payorName: null,
    planName: null,
    policyNo: null,
    eligibility: null,
    approvalCode: null,
    claimFormNo: null,
    taxInvoiceNo: null,
    taxInvoiceDate: null,
    receiptNo: null,
    vatRegNo: null,
    vatRepName: null,
    payorTrn: null,
    admittingDrg: null,
    finalDrg: null,
    employeeNo: null,
    consentStatus: "Pending",
    otpStatus: "Pending",
    signatureStatus: "Pending",
    auditStatus: "Pending",
    finalPdfId: null,
    evidencePackageId: null,
    qrCodeId: null,
    caseCoordinator: null,
    nurseAssigned: null,
    orNumber: null,
    theatreSchedule: null,
    asaClassification: null,
    npoStatus: null,
    fallRisk: null,
    infectionStatus: null,
    isolationStatus: null,
    pregnancyStatus: null,
  }),
  buildPatient({
    pilotId: "IMC-PILOT-PT-001",
    urn: "974001",
    mrn: "100246781",
    name: "PILOT - Asma Matar Alzahrani",
    gender: "Female",
    dateOfBirth: "24/07/1990",
    nationalId: "1067757300",
    nationality: "Saudi Arabian",
    mobile: "0542690673",
    email: "asma.alzahrani.pilot@wathiqcare.test",
    visitNo: "IP000010001",
    encounterNo: "ENC-2026-000001",
    admissionDate: null,
    visitDate: null,
    dischargeDate: null,
    department: "General Surgery",
    ward: null,
    room: null,
    bed: null,
    plannedSurgery: "Laparoscopic Cholecystectomy",
    diagnosis: "Symptomatic Cholelithiasis",
    consultant: "Dr. Suhaib Khayat",
    surgeon: "Dr. Suhaib Khayat",
    anesthesiologist: null,
    procedureDate: null,
    bloodGroup: null,
    heightCm: null,
    weightKg: null,
    bmi: null,
    allergies: null,
    chronicDisease: null,
    currentMedication: null,
    payorName: null,
    planName: null,
    policyNo: null,
    eligibility: null,
    approvalCode: null,
    claimFormNo: null,
    taxInvoiceNo: null,
    taxInvoiceDate: null,
    receiptNo: null,
    vatRegNo: null,
    vatRepName: null,
    payorTrn: null,
    admittingDrg: null,
    finalDrg: null,
    employeeNo: null,
    consentStatus: "Pending",
    otpStatus: "Pending",
    signatureStatus: "Pending",
    auditStatus: "Pending",
    finalPdfId: null,
    evidencePackageId: null,
    qrCodeId: null,
    caseCoordinator: null,
    nurseAssigned: null,
    orNumber: null,
    theatreSchedule: null,
    asaClassification: null,
    npoStatus: null,
    fallRisk: null,
    infectionStatus: null,
    isolationStatus: null,
    pregnancyStatus: null,
  }),
  buildPatient({
    pilotId: "IMC-PILOT-PT-002",
    urn: "974002",
    mrn: "100246782",
    name: "PILOT - Mohammed Abdullah Alharbi",
    gender: "Male",
    dateOfBirth: "15/03/1984",
    nationalId: "1078834215",
    nationality: "Saudi Arabian",
    mobile: "0556123487",
    email: "mohammed.alharbi.pilot@wathiqcare.test",
    visitNo: "IP000010002",
    encounterNo: "ENC-2026-000002",
    admissionDate: null,
    visitDate: null,
    dischargeDate: null,
    department: "General Surgery",
    ward: null,
    room: null,
    bed: null,
    plannedSurgery: "Right Inguinal Hernia Repair",
    diagnosis: "Right Inguinal Hernia",
    consultant: "Dr. Abdulaziz M. Saleem",
    surgeon: "Dr. Abdulaziz M. Saleem",
    anesthesiologist: null,
    procedureDate: null,
    bloodGroup: null,
    heightCm: null,
    weightKg: null,
    bmi: null,
    allergies: null,
    chronicDisease: null,
    currentMedication: null,
    payorName: null,
    planName: null,
    policyNo: null,
    eligibility: null,
    approvalCode: null,
    claimFormNo: null,
    taxInvoiceNo: null,
    taxInvoiceDate: null,
    receiptNo: null,
    vatRegNo: null,
    vatRepName: null,
    payorTrn: null,
    admittingDrg: null,
    finalDrg: null,
    employeeNo: null,
    consentStatus: "Pending",
    otpStatus: "Pending",
    signatureStatus: "Pending",
    auditStatus: "Pending",
    finalPdfId: null,
    evidencePackageId: null,
    qrCodeId: null,
    caseCoordinator: null,
    nurseAssigned: null,
    orNumber: null,
    theatreSchedule: null,
    asaClassification: null,
    npoStatus: null,
    fallRisk: null,
    infectionStatus: null,
    isolationStatus: null,
    pregnancyStatus: null,
  }),
  buildPatient({
    pilotId: "IMC-PILOT-PT-003",
    urn: "974003",
    mrn: "100246783",
    name: "PILOT - Noura Ahmed Alghamdi",
    gender: "Female",
    dateOfBirth: "08/11/1992",
    nationalId: "1089645321",
    nationality: "Saudi Arabian",
    mobile: "0537789456",
    email: "noura.alghamdi.pilot@wathiqcare.test",
    visitNo: "IP000010003",
    encounterNo: "ENC-2026-000003",
    admissionDate: null,
    visitDate: null,
    dischargeDate: null,
    department: "General Surgery",
    ward: null,
    room: null,
    bed: null,
    plannedSurgery: "Thyroid Lobectomy",
    diagnosis: "Thyroid Nodule",
    consultant: "Dr. Abrar Youssef Nawawi",
    surgeon: "Dr. Abrar Youssef Nawawi",
    anesthesiologist: null,
    procedureDate: null,
    bloodGroup: null,
    heightCm: null,
    weightKg: null,
    bmi: null,
    allergies: null,
    chronicDisease: null,
    currentMedication: null,
    payorName: null,
    planName: null,
    policyNo: null,
    eligibility: null,
    approvalCode: null,
    claimFormNo: null,
    taxInvoiceNo: null,
    taxInvoiceDate: null,
    receiptNo: null,
    vatRegNo: null,
    vatRepName: null,
    payorTrn: null,
    admittingDrg: null,
    finalDrg: null,
    employeeNo: null,
    consentStatus: "Pending",
    otpStatus: "Pending",
    signatureStatus: "Pending",
    auditStatus: "Pending",
    finalPdfId: null,
    evidencePackageId: null,
    qrCodeId: null,
    caseCoordinator: null,
    nurseAssigned: null,
    orNumber: null,
    theatreSchedule: null,
    asaClassification: null,
    npoStatus: null,
    fallRisk: null,
    infectionStatus: null,
    isolationStatus: null,
    pregnancyStatus: null,
  }),
  buildPatient({
    pilotId: "IMC-PILOT-PT-004",
    urn: "974004",
    mrn: "100246784",
    name: "PILOT - Khalid Saeed Alotaibi",
    gender: "Male",
    dateOfBirth: "20/01/1978",
    nationalId: "1023456789",
    nationality: "Saudi Arabian",
    mobile: "0502345678",
    email: "khalid.alotaibi.pilot@wathiqcare.test",
    visitNo: "IP000010004",
    encounterNo: "ENC-2026-000004",
    admissionDate: null,
    visitDate: null,
    dischargeDate: null,
    department: "General Surgery",
    ward: null,
    room: null,
    bed: null,
    plannedSurgery: "Laparoscopic Appendectomy",
    diagnosis: "Acute Appendicitis",
    consultant: "Dr. Ahmad Jan Mohammed",
    surgeon: "Dr. Ahmad Jan Mohammed",
    anesthesiologist: null,
    procedureDate: null,
    bloodGroup: null,
    heightCm: null,
    weightKg: null,
    bmi: null,
    allergies: null,
    chronicDisease: null,
    currentMedication: null,
    payorName: null,
    planName: null,
    policyNo: null,
    eligibility: null,
    approvalCode: null,
    claimFormNo: null,
    taxInvoiceNo: null,
    taxInvoiceDate: null,
    receiptNo: null,
    vatRegNo: null,
    vatRepName: null,
    payorTrn: null,
    admittingDrg: null,
    finalDrg: null,
    employeeNo: null,
    consentStatus: "Pending",
    otpStatus: "Pending",
    signatureStatus: "Pending",
    auditStatus: "Pending",
    finalPdfId: null,
    evidencePackageId: null,
    qrCodeId: null,
    caseCoordinator: null,
    nurseAssigned: null,
    orNumber: null,
    theatreSchedule: null,
    asaClassification: null,
    npoStatus: null,
    fallRisk: null,
    infectionStatus: null,
    isolationStatus: null,
    pregnancyStatus: null,
  }),
  buildPatient({
    pilotId: "IMC-PILOT-PT-005",
    urn: "974005",
    mrn: "100246785",
    name: "PILOT - Fatimah Ali Alqahtani",
    gender: "Female",
    dateOfBirth: "17/09/1988",
    nationalId: "1097654321",
    nationality: "Saudi Arabian",
    mobile: "0569871234",
    email: "fatimah.alqahtani.pilot@wathiqcare.test",
    visitNo: "IP000010005",
    encounterNo: "ENC-2026-000005",
    admissionDate: null,
    visitDate: null,
    dischargeDate: null,
    department: "General Surgery",
    ward: null,
    room: null,
    bed: null,
    plannedSurgery: "Excision of Breast Fibroadenoma",
    diagnosis: "Breast Fibroadenoma",
    consultant: "Dr. Bashaer S. Albayhani",
    surgeon: "Dr. Bashaer S. Albayhani",
    anesthesiologist: null,
    procedureDate: null,
    bloodGroup: null,
    heightCm: null,
    weightKg: null,
    bmi: null,
    allergies: null,
    chronicDisease: null,
    currentMedication: null,
    payorName: null,
    planName: null,
    policyNo: null,
    eligibility: null,
    approvalCode: null,
    claimFormNo: null,
    taxInvoiceNo: null,
    taxInvoiceDate: null,
    receiptNo: null,
    vatRegNo: null,
    vatRepName: null,
    payorTrn: null,
    admittingDrg: null,
    finalDrg: null,
    employeeNo: null,
    consentStatus: "Pending",
    otpStatus: "Pending",
    signatureStatus: "Pending",
    auditStatus: "Pending",
    finalPdfId: null,
    evidencePackageId: null,
    qrCodeId: null,
    caseCoordinator: null,
    nurseAssigned: null,
    orNumber: null,
    theatreSchedule: null,
    asaClassification: null,
    npoStatus: null,
    fallRisk: null,
    infectionStatus: null,
    isolationStatus: null,
    pregnancyStatus: null,
  }),
  buildPatient({
    pilotId: "IMC-PILOT-PT-006",
    urn: "974006",
    mrn: "100246786",
    name: "PILOT - Omar Faisal Almutairi",
    gender: "Male",
    dateOfBirth: "12/05/1995",
    nationalId: "1000000006",
    nationality: "Saudi Arabian",
    mobile: "0000000000",
    email: "adenotonsillectomy.patient.pilot@wathiqcare.test",
    visitNo: "IP000010006",
    encounterNo: "ENC-2026-000006",
    admissionDate: null,
    visitDate: null,
    dischargeDate: null,
    department: "ENT",
    ward: null,
    room: null,
    bed: null,
    plannedSurgery: "Adenotonsillectomy",
    diagnosis: "Recurrent Tonsillitis with Adenoid Hypertrophy",
    consultant: "PILOT - ENT Consultant",
    surgeon: "PILOT - ENT Consultant",
    anesthesiologist: null,
    procedureDate: null,
    bloodGroup: null,
    heightCm: null,
    weightKg: null,
    bmi: null,
    allergies: null,
    chronicDisease: null,
    currentMedication: null,
    payorName: null,
    planName: null,
    policyNo: null,
    eligibility: null,
    approvalCode: null,
    claimFormNo: null,
    taxInvoiceNo: null,
    taxInvoiceDate: null,
    receiptNo: null,
    vatRegNo: null,
    vatRepName: null,
    payorTrn: null,
    admittingDrg: null,
    finalDrg: null,
    employeeNo: null,
    consentStatus: "Pending",
    otpStatus: "Pending",
    signatureStatus: "Pending",
    auditStatus: "Pending",
    finalPdfId: null,
    evidencePackageId: null,
    qrCodeId: null,
    caseCoordinator: null,
    nurseAssigned: null,
    orNumber: null,
    theatreSchedule: null,
    asaClassification: null,
    npoStatus: null,
    fallRisk: null,
    infectionStatus: null,
    isolationStatus: null,
    pregnancyStatus: null,
  }),
];

/**
 * Helper to look up a pilot patient by MRN, URN, or name substring.
 * Case-insensitive.
 */
export function findImcPilotPatient(query: string): PilotPatient | undefined {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;
  return imcPilotPatients.find(
    (p) =>
      p.mrn.toLowerCase() === normalized ||
      p.urn.toLowerCase() === normalized ||
      p.name.toLowerCase().includes(normalized) ||
      p.nationalId.toLowerCase().includes(normalized)
  );
}
