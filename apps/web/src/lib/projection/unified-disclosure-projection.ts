import crypto from "node:crypto";
import type {
  AnesthesiaDisclosure,
  AuditMetadataProjection,
  BilingualText,
  EducationEvidenceProjection,
  FinalPatientSpecificConsentPayload,
  InstructionDisclosureProjection,
  PhysicianDynamicDisclosure,
  ProjectionSection,
  RiskDisclosureProjection,
  SignatureMetadataProjection,
  StaticTemplateContent,
  UnifiedDisclosureProjectionInput,
} from "./unified-disclosure-types";

const DEFAULT_GENERATED_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_VERSION = "prototype-v1";
const DEFAULT_SCHEMA_VERSION = "udp-schema-v1";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBilingual(value: Partial<BilingualText> | null | undefined): BilingualText {
  return {
    ar: normalizeText(value?.ar),
    en: normalizeText(value?.en),
  };
}

function normalizeStringArray(values: unknown): string[] {
  const list = Array.isArray(values)
    ? values.map((value) => normalizeText(value)).filter((value) => value.length > 0)
    : [];
  return [...new Set(list)].sort((a, b) => a.localeCompare(b));
}

function normalizeProjectionSections(values: unknown): ProjectionSection[] {
  const list = Array.isArray(values) ? values : [];
  return list
    .map((entry) => {
      const value = (entry ?? {}) as Record<string, unknown>;
      return {
        sectionKey: normalizeText(value.sectionKey),
        title: normalizeBilingual(value.title as Partial<BilingualText>),
        content: normalizeBilingual(value.content as Partial<BilingualText>),
        sectionKind: normalizeText(value.sectionKind),
        sortOrder: Number.isFinite(Number(value.sortOrder)) ? Number(value.sortOrder) : 0,
      } satisfies ProjectionSection;
    })
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.sectionKey.localeCompare(b.sectionKey);
    });
}

function normalizeStaticTemplateContent(input: Partial<StaticTemplateContent>): StaticTemplateContent {
  return {
    templateId: normalizeText(input.templateId),
    templateVersionId: normalizeText(input.templateVersionId),
    consentType: normalizeText(input.consentType),
    specialty: normalizeText(input.specialty),
    department: normalizeText(input.department),
    fixedLegalSections: normalizeProjectionSections(input.fixedLegalSections),
    dynamicSections: normalizeProjectionSections(input.dynamicSections),
  };
}

function normalizePhysicianDynamicDisclosure(
  input: Partial<PhysicianDynamicDisclosure>,
): PhysicianDynamicDisclosure {
  const additions = Array.isArray(input.clinicalAdditions)
    ? input.clinicalAdditions
        .map((entry) => ({
          label: normalizeText(entry?.label),
          value: normalizeBilingual(entry?.value),
          sourceRef: normalizeText(entry?.sourceRef),
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];

  return {
    diagnosis: normalizeText(input.diagnosis),
    plannedProcedure: normalizeText(input.plannedProcedure),
    procedureDetails: normalizeText(input.procedureDetails),
    risks: normalizeBilingual(input.risks),
    benefits: normalizeBilingual(input.benefits),
    alternatives: normalizeBilingual(input.alternatives),
    refusalRisks: normalizeBilingual(input.refusalRisks),
    expectedOutcomes: normalizeBilingual(input.expectedOutcomes),
    physicianNotes: normalizeBilingual(input.physicianNotes),
    clinicalAdditions: additions,
  };
}

function normalizeAnesthesiaDisclosure(input: Partial<AnesthesiaDisclosure> | undefined): AnesthesiaDisclosure {
  return {
    required: Boolean(input?.required),
    anesthesiaType: normalizeText(input?.anesthesiaType),
    implications: normalizeBilingual(input?.implications),
    alternatives: normalizeBilingual(input?.alternatives),
    refusalConsequences: normalizeBilingual(input?.refusalConsequences),
    notes: normalizeBilingual(input?.notes),
    sourceRefs: normalizeStringArray(input?.sourceRefs),
  };
}

function normalizeRiskDisclosure(
  input: Partial<RiskDisclosureProjection> | undefined,
  physician: PhysicianDynamicDisclosure,
): RiskDisclosureProjection {
  return {
    risks: normalizeBilingual(input?.risks ?? physician.risks),
    benefits: normalizeBilingual(input?.benefits ?? physician.benefits),
    alternatives: normalizeBilingual(input?.alternatives ?? physician.alternatives),
    refusalRisks: normalizeBilingual(input?.refusalRisks ?? physician.refusalRisks),
  };
}

function normalizeInstructionDisclosure(
  input: Partial<InstructionDisclosureProjection> | undefined,
): InstructionDisclosureProjection {
  return {
    patientInstructions: normalizeBilingual(input?.patientInstructions),
    preProcedureInstructions: normalizeBilingual(input?.preProcedureInstructions),
    postProcedureInstructions: normalizeBilingual(input?.postProcedureInstructions),
    followUpInstructions: normalizeBilingual(input?.followUpInstructions),
  };
}

function normalizeEducationEvidence(
  input: Partial<EducationEvidenceProjection> | undefined,
): EducationEvidenceProjection {
  return {
    educationCompleted: Boolean(input?.educationCompleted),
    completionTimestamp: normalizeText(input?.completionTimestamp),
    understandingScore:
      typeof input?.understandingScore === "number" && Number.isFinite(input.understandingScore)
        ? input.understandingScore
        : null,
    understandingPassed:
      typeof input?.understandingPassed === "boolean" ? input.understandingPassed : null,
    packageId: normalizeText(input?.packageId),
    packageVersion: normalizeText(input?.packageVersion),
    eventRefs: normalizeStringArray(input?.eventRefs),
  };
}

function normalizeSignatureMetadata(
  input: Partial<SignatureMetadataProjection> | undefined,
): SignatureMetadataProjection {
  return {
    signatureState: normalizeText(input?.signatureState),
    requiredRoles: normalizeStringArray(input?.requiredRoles),
    signedRoles: normalizeStringArray(input?.signedRoles),
    signatureRefs: normalizeStringArray(input?.signatureRefs),
    otpRefs: normalizeStringArray(input?.otpRefs),
  };
}

function normalizeAuditMetadata(input: Partial<AuditMetadataProjection> | undefined): AuditMetadataProjection {
  const sourceHashesRaw = input?.sourceHashes ?? {};
  const sourceHashes = Object.keys(sourceHashesRaw)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = normalizeText(sourceHashesRaw[key]);
      return acc;
    }, {});

  const traceability = input?.traceabilityStatus;
  const traceabilityStatus: AuditMetadataProjection["traceabilityStatus"] =
    traceability === "complete" || traceability === "partial" || traceability === "missing"
      ? traceability
      : "partial";

  return {
    auditEventRefs: normalizeStringArray(input?.auditEventRefs),
    sourceHashes,
    traceabilityStatus,
  };
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort((a, b) => a.localeCompare(b));
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      result[key] = sortObjectKeys(record[key]);
    }
    return result;
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function buildProjectionDeterminismInput(input: UnifiedDisclosureProjectionInput): string {
  const patientContext = {
    tenantId: normalizeText(input.patientContext?.tenantId),
    consentDocumentId: normalizeText(input.patientContext?.consentDocumentId),
    caseId: normalizeText(input.patientContext?.caseId),
    patientId: normalizeText(input.patientContext?.patientId),
    encounterId: normalizeText(input.patientContext?.encounterId),
  };

  const normalized = {
    projectionVersion: normalizeText(input.projectionVersion) || DEFAULT_VERSION,
    projectionSchemaVersion: normalizeText(input.projectionSchemaVersion) || DEFAULT_SCHEMA_VERSION,
    generatedAt: normalizeText(input.generatedAt) || DEFAULT_GENERATED_AT,
    patientContext,
    staticTemplateContent: normalizeStaticTemplateContent(input.staticTemplateContent),
    physicianDynamicDisclosure: normalizePhysicianDynamicDisclosure(input.physicianDynamicDisclosure),
    anesthesiaDisclosure: normalizeAnesthesiaDisclosure(input.anesthesiaDisclosure),
    riskDisclosure: normalizeRiskDisclosure(input.riskDisclosure, normalizePhysicianDynamicDisclosure(input.physicianDynamicDisclosure)),
    instructionDisclosure: normalizeInstructionDisclosure(input.instructionDisclosure),
    educationEvidence: normalizeEducationEvidence(input.educationEvidence),
    signatureMetadata: normalizeSignatureMetadata(input.signatureMetadata),
    auditMetadata: normalizeAuditMetadata(input.auditMetadata),
  };

  return stableJson(normalized);
}

