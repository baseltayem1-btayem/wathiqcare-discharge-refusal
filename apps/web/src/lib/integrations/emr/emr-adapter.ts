export type EmrSyncStatus = "NOT_SYNCED" | "SYNCING" | "SYNCED" | "PARTIAL" | "FAILED" | "STALE";

export type EmrPatientEncounterPayload = {
  patientName?: string;
  mrn?: string;
  dob?: string;
  gender?: string;
  nationalIdOrIqama?: string;
  mobileNumber?: string;
  encounterNumber?: string;
  visitType?: string;
  admissionDate?: string;
  department?: string;
  treatingPhysician?: string;
  physicianLicense?: string;
  diagnosis?: string;
  icd10Code?: string;
  procedureOrder?: string;
  procedureCode?: string;
  allergies?: string;
  currentMedications?: string;
  riskFlags?: string[];
  interpreterRequired?: boolean;
  guardianRequired?: boolean;
};

export type EmrSyncResult = {
  status: EmrSyncStatus;
  sourceSystem: string;
  syncedAt: string;
  importedFields: string[];
  failedFields: string[];
  manualOverride: boolean;
  correlationId: string;
  payload: EmrPatientEncounterPayload;
  error?: string;
};

export type EmrSyncContext = {
  tenantId: string;
  patientId: string;
  encounterId: string;
  correlationId: string;
};

export interface EmrAdapter {
  readonly adapterKey: string;
  readonly sourceSystem: string;
  syncEncounterContext(context: EmrSyncContext): Promise<EmrSyncResult>;
}
