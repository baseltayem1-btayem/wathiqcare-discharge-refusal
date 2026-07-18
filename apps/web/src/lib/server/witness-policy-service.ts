import { ApiError } from "@/lib/server/http";

/**
 * Conditional Witness Policy engine.
 *
 * WathiqCare is the electronic signing and authentication system; it is never
 * represented as a human witness. A human witness is required only when the
 * evaluated, versioned digital policy says so. The evaluation below is pure
 * and deterministic: identical facts always produce an identical decision.
 */

export const WITNESS_POLICY_VERSION = "1.0.0";

export type WitnessMode = "NONE" | "CONDITIONAL" | "REQUIRED";

export type WitnessRole =
  | "NURSING_REPRESENTATIVE"
  | "PATIENT_EXPERIENCE_REPRESENTATIVE";

export const WITNESS_ROLES: readonly WitnessRole[] = [
  "NURSING_REPRESENTATIVE",
  "PATIENT_EXPERIENCE_REPRESENTATIVE",
];

export const DEFAULT_REQUIRED_WITNESS_ROLES: readonly WitnessRole[] = [
  "NURSING_REPRESENTATIVE",
  "PATIENT_EXPERIENCE_REPRESENTATIVE",
];

export type WitnessTriggerCode =
  | "SUBSTITUTE_DECISION_MAKER"
  | "LACKS_CAPACITY"
  | "CANNOT_READ_OR_USE_JOURNEY"
  | "COMMUNICATION_BARRIER"
  | "DISPUTED_OR_OBJECTED"
  | "REFUSAL_OR_AMA"
  | "TEMPLATE_POLICY_REQUIRED";

/** Stable evaluation order so decisions are explainable and deterministic. */
const TRIGGER_EVALUATION_ORDER: readonly WitnessTriggerCode[] = [
  "LACKS_CAPACITY",
  "SUBSTITUTE_DECISION_MAKER",
  "CANNOT_READ_OR_USE_JOURNEY",
  "COMMUNICATION_BARRIER",
  "DISPUTED_OR_OBJECTED",
  "REFUSAL_OR_AMA",
  "TEMPLATE_POLICY_REQUIRED",
];

export type WitnessTriggerFacts = {
  substituteDecisionMaker?: boolean;
  lacksCapacity?: boolean;
  cannotReadOrUseJourney?: boolean;
  communicationBarrier?: boolean;
  disputedOrObjected?: boolean;
  refusalOrAma?: boolean;
};

/**
 * Optional typed witness policy carried on ConsentTemplate.metadata.witnessPolicy.
 * Absent config falls back to the legacy template flags so paper/legacy
 * behaviour is preserved unchanged.
 */
export type TemplateWitnessPolicyConfig = {
  witnessMode?: WitnessMode;
  requiredWitnessCount?: number;
  requiredWitnessRoles?: WitnessRole[];
  allowSamePersonMultipleRoles?: boolean;
  policyVersion?: string;
};

export type ElectronicEvidenceFacts = {
  patientCompetent: boolean;
  identityVerified: boolean;
  declarationsComplete: boolean;
  clinicianAttestationComplete: boolean;
  electronicSignatureBoundToHash: boolean;
};

export const ELECTRONIC_EVIDENCE_REQUIREMENTS: readonly (keyof ElectronicEvidenceFacts)[] = [
  "patientCompetent",
  "identityVerified",
  "declarationsComplete",
  "clinicianAttestationComplete",
  "electronicSignatureBoundToHash",
];

export type WitnessPolicyInput = {
  /** Legacy ConsentTemplate.requiresWitness flag (paper behaviour preserved). */
  templateRequiresWitness: boolean;
  templateRiskLevel?: string | null;
  templatePolicy?: TemplateWitnessPolicyConfig | null;
  /**
   * Provenance of templatePolicy when it did not come from template metadata
   * (e.g. a governed code-controlled registry profile). Defaults to
   * TEMPLATE_METADATA whenever a policy config is present.
   */
  templatePolicySource?: WitnessPolicySource;
  triggers?: WitnessTriggerFacts;
  evidence?: Partial<ElectronicEvidenceFacts>;
  /** Injectable clock for deterministic evaluation; defaults to now. */
  evaluatedAt?: string;
};