export function projectUnifiedDisclosure(
  input: UnifiedDisclosureProjectionInput,
): FinalPatientSpecificConsentPayload {
  const patientContext = {
    tenantId: normalizeText(input.patientContext?.tenantId),
    consentDocumentId: normalizeText(input.patientContext?.consentDocumentId),
    caseId: normalizeText(input.patientContext?.caseId),
    patientId: normalizeText(input.patientContext?.patientId),
    encounterId: normalizeText(input.patientContext?.encounterId),
  };

  const staticTemplateContent = normalizeStaticTemplateContent(input.staticTemplateContent);
  const physicianDynamicDisclosure = normalizePhysicianDynamicDisclosure(input.physicianDynamicDisclosure);
  const anesthesiaDisclosure = normalizeAnesthesiaDisclosure(input.anesthesiaDisclosure);
  const riskDisclosure = normalizeRiskDisclosure(input.riskDisclosure, physicianDynamicDisclosure);
  const instructionDisclosure = normalizeInstructionDisclosure(input.instructionDisclosure);
  const educationEvidence = normalizeEducationEvidence(input.educationEvidence);
  const signatureMetadata = normalizeSignatureMetadata(input.signatureMetadata);
  const auditMetadata = normalizeAuditMetadata(input.auditMetadata);

  const projectionVersion = normalizeText(input.projectionVersion) || DEFAULT_VERSION;
  const projectionSchemaVersion = normalizeText(input.projectionSchemaVersion) || DEFAULT_SCHEMA_VERSION;
  const generatedAt = normalizeText(input.generatedAt) || DEFAULT_GENERATED_AT;

  const determinismBase = {
    projectionVersion,
    projectionSchemaVersion,
    generatedAt,
    patientContext,
    staticTemplateContent,
    physicianDynamicDisclosure,
    anesthesiaDisclosure,
    riskDisclosure,
    instructionDisclosure,
    educationEvidence,
    signatureMetadata,
    auditMetadata,
  };

  const determinismHash = sha256(stableJson(determinismBase));
  const projectionId = `udp_${determinismHash.slice(0, 16)}`;

  return {
    projectionId,
    projectionVersion,
    projectionSchemaVersion,
    generatedAt,
    localeSet: ["ar", "en"],
    determinismHash,
    patientContext,
    staticTemplateContent,
    physicianDynamicDisclosure,
    anesthesiaDisclosure,
    riskDisclosure,
    instructionDisclosure,
    educationEvidence,
    signatureMetadata,
    auditMetadata,
  };
}
