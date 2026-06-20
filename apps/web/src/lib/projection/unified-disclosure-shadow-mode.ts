import crypto from "node:crypto";
import { projectUnifiedDisclosure } from "./unified-disclosure-projection";
import type { UnifiedDisclosureProjectionInput } from "./unified-disclosure-types";

type ShadowFlow = "physician_issuance" | "patient_signing" | "pdf_generation" | "evidence_package";
type ParityCategory =
  | "template_parity"
  | "physician_disclosure_parity"
  | "anesthesia_parity"
  | "risk_parity"
  | "instruction_parity"
  | "arabic_english_parity"
  | "evidence_metadata_parity"
  | "ordering_parity"
  | "null_undefined_parity";

type MismatchKind =
  | "missing_fields"
  | "ordering_mismatches"
  | "bilingual_mismatches"
  | "dropped_disclosures"
  | "undefined_critical_sections"
  | "projection_normalization_warnings";

type ShadowMismatch = {
  category: ParityCategory;
  kind: MismatchKind;
  details: string[];
};

type ShadowArgs = {
  flow: ShadowFlow;
  tenantId?: string | null;
  consentDocumentId?: string | null;
  legacyPayload: unknown;
  document: Record<string, unknown>;
};

export type ShadowExecutionResult = {
  mode: "shadow_only";
  flow: ShadowFlow;
  status: "skipped" | "active_compare_only" | "error";
  reasons: string[];
  projectionValidationEnabled: boolean;
  mismatchSummary: Record<MismatchKind, number>;
  dimensionSummary: {
    projection: number;
    runtime: number;
    pdf: number;
    evidence: number;
    bilingual: number;
    anesthesia: number;
  };
  projectionHashes: {
    projectionHash: string;
    runtimeHash: string;
    pdfProjectionHash: string;
    evidenceProjectionHash: string;
    educationalTrackingHash: string;
  } | null;
};

type ShadowRuntimeGovernance = {
  enabled: boolean;
  killSwitch: boolean;
  allowProduction: boolean;
  projectionValidationEnabled: boolean;
  flowFlags: Record<ShadowFlow, boolean>;
  allowedPhysicianIds: string[];
  allowedSpecialties: string[];
  allowedProcedures: string[];
};

type ProjectionBuildResult = {
  input: UnifiedDisclosureProjectionInput;
  normalizationWarnings: string[];
};

const LOG_PREFIX = "[UNIFIED_DISCLOSURE_SHADOW]";

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function listStrings(value: unknown): string[] {
  return toArray(value)
    .map((item) => text(item))
    .filter((item) => item.length > 0);
}

function hasValue(value: unknown): boolean {
  return text(value).length > 0;
}

function stableSort(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function stableJson(value: unknown): string {
  function sortKeys(input: unknown): unknown {
    if (Array.isArray(input)) {
      return input.map((item) => sortKeys(item));
    }
    if (input && typeof input === "object") {
      const record = input as Record<string, unknown>;
      return Object.keys(record)
        .sort((a, b) => a.localeCompare(b))
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = sortKeys(record[key]);
          return acc;
        }, {});
    }
    return input;
  }

  return JSON.stringify(sortKeys(value));
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseBoolFlag(value: string | undefined): boolean {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function parseAllowList(value: string | undefined): string[] {
  return [...new Set(
    (value || "")
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length > 0),
  )].sort((a, b) => a.localeCompare(b));
}

function normalizeForAllowList(value: unknown): string {
  return text(value).toUpperCase();
}

function buildShadowRuntimeGovernance(): ShadowRuntimeGovernance {
  return {
    enabled: parseBoolFlag(process.env.FEATURE_UNIFIED_DISCLOSURE_SHADOW_MODE),
    killSwitch: parseBoolFlag(process.env.FEATURE_SHADOW_RUNTIME_KILL_SWITCH),
    allowProduction: parseBoolFlag(process.env.FEATURE_SHADOW_ALLOW_PRODUCTION),
    projectionValidationEnabled: parseBoolFlag(process.env.FEATURE_PROJECTION_VALIDATION_SHADOW_MODE),
    flowFlags: {
      physician_issuance: parseBoolFlag(process.env.FEATURE_PHYSICIAN_RUNTIME_SHADOW_MODE),
      patient_signing: parseBoolFlag(process.env.FEATURE_PATIENT_RUNTIME_SHADOW_MODE),
      pdf_generation: parseBoolFlag(process.env.FEATURE_PDF_PROJECTION_SHADOW_MODE),
      evidence_package: parseBoolFlag(process.env.FEATURE_EVIDENCE_PROJECTION_SHADOW_MODE),
    },
    allowedPhysicianIds: parseAllowList(process.env.SHADOW_ALLOWED_PHYSICIAN_IDS),
    allowedSpecialties: parseAllowList(process.env.SHADOW_ALLOWED_SPECIALTIES),
    allowedProcedures: parseAllowList(process.env.SHADOW_ALLOWED_PROCEDURES),
  };
}

function getDocumentRoutingContext(document: Record<string, unknown>): {
  physicianId: string;
  specialty: string;
  procedure: string;
} {
  const template = toRecord(document.template);
  const physicianId = normalizeForAllowList(document.physicianLicense) || normalizeForAllowList(document.physicianName);
  const specialty = normalizeForAllowList(template.specialty) || normalizeForAllowList(document.department);
  const procedure = normalizeForAllowList(document.plannedProcedure);

  return { physicianId, specialty, procedure };
}

function matchAllowedValue(allowed: string[], candidate: string): boolean {
  if (allowed.length === 0) return true;
  if (!candidate) return false;
  return allowed.some((value) => candidate.includes(value));
}

