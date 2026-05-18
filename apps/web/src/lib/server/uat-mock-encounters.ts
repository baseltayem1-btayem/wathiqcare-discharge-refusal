type UatMockEncounterDefinition = {
  mrn: string;
  encounterId: string;
  caseNumber: string;
  department: string;
  physician: string;
  physicianLicense: string;
  diagnosis: string;
  procedure: string;
  admissionDate: string;
  physicianSpecialty: string;
};

export type UatMockEncounter = {
  id: string;
  encounterId: string;
  admissionDate: string;
  department: string;
  physician: string;
  physicianLicense: string;
  diagnosis: string;
  procedure: string;
  allergies?: string;
  currentMedications?: string;
  physicianSpecialty: string;
  caseNumber: string;
  syncStatus: "UAT_MOCK";
  isMock: true;
  source: "uat_mock";
  mockLabel: "UAT Mock Encounter";
};

const UAT_MOCK_ENCOUNTERS: Record<string, UatMockEncounterDefinition> = {
  "IMC-2026-02000": {
    mrn: "IMC-2026-02000",
    encounterId: "ENC-UAT-2026-0001",
    caseNumber: "CASE-2026-0001",
    department: "Cardiology",
    physician: "Dr. Ahmed Al-Salmi",
    physicianLicense: "UAT-LIC-0001",
    diagnosis: "Pre-operative informed consent assessment",
    procedure: "Diagnostic cardiac catheterization",
    admissionDate: "2026-05-15T00:00:00.000Z",
    physicianSpecialty: "CARDIOLOGY",
  },
  "IMC-2026-02001": {
    mrn: "IMC-2026-02001",
    encounterId: "ENC-UAT-2026-0002",
    caseNumber: "CASE-2026-0002",
    department: "Obstetrics and Gynecology",
    physician: "Dr. Sarah Al-Qahtani",
    physicianLicense: "UAT-LIC-0002",
    diagnosis: "Surgical consent assessment",
    procedure: "Laparoscopic procedure",
    admissionDate: "2026-05-16T00:00:00.000Z",
    physicianSpecialty: "OBSTETRICS_GYNECOLOGY",
  },
  "IMC-2026-02024": {
    mrn: "IMC-2026-02024",
    encounterId: "ENC-UAT-2026-0024",
    caseNumber: "CASE-2026-0024",
    department: "General Surgery",
    physician: "Dr. Ahmed Al-Salmi",
    physicianLicense: "UAT-LIC-0024",
    diagnosis: "General surgical consent assessment",
    procedure: "Elective surgical procedure",
    admissionDate: "2026-05-17T00:00:00.000Z",
    physicianSpecialty: "GENERAL_SURGERY",
  },
};

function isTruthyEnvFlag(value: string | undefined): boolean {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isUatMockEncounterEnvironmentEnabled(): boolean {
  return (
    isTruthyEnvFlag(process.env.ENABLE_UAT_DEMO_DATA) ||
    isTruthyEnvFlag(process.env.ENABLE_UAT_MOCK_ENCOUNTERS) ||
    isTruthyEnvFlag(process.env.NEXT_PUBLIC_ENABLE_UAT_DEMO_DATA)
  );
}

export function isSupportedUatMockMrn(mrn: string): boolean {
  return Boolean(UAT_MOCK_ENCOUNTERS[mrn.trim().toUpperCase()]);
}

export function getUatMockEncounter(mrn: string): UatMockEncounter | null {
  const normalizedMrn = mrn.trim().toUpperCase();
  const match = UAT_MOCK_ENCOUNTERS[normalizedMrn];
  if (!match) {
    return null;
  }

  return {
    id: `uat-mock:${match.mrn}:${match.encounterId}`,
    encounterId: match.encounterId,
    admissionDate: match.admissionDate,
    department: match.department,
    physician: match.physician,
    physicianLicense: match.physicianLicense,
    diagnosis: match.diagnosis,
    procedure: match.procedure,
    physicianSpecialty: match.physicianSpecialty,
    caseNumber: match.caseNumber,
    allergies: "",
    currentMedications: "",
    syncStatus: "UAT_MOCK",
    isMock: true,
    source: "uat_mock",
    mockLabel: "UAT Mock Encounter",
  };
}
