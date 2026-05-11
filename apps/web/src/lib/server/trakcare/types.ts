export type TrakCarePatient = {
  id: string;
  mrn: string;
  name: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationalId?: string | null;
  iqamaNumber?: string | null;
  mobileNumber?: string | null;
  emergencyContact?: string | null;
  emergencyContactPhone?: string | null;
  raw?: Record<string, unknown>;
};

export type TrakCareEncounter = {
  id: string;
  encounterId: string;
  admissionDate?: string | null;
  department?: string | null;
  physician?: string | null;
  physicianLicense?: string | null;
  physicianId?: string | null;
  diagnosis?: string | null;
  procedure?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  physicianSpecialty?: string | null;
  raw?: Record<string, unknown>;
};

export type TrakCareResourceItem = {
  id: string;
  label: string;
  code?: string | null;
  recordedAt?: string | null;
  raw?: Record<string, unknown>;
};

export type TrakCareStatus = {
  sourceSystem: string;
  liveEnabled: boolean;
  mode: "pending_credentials" | "live";
  state: "PENDING_LIVE_CREDENTIALS" | "READY";
  baseUrlConfigured: boolean;
  authConfigured: boolean;
  timeoutMs: number;
  retryCount: number;
  rateLimitPerMinute: number;
  message: string;
};

export type TrakCareRequestContext = {
  tenantId: string;
  userId: string;
  caseId?: string;
  requestId: string;
  correlationId: string;
};

export type TrakCareCallResult<T> = {
  data: T;
  sourceTransactionId: string | null;
  correlationId: string;
};