export type WitnessPolicySource =
  | "TEMPLATE_METADATA"
  | "GOVERNED_CODE_PROFILE"
  | "LEGACY_TEMPLATE_FLAG"
  | "DEFAULT_ROUTINE";

export type EvidenceCompleteness = {
  complete: boolean;
  missing: (keyof ElectronicEvidenceFacts)[];
};

export type WitnessPolicyDecision = {
  witnessMode: WitnessMode;
  requiredWitnessCount: number;
  requiredWitnessRoles: WitnessRole[];
  triggerCodes: WitnessTriggerCode[];
  policyVersion: string;
  policySource: WitnessPolicySource;
  evaluatedAt: string;
  evidenceCompleteness: EvidenceCompleteness;
  decisionReason: string;
  allowSamePersonMultipleRoles: boolean;
};

export type CompletedWitness = {
  userId: string;
  role: WitnessRole;
  /** Document hash the witness signature was bound to. */
  documentHash?: string | null;
};

export type WitnessSatisfaction = {
  satisfied: boolean;
  signedCount: number;
  missingCount: number;
  missingRoles: WitnessRole[];
  /** Machine-readable blocker codes, empty when satisfied. */
  blockers: string[];
};

const HIGH_RISK_LEVELS = new Set(["HIGH", "CRITICAL"]);

function normalizeRiskLevel(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function isHighRisk(value: string | null | undefined): boolean {
  return HIGH_RISK_LEVELS.has(normalizeRiskLevel(value));
}

function isWitnessRole(value: unknown): value is WitnessRole {
  return typeof value === "string" && (WITNESS_ROLES as readonly string[]).includes(value);
}

/**
 * Parse and validate the typed witness policy stored on
 * ConsentTemplate.metadata.witnessPolicy. Invalid config fails closed with a
 * structured error so governance mistakes can never silently drop a witness
 * requirement.
 */
export function parseTemplateWitnessPolicy(
  metadata: unknown,
): TemplateWitnessPolicyConfig | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as Record<string, unknown>).witnessPolicy;
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ApiError(409, "Invalid witness policy configuration", {
      code: "WITNESS_POLICY_CONFIG_INVALID",
    });
  }
  const config = raw as Record<string, unknown>;
  const witnessMode = config.witnessMode;
  if (
    witnessMode !== undefined &&
    witnessMode !== "NONE" &&
    witnessMode !== "CONDITIONAL" &&
    witnessMode !== "REQUIRED"
  ) {
    throw new ApiError(409, "Invalid witness policy mode", {
      code: "WITNESS_POLICY_CONFIG_INVALID",
    });
  }
  const requiredWitnessCount = config.requiredWitnessCount;
  if (
    requiredWitnessCount !== undefined &&
    (typeof requiredWitnessCount !== "number" ||
      !Number.isInteger(requiredWitnessCount) ||
      requiredWitnessCount < 0 ||
      requiredWitnessCount > DEFAULT_REQUIRED_WITNESS_ROLES.length)
  ) {
    throw new ApiError(409, "Invalid required witness count", {
      code: "WITNESS_POLICY_CONFIG_INVALID",
    });
  }
  const requiredWitnessRoles = config.requiredWitnessRoles;
  if (
    requiredWitnessRoles !== undefined &&
    (!Array.isArray(requiredWitnessRoles) || !requiredWitnessRoles.every(isWitnessRole))
  ) {
    throw new ApiError(409, "Invalid required witness roles", {
      code: "WITNESS_POLICY_CONFIG_INVALID",
    });
  }
  const policyVersion = config.policyVersion;
  if (policyVersion !== undefined && typeof policyVersion !== "string") {
    throw new ApiError(409, "Invalid witness policy version", {
      code: "WITNESS_POLICY_CONFIG_INVALID",
    });
  }
  return {
    witnessMode: witnessMode as WitnessMode | undefined,
    requiredWitnessCount: requiredWitnessCount as number | undefined,
    requiredWitnessRoles: requiredWitnessRoles as WitnessRole[] | undefined,
    allowSamePersonMultipleRoles: config.allowSamePersonMultipleRoles === true,
    policyVersion: policyVersion as string | undefined,
  };
}

