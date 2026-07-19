export type ConsentFieldRole =
  | "SYSTEM_AUTO"
  | "PHYSICIAN_REQUIRED"
  | "PHYSICIAN_OPTIONAL"
  | "ANESTHESIA_REQUIRED"
  | "ANESTHESIA_OPTIONAL"
  | "PATIENT_REQUIRED"
  | "WITNESS_CONDITIONAL"
  | "GUARDIAN_CONDITIONAL"
  | "INTERPRETER_CONDITIONAL"
  | "READ_ONLY";

export type ConsentFieldType =
  | "TEXT"
  | "MULTILINE_TEXT"
  | "CHECKBOX"
  | "RADIO"
  | "SIGNATURE"
  | "INITIALS"
  | "DATE"
  | "DATETIME";

export type ConsentMappingVerificationStatus =
  | "DRAFT"
  | "CLINICAL_REVIEW_REQUIRED"
  | "LEGAL_REVIEW_REQUIRED"
  | "VERIFIED"
  | "DEPRECATED";

export type ConsentFieldCoordinates = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  coordinateMode: "NORMALIZED";
  size?: { width: number; height: number };
};

export type ConsentFieldDefinition = {
  key: string;
  labelEn: string;
  labelAr?: string;
  section?: string;
  role: ConsentFieldRole;
  type: ConsentFieldType;
  required: boolean;
  requiredWhen?: string;
  coordinates?: ConsentFieldCoordinates;
  arabicCoordinates?: ConsentFieldCoordinates;
  maxLength?: number;
  multiline?: boolean;
  sourcePath?: string;
  placeholderEn?: string;
  placeholderAr?: string;
};

export type ConsentFieldMapping = {
  formId: string;
  slug: string;
  titleEn: string;
  layoutFamily: string;
  version: string;
  verificationStatus: ConsentMappingVerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  requiresDoctorCompletion: boolean;
  supportsAnesthesiaWorkflow: boolean;
  blocksPatientDispatchUntilVerified: boolean;
  fields: ConsentFieldDefinition[];
};
