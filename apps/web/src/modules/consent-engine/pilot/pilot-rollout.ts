/**
 * Pilot Rollout Status Builder
 *
 * Composes eligibility + audit-preview into a single status object
 * for the internal pilot banner / API. Always reports
 * `productionActive: false` and `phase: "internal-preview"` in this
 * phase.
 */

import {
  canAccessDynamicConsentPilot,
  type PilotEligibilityResult,
} from "@/modules/consent-engine/pilot/pilot-validators";
import {
  buildPilotAuditEvent,
  type PilotAuditEvent,
} from "@/modules/consent-engine/pilot/pilot-audit";

export interface PilotRolloutInput {
  email?: string | null;
  specialty?: string | null;
  searchParams?: URLSearchParams;
  featureFlagEnabled?: boolean;
  renderer?: string;
  evidenceEnabled?: boolean;
}

export interface PilotRolloutStatus {
  phase: "internal-preview";
  productionActive: false;
  rolloutMode: "preview-only";
  eligibility: PilotEligibilityResult;
  auditPreview: PilotAuditEvent;
  warnings: string[];
}

const PILOT_WARNINGS: readonly string[] = [
  "Production workflow is not using the dynamic engine.",
  "Preview output is not legally binding.",
  "No database-backed verification is active.",
  "Feature is disabled by default.",
];

export function buildPilotRolloutStatus(
  input: PilotRolloutInput,
): PilotRolloutStatus {
  const eligibility = canAccessDynamicConsentPilot({
    email: input.email,
    specialty: input.specialty,
    searchParams: input.searchParams,
    featureFlagEnabled: input.featureFlagEnabled,
  });

  const auditPreview = buildPilotAuditEvent({
    email: input.email,
    specialty: input.specialty,
    renderer: input.renderer,
    evidenceEnabled: input.evidenceEnabled,
    featureFlagEnabled: input.featureFlagEnabled,
    eligibility,
  });

  return {
    phase: "internal-preview",
    productionActive: false,
    rolloutMode: "preview-only",
    eligibility,
    auditPreview,
    warnings: [...PILOT_WARNINGS],
  };
}