function isShadowFlowAllowed(args: ShadowArgs, governance: ShadowRuntimeGovernance): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!governance.enabled) reasons.push("global_disabled");
  if (governance.killSwitch) reasons.push("kill_switch_active");
  if (!governance.flowFlags[args.flow]) reasons.push(`flow_disabled:${args.flow}`);
  if (process.env.NODE_ENV === "production" && !governance.allowProduction) {
    reasons.push("production_not_allowed");
  }

  if (
    governance.allowedPhysicianIds.length === 0 &&
    governance.allowedSpecialties.length === 0 &&
    governance.allowedProcedures.length === 0
  ) {
    reasons.push("allowlist_not_configured");
  }

  const context = getDocumentRoutingContext(args.document);
  if (!matchAllowedValue(governance.allowedPhysicianIds, context.physicianId)) {
    reasons.push("physician_not_allowlisted");
  }
  if (!matchAllowedValue(governance.allowedSpecialties, context.specialty)) {
    reasons.push("specialty_not_allowlisted");
  }
  if (!matchAllowedValue(governance.allowedProcedures, context.procedure)) {
    reasons.push("procedure_not_allowlisted");
  }

  return {
    allowed: reasons.length === 0,
    reasons: stableSort(reasons),
  };
}

function buildProjectionChainHashes(projected: ReturnType<typeof projectUnifiedDisclosure>): {
  projectionHash: string;
  runtimeHash: string;
  pdfProjectionHash: string;
  evidenceProjectionHash: string;
  educationalTrackingHash: string;
} {
  const projectionHash = projected.determinismHash;
  const runtimeHash = sha256(stableJson({
    staticTemplateContent: projected.staticTemplateContent,
    physicianDynamicDisclosure: projected.physicianDynamicDisclosure,
    riskDisclosure: projected.riskDisclosure,
    instructionDisclosure: projected.instructionDisclosure,
    anesthesiaDisclosure: projected.anesthesiaDisclosure,
  }));
  const pdfProjectionHash = sha256(stableJson({
    localeSet: projected.localeSet,
    staticTemplateContent: projected.staticTemplateContent,
    physicianDynamicDisclosure: projected.physicianDynamicDisclosure,
    anesthesiaDisclosure: projected.anesthesiaDisclosure,
    instructionDisclosure: projected.instructionDisclosure,
    signatureMetadata: projected.signatureMetadata,
  }));
  const evidenceProjectionHash = sha256(stableJson({
    auditMetadata: projected.auditMetadata,
    educationEvidence: projected.educationEvidence,
    signatureMetadata: projected.signatureMetadata,
    patientContext: {
      tenantId: projected.patientContext.tenantId,
      consentDocumentId: projected.patientContext.consentDocumentId,
      caseId: projected.patientContext.caseId,
      encounterId: projected.patientContext.encounterId,
    },
  }));
  const educationalTrackingHash = sha256(stableJson({
    educationEvidence: projected.educationEvidence,
    auditMetadata: projected.auditMetadata,
  }));

  return {
    projectionHash,
    runtimeHash,
    pdfProjectionHash,
    evidenceProjectionHash,
    educationalTrackingHash,
  };
}

function buildMismatchSummary(mismatches: ShadowMismatch[]): Record<MismatchKind, number> {
  return mismatches.reduce<Record<MismatchKind, number>>((acc, mismatch) => {
    acc[mismatch.kind] = (acc[mismatch.kind] || 0) + 1;
    return acc;
  }, {
    missing_fields: 0,
    ordering_mismatches: 0,
    bilingual_mismatches: 0,
    dropped_disclosures: 0,
    undefined_critical_sections: 0,
    projection_normalization_warnings: 0,
  });
}

export function executeUnifiedDisclosureShadowMode(args: ShadowArgs): ShadowExecutionResult {
  const governance = buildShadowRuntimeGovernance();
  const flowResult = isShadowFlowAllowed(args, governance);
  if (!flowResult.allowed) {
    return {
      mode: "shadow_only",
      flow: args.flow,
      status: "skipped",
      reasons: flowResult.reasons,
      projectionValidationEnabled: governance.projectionValidationEnabled,
      mismatchSummary: buildMismatchSummary([]),
      dimensionSummary: { projection: 0, runtime: 0, pdf: 0, evidence: 0, bilingual: 0, anesthesia: 0 },
      projectionHashes: null,
    };
  }

  try {
    const projected = projectUnifiedDisclosure((args.legacyPayload ?? args.document) as UnifiedDisclosureProjectionInput);
    const hashes = buildProjectionChainHashes(projected);

    return {
      mode: "shadow_only",
      flow: args.flow,
      status: "active_compare_only",
      reasons: [],
      projectionValidationEnabled: governance.projectionValidationEnabled,
      mismatchSummary: buildMismatchSummary([]),
      dimensionSummary: { projection: 0, runtime: 0, pdf: 0, evidence: 0, bilingual: 0, anesthesia: 0 },
      projectionHashes: hashes,
    };
  } catch (error) {
    console.error(LOG_PREFIX, "shadow execution failed", error);
    return {
      mode: "shadow_only",
      flow: args.flow,
      status: "error",
      reasons: ["projection_error"],
      projectionValidationEnabled: governance.projectionValidationEnabled,
      mismatchSummary: buildMismatchSummary([]),
      dimensionSummary: { projection: 0, runtime: 0, pdf: 0, evidence: 0, bilingual: 0, anesthesia: 0 },
      projectionHashes: null,
    };
  }
}
