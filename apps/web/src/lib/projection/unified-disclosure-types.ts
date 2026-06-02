export type BilingualText = {
  ar: string;
  en: string;
};

export type ProjectionSection = {
  sectionKey: string;
  title: BilingualText;
  content: BilingualText;
  sectionKind: string;
  sortOrder: number;
};

export type StaticTemplateContent = {
  templateId: string;
  templateVersionId: string;
  consentType: string;
  specialty: string;
  department: string;
  fixedLegalSections: ProjectionSection[];
  dynamicSections: ProjectionSection[];
};

export type PhysicianDynamicDisclosure = {
  diagnosis: string;
  plannedProcedure: string;
  procedureDetails: string;
  risks: BilingualText;
  benefits: BilingualText;
  alternatives: BilingualText;
  refusalRisks: BilingualText;
  expectedOutcomes: BilingualText;
  physicianNotes: BilingualText;
  clinicalAdditions: Array<{
    label: string;
    value: BilingualText;
    sourceRef: string;
  }>;
};

export type AnesthesiaDisclosure = {
  required: boolean;
  anesthesiaType: string;
  implications: BilingualText;
  alternatives: BilingualText;
  refusalConsequences: BilingualText;
  notes: BilingualText;
  sourceRefs: string[];
};

export type RiskDisclosureProjection = {
  risks: BilingualText;
  benefits: BilingualText;
  alternatives: BilingualText;
  refusalRisks: BilingualText;
};

export type InstructionDisclosureProjection = {
  patientInstructions: BilingualText;
  preProcedureInstructions: BilingualText;
  postProcedureInstructions: BilingualText;
  followUpInstructions: BilingualText;
};

export type EducationEvidenceProjection = {
  educationCompleted: boolean;
  completionTimestamp: string;
  understandingScore: number | null;
  understandingPassed: boolean | null;
  packageId: string;
  packageVersion: string;
  eventRefs: string[];
};

export type SignatureMetadataProjection = {
  signatureState: string;
  requiredRoles: string[];
  signedRoles: string[];
  signatureRefs: string[];
  otpRefs: string[];
};

export type AuditMetadataProjection = {
  auditEventRefs: string[];
  sourceHashes: Record<string, string>;
  traceabilityStatus: "complete" | "partial" | "missing";
};

export type UnifiedDisclosureProjectionInput = {
  projectionVersion: string;
  projectionSchemaVersion: string;
  generatedAt: string;
  patientContext: {
    tenantId: string;
    consentDocumentId: string;
    caseId: string;
    patientId: string;
    encounterId: string;
  };
  staticTemplateContent: StaticTemplateContent;
  physicianDynamicDisclosure: PhysicianDynamicDisclosure;
  anesthesiaDisclosure?: Partial<AnesthesiaDisclosure>;
  riskDisclosure?: Partial<RiskDisclosureProjection>;
  instructionDisclosure?: Partial<InstructionDisclosureProjection>;
  educationEvidence?: Partial<EducationEvidenceProjection>;
  signatureMetadata?: Partial<SignatureMetadataProjection>;
  auditMetadata?: Partial<AuditMetadataProjection>;
};

export type FinalPatientSpecificConsentPayload = {
  projectionId: string;
  projectionVersion: string;
  projectionSchemaVersion: string;
  generatedAt: string;
  localeSet: string[];
  determinismHash: string;
  patientContext: UnifiedDisclosureProjectionInput["patientContext"];
  staticTemplateContent: StaticTemplateContent;
  physicianDynamicDisclosure: PhysicianDynamicDisclosure;
  anesthesiaDisclosure: AnesthesiaDisclosure;
  riskDisclosure: RiskDisclosureProjection;
  instructionDisclosure: InstructionDisclosureProjection;
  educationEvidence: EducationEvidenceProjection;
  signatureMetadata: SignatureMetadataProjection;
  auditMetadata: AuditMetadataProjection;
};
