import {
  parseTemplateWitnessPolicy,
  type TemplateWitnessPolicyConfig,
  type WitnessPolicySource,
} from "@/lib/server/witness-policy-service";

/**
 * Governed, versioned conditional-witness policy profiles.
 *
 * This is a small typed, code-controlled registry: a profile is reviewed,
 * versioned and shipped with the codebase instead of being stored as mutable
 * template metadata. It never edits an approved source PDF, never flips a DB
 * requiresWitness flag and never fabricates clinical-governance approval
 * records — it only supplies an evaluated digital policy with explicit
 * provenance (policySource GOVERNED_CODE_PROFILE + policyVersion).
 *
 * Precedence (see resolveTemplateWitnessPolicy):
 *   1. Explicit ConsentTemplate.metadata.witnessPolicy (governance-set) wins.
 *   2. Otherwise the registry profile applies only when the templateCode
 *      matches exactly AND the version gate passes.
 *
 * Version gate (fail closed):
 *   - version label present and non-empty: the profile applies only on an
 *     exact match with profile.templateVersion; any other label means the
 *     profile is NOT applied (fall through to legacy/default behaviour).
 *   - version label absent/unknown: the profile applies ONLY while its
 *     effectiveState is PREVIEW_ACTIVE; a production-approved profile requires
 *     an exact version match and is never applied to an unversioned template.
 */

export const GOVERNED_CODE_PROFILE_SOURCE = "GOVERNED_CODE_PROFILE" as const;

export type WitnessPolicyProfileEffectiveState =
  | "PREVIEW_ACTIVE"
  | "PRODUCTION_APPROVED";

export type WitnessPolicyProfile = {
  /** Exact ConsentTemplate.templateCode the profile governs. */
  templateCode: string;
  /** Human-readable approved form reference (paper form number). */
  templateFormReference: string;
  /** Approved source-PDF / template version the profile was calibrated against. */
  templateVersion: string;
  /** Version of the digital policy itself (decision provenance). */
  policyVersion: string;
  policySource: typeof GOVERNED_CODE_PROFILE_SOURCE;
  /**
   * PREVIEW_ACTIVE means the profile may also apply when the template version
   * is absent/unknown. Production activation requires the normal
   * clinical-governance approval workflow; see governanceNote.
   */
  effectiveState: WitnessPolicyProfileEffectiveState;
  governanceNote: string;
  /** The evaluated digital policy (TemplateWitnessPolicyConfig-equivalent). */
  policy: TemplateWitnessPolicyConfig;
};

export const WITNESS_POLICY_PROFILES: readonly WitnessPolicyProfile[] = [
  {
    templateCode: "imc-adenotonsillectomy",
    templateFormReference: "IMC MR 1168",
    templateVersion: "2018-02",
    policyVersion: "1.1.0",
    policySource: GOVERNED_CODE_PROFILE_SOURCE,
    effectiveState: "PREVIEW_ACTIVE",
    governanceNote:
      "PREVIEW_ACTIVE only: conditional-witness profile for IMC MR 1168 (approved PDF version 2018-02). Production activation requires the normal clinical-governance approval workflow; this registry does not edit the approved PDF, does not flip any DB requiresWitness flag and does not create governance approval records.",
    policy: {
      // Default digital policy: routine electronic completion with zero human
      // witnesses; any fired runtime trigger escalates to REQUIRED in the
      // engine (fail closed). Two witnesses are supported only when a governed
      // case policy expressly requires them (engine caps the count at 2).
      witnessMode: "CONDITIONAL",
      requiredWitnessCount: 0,
      requiredWitnessRoles: [
        "NURSING_REPRESENTATIVE",
        "PATIENT_EXPERIENCE_REPRESENTATIVE",
      ],
      allowSamePersonMultipleRoles: false,
      policyVersion: "1.1.0",
    },
  },
];

/**
 * Ambiguity is prevented by construction: at most one profile may exist per
 * templateCode. A duplicate is a programming error and aborts module load.
 */
const PROFILE_BY_TEMPLATE_CODE = new Map<string, WitnessPolicyProfile>();
for (const profile of WITNESS_POLICY_PROFILES) {
  if (PROFILE_BY_TEMPLATE_CODE.has(profile.templateCode)) {
    throw new Error(
      `Duplicate witness policy profile for templateCode "${profile.templateCode}"`,
    );
  }
  PROFILE_BY_TEMPLATE_CODE.set(profile.templateCode, profile);
}

export type ResolvedTemplateWitnessPolicy = {
  /** Policy config to hand to evaluateWitnessPolicy, or null for legacy/default behaviour. */
  policy: TemplateWitnessPolicyConfig | null;
  /** Provenance source for the decision when a policy is present. */
  policySource: WitnessPolicySource | null;
  /** The governed registry profile that supplied the policy, if any. */
  profile: WitnessPolicyProfile | null;
};

/**
 * Resolve the effective witness policy for a template.
 *
 * Fail closed in every ambiguous case: an invalid metadata policy still throws
 * (WITNESS_POLICY_CONFIG_INVALID), a version present-but-mismatched profile is
 * never applied, and an unversioned template only receives a PREVIEW_ACTIVE
 * profile — all other cases fall through to legacy/default behaviour.
 */
export function resolveTemplateWitnessPolicy(input: {
  metadata: unknown;
  templateCode?: string | null;
  templateVersionLabel?: string | null;
}): ResolvedTemplateWitnessPolicy {
  // 1. Explicit governance-set template metadata policy always wins.
  const metadataPolicy = parseTemplateWitnessPolicy(input.metadata);
  if (metadataPolicy) {
    return { policy: metadataPolicy, policySource: "TEMPLATE_METADATA", profile: null };
  }

  // 2. Governed code-controlled registry profile (exact templateCode match).
  const code = typeof input.templateCode === "string" ? input.templateCode.trim() : "";
  if (!code) {
    return { policy: null, policySource: null, profile: null };
  }
  const profile = PROFILE_BY_TEMPLATE_CODE.get(code);
  if (!profile) {
    return { policy: null, policySource: null, profile: null };
  }

  // 3. Version gate — fail closed on any ambiguity.
  const versionLabel =
    typeof input.templateVersionLabel === "string" ? input.templateVersionLabel.trim() : "";
  if (versionLabel) {
    if (versionLabel !== profile.templateVersion) {
      // Version present but not the approved profile version: never apply silently.
      return { policy: null, policySource: null, profile: null };
    }
  } else if (profile.effectiveState !== "PREVIEW_ACTIVE") {
    // Version absent/unknown: only a preview-active profile may apply.
    return { policy: null, policySource: null, profile: null };
  }

  return {
    policy: { ...profile.policy },
    policySource: GOVERNED_CODE_PROFILE_SOURCE,
    profile,
  };
}