function collectTriggerCodes(facts: WitnessTriggerFacts | undefined): WitnessTriggerCode[] {
  if (!facts) {
    return [];
  }
  const fired = new Set<WitnessTriggerCode>();
  if (facts.lacksCapacity === true) fired.add("LACKS_CAPACITY");
  if (facts.substituteDecisionMaker === true) fired.add("SUBSTITUTE_DECISION_MAKER");
  if (facts.cannotReadOrUseJourney === true) fired.add("CANNOT_READ_OR_USE_JOURNEY");
  if (facts.communicationBarrier === true) fired.add("COMMUNICATION_BARRIER");
  if (facts.disputedOrObjected === true) fired.add("DISPUTED_OR_OBJECTED");
  if (facts.refusalOrAma === true) fired.add("REFUSAL_OR_AMA");
  return TRIGGER_EVALUATION_ORDER.filter((code) => fired.has(code));
}

export function evaluateEvidenceCompleteness(
  evidence: Partial<ElectronicEvidenceFacts> | undefined,
): EvidenceCompleteness {
  const missing = ELECTRONIC_EVIDENCE_REQUIREMENTS.filter(
    (key) => evidence?.[key] !== true,
  );
  return { complete: missing.length === 0, missing };
}

/**
 * Evaluate the conditional witness policy. Pure and deterministic: the result
 * depends only on the input facts (and the injected clock value).
 *
 * Safety rule: any fired trigger escalates to REQUIRED even when a template
 * config declares NONE or CONDITIONAL — the fail-closed direction.
 */
