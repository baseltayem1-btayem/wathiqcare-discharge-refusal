import type { TrakCareEncounter, TrakCarePatient, TrakCareResourceItem } from "@/lib/server/trakcare/types";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
}

function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function mapPatient(raw: unknown): TrakCarePatient {
  const record = asRecord(raw);

  const id = readString(record, ["id", "patientId", "identifier", "resourceId"]) || "";
  const mrn = readString(record, ["mrn", "medicalRecordNo", "medicalRecordNumber"]) || "";
  const name =
    readString(record, ["name", "fullName", "displayName"]) ||
    [readString(record, ["firstName"]), readString(record, ["middleName"]), readString(record, ["lastName"])]
      .filter(Boolean)
      .join(" ") ||
    "Unknown";

  return {
    id: id || mrn,
    mrn,
    name,
    dateOfBirth: readString(record, ["dateOfBirth", "dob", "birthDate"]),
    gender: readString(record, ["gender", "sex"]),
    nationalId: readString(record, ["nationalId", "nationalID"]),
    iqamaNumber: readString(record, ["iqamaNumber", "iqama"]),
    mobileNumber: readString(record, ["mobile", "mobileNumber", "phone"]),
    emergencyContact: readString(record, ["emergencyContact", "nextOfKinName"]),
    emergencyContactPhone: readString(record, ["emergencyContactPhone", "nextOfKinPhone"]),
    raw: record,
  };
}

export function mapEncounter(raw: unknown): TrakCareEncounter {
  const record = asRecord(raw);

  const id = readString(record, ["id", "encounterId", "identifier", "resourceId"]) || "";
  const encounterId = readString(record, ["encounterId", "encounterNumber", "visitNumber", "id"]) || id;

  return {
    id,
    encounterId,
    admissionDate: readString(record, ["admissionDate", "startDate", "admitDate", "periodStart"]),
    department: readString(record, ["department", "location", "clinic"]),
    physician: readString(record, ["physician", "treatingPhysician", "doctorName"]),
    physicianLicense: readString(record, ["physicianLicense", "licenseNumber"]),
    physicianId: readString(record, ["physicianId", "practitionerId", "doctorId"]),
    diagnosis: readString(record, ["diagnosis", "primaryDiagnosis"]),
    procedure: readString(record, ["procedure", "plannedProcedure", "procedureOrder"]),
    allergies: readString(record, ["allergies"]),
    currentMedications: readString(record, ["currentMedications", "medications"]),
    physicianSpecialty: readString(record, ["physicianSpecialty", "specialty"]),
    raw: record,
  };
}

export function mapResourceList(raw: unknown, kind: string): TrakCareResourceItem[] {
  const record = asRecord(raw);
  const items = asArray(record.items || record.entry || record.results || raw);

  return items.map((item, index) => {
    const id = readString(item, ["id", "identifier", "resourceId"]) || `${kind}-${index + 1}`;
    const label =
      readString(item, ["label", "name", "display", "text", "description", "title"]) ||
      `${kind} ${index + 1}`;

    return {
      id,
      label,
      code: readString(item, ["code", "icd10", "rxnorm", "loinc"]),
      recordedAt: readString(item, ["recordedAt", "effectiveDateTime", "date", "timestamp"]),
      raw: item,
    };
  });
}

export function listPayload(raw: unknown): Record<string, unknown>[] {
  const record = asRecord(raw);
  const items = asArray(record.items || record.entry || record.results || raw);
  return items;
}