export function evaluateWitnessPolicy(input: WitnessPolicyInput): WitnessPolicyDecision {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const config = input.templatePolicy ?? null;
  const triggerCodes = collectTriggerCodes(input.triggers);
  const evidenceCompleteness = evaluateEvidenceCompleteness(input.evidence);

  const allowSamePersonMultipleRoles = config?.allowSamePersonMultipleRoles === true;
  const configSource: WitnessPolicySource = input.templatePolicySource ?? "TEMPLATE_METADATA";

  const resolveRoles = (count: number): WitnessRole[] => {
    const configured = config?.requiredWitnessRoles;
    if (configured && configured.length > 0) {
      return configured.slice(0, Math.max(count, configured.length));
    }
    return DEFAULT_REQUIRED_WITNESS_ROLES.slice(0, count);
  };

  const resolveCount = (): number => {
    const configured = config?.requiredWitnessCount;
    if (typeof configured === "number" && configured > 0) {
      return configured;
    }
    return 1;
  };

  // 1. Any fired runtime trigger requires a human witness (fail closed).
  if (triggerCodes.length > 0) {
    const count = resolveCount();
    const policySource: WitnessPolicySource = config
      ? configSource
      : "DEFAULT_ROUTINE";
    return {
      witnessMode: "REQUIRED",
      requiredWitnessCount: count,
      requiredWitnessRoles: resolveRoles(count),
      triggerCodes,
      policyVersion: config?.policyVersion ?? WITNESS_POLICY_VERSION,
      policySource,
      evaluatedAt,
      evidenceCompleteness,
      decisionReason: `Human witness required: trigger(s) fired: ${triggerCodes.join(", ")}.`,
      allowSamePersonMultipleRoles,
    };
  }

  // 2. Explicit template policy (typed, versioned metadata).
  if (config?.witnessMode === "REQUIRED") {
    const count = resolveCount();
    return {
      witnessMode: "REQUIRED",
      requiredWitnessCount: count,
      requiredWitnessRoles: resolveRoles(count),
      triggerCodes: ["TEMPLATE_POLICY_REQUIRED"],
      policyVersion: config.policyVersion ?? WITNESS_POLICY_VERSION,
      policySource: configSource,
      evaluatedAt,
      evidenceCompleteness,
      decisionReason:
        "Human witness required: template, clinical policy or legal rule expressly requires a witness.",
      allowSamePersonMultipleRoles,
    };
  }

  if (config?.witnessMode === "NONE") {
    return {
      witnessMode: "NONE",
      requiredWitnessCount: 0,
      requiredWitnessRoles: [],
      triggerCodes: [],
      policyVersion: config.policyVersion ?? WITNESS_POLICY_VERSION,
      policySource: configSource,
      evaluatedAt,
      evidenceCompleteness,
      decisionReason:
        "No human witness required by template policy; routine electronic authentication applies once evidence is complete.",
      allowSamePersonMultipleRoles,
    };
  }

  // 3. Legacy template flags — paper and legacy behaviour preserved.
  if (input.templateRequiresWitness || isHighRisk(input.templateRiskLevel)) {
    const count = resolveCount();
    const reason = input.templateRequiresWitness
      ? "Human witness required: legacy template flag requiresWitness=true."
      : `Human witness required: template risk level ${normalizeRiskLevel(input.templateRiskLevel)} mandates a witness.`;
    return {
      witnessMode: "REQUIRED",
      requiredWitnessCount: count,
      requiredWitnessRoles: resolveRoles(count),
      triggerCodes: ["TEMPLATE_POLICY_REQUIRED"],
      policyVersion: WITNESS_POLICY_VERSION,
      policySource: "LEGACY_TEMPLATE_FLAG",
      evaluatedAt,
      evidenceCompleteness,
      decisionReason: reason,
      allowSamePersonMultipleRoles,
    };
  }

  // 4. Explicit CONDITIONAL config with no fired triggers.
  if (config?.witnessMode === "CONDITIONAL") {
    return {
      witnessMode: "CONDITIONAL",
      requiredWitnessCount: 0,
      requiredWitnessRoles: [],
      triggerCodes: [],
      policyVersion: config.policyVersion ?? WITNESS_POLICY_VERSION,
      policySource: configSource,
      evaluatedAt,
      evidenceCompleteness,
      decisionReason:
        "No witness trigger fired; conditional policy satisfied by routine electronic authentication once evidence is complete.",
      allowSamePersonMultipleRoles,
    };
  }

  // 5. Default routine electronic consent.
  return {
    witnessMode: "NONE",
    requiredWitnessCount: 0,
    requiredWitnessRoles: [],
    triggerCodes: [],
    policyVersion: WITNESS_POLICY_VERSION,
    policySource: "DEFAULT_ROUTINE",
    evaluatedAt,
    evidenceCompleteness,
    decisionReason:
      "Routine electronic consent: no witness mandate and no trigger fired.",
    allowSamePersonMultipleRoles,
  };
}

/**
 * Decide whether completed witness signatures satisfy an evaluated policy.
 * Fails closed: any anomaly (missing role, duplicate person, stale document
 * hash) yields blockers instead of a silent pass.
 */
export function evaluateWitnessSatisfaction(
  decision: WitnessPolicyDecision,
  completed: CompletedWitness[],
  options: { expectedDocumentHash?: string | null } = {},
): WitnessSatisfaction {
  const blockers: string[] = [];
  const missingRoles: WitnessRole[] = [];

  if (decision.requiredWitnessCount === 0) {
    return {
      satisfied: true,
      signedCount: completed.length,
      missingCount: 0,
      missingRoles: [],
      blockers: [],
    };
  }

  const seenUsers = new Set<string>();
  const filledRoles = new Set<WitnessRole>();
  let validCount = 0;

  for (const witness of completed) {
    if (!isWitnessRole(witness.role)) {
      blockers.push("WITNESS_ROLE_UNAUTHORIZED");
      continue;
    }
    if (seenUsers.has(witness.userId)) {
      if (!decision.allowSamePersonMultipleRoles) {
        blockers.push("WITNESS_DUPLICATE_ROLE_SAME_PERSON");
        continue;
      }
    }
    seenUsers.add(witness.userId);

    if (
      options.expectedDocumentHash &&
      witness.documentHash &&
      witness.documentHash !== options.expectedDocumentHash
    ) {
      blockers.push("WITNESS_STALE_DOCUMENT_HASH");
      continue;
    }

    filledRoles.add(witness.role);
    validCount += 1;
  }

  for (const role of decision.requiredWitnessRoles) {
    if (!filledRoles.has(role)) {
      missingRoles.push(role);
    }
  }

  const missingCount = Math.max(0, decision.requiredWitnessCount - validCount);
  if (missingCount > 0) {
    blockers.push("WITNESS_REQUIRED_NOT_SATISFIED");
  }

  return {
    satisfied: blockers.length === 0,
    signedCount: validCount,
    missingCount,
    missingRoles,
    blockers,
  };
}

/**
 * Derive runtime trigger facts from a document's current state. Triggers can
 * fire after creation (e.g. a refusal or dispute captured during the signing
 * journey), so enforcement points re-evaluate the policy with these facts
 * rather than relying only on the creation-time snapshot.
 */
export function extractWitnessTriggerFacts(input: {
  metadata?: unknown;
  hasGuardianSignature?: boolean;
  decisionStatus?: string | null;
}): WitnessTriggerFacts {
  const metadata =
    input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? (input.metadata as Record<string, unknown>)
      : {};
  const recorded =
    metadata.witnessTriggerFacts &&
    typeof metadata.witnessTriggerFacts === "object" &&
    !Array.isArray(metadata.witnessTriggerFacts)
      ? (metadata.witnessTriggerFacts as Record<string, unknown>)
      : {};
  return {
    substituteDecisionMaker:
      input.hasGuardianSignature === true || recorded.substituteDecisionMaker === true,
    lacksCapacity: recorded.lacksCapacity === true,
    cannotReadOrUseJourney: recorded.cannotReadOrUseJourney === true,
    communicationBarrier: recorded.communicationBarrier === true,
    disputedOrObjected:
      recorded.disputedOrObjected === true || metadata.disputedOrObjected === true,
    refusalOrAma:
      recorded.refusalOrAma === true ||
      input.decisionStatus === "CONSENT_REFUSED" ||
      Boolean(metadata.refusalSignature),
  };
}

/** Read a previously persisted policy decision from document metadata. */
export function extractStoredPolicyDecision(metadata: unknown): WitnessPolicyDecision | null {  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as Record<string, unknown>).witnessPolicyDecision;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const decision = raw as WitnessPolicyDecision;
  if (
    (decision.witnessMode !== "NONE" &&
      decision.witnessMode !== "CONDITIONAL" &&
      decision.witnessMode !== "REQUIRED") ||
    typeof decision.requiredWitnessCount !== "number"
  ) {
    return null;
  }
  return decision;
}

export function assertWitnessSatisfied(  decision: WitnessPolicyDecision,
  completed: CompletedWitness[],
  options: { expectedDocumentHash?: string | null } = {},
): void {
  const result = evaluateWitnessSatisfaction(decision, completed, options);
  if (!result.satisfied) {
    const missingRoleText =
      result.missingRoles.length > 0
        ? ` Missing witness role(s): ${result.missingRoles.join(", ")}.`
        : "";
    throw new ApiError(
      409,
      `Required human witness evidence is incomplete: ${result.blockers.join(", ")}.${missingRoleText}`,
      { code: result.blockers[0] ?? "WITNESS_REQUIRED_NOT_SATISFIED" },
    );
  }
}
