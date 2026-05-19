/**
 * Pilot Audit Event Builder — PREVIEW ONLY
 *
 * Pure construction of an in-memory audit event object. No DB writes,
 * no external service calls, no console logging of PHI. Email is
 * masked before inclusion.
 */

import { maskPilotEmail } from "@/modules/consent-engine/pilot/pilot-users";
import { normalizePilotSpecialty } from "@/modules/consent-engine/pilot/pilot-specialties";
import type { PilotEligibilityResult } from "@/modules/consent-engine/pilot/pilot-validators";

export interface PilotAuditEventInput {
  email?: string | null;
  specialty?: string | null;
  renderer?: string;
  evidenceEnabled?: boolean;
  featureFlagEnabled?: boolean;
  eligibility: PilotEligibilityResult;
}

export interface PilotAuditEvent {
  timestamp: string;
  previewUserMasked: string;
  specialty: string | null;
  renderer: string | null;
  evidenceEnabled: boolean;
  featureFlagEnabled: boolean;
  eligibilityAllowed: boolean;
  eligibilityReason: PilotEligibilityResult["reason"];
  mode: PilotEligibilityResult["mode"];
}

/**
 * Build a pilot audit event object. IN MEMORY ONLY. The caller is
 * responsible for using the value safely; this function never
 * persists or transmits the event.
 */
export function buildPilotAuditEvent(
  input: PilotAuditEventInput,
): PilotAuditEvent {
  const specialty = normalizePilotSpecialty(input.specialty ?? null);
  return {
    timestamp: new Date().toISOString(),
    previewUserMasked: maskPilotEmail(input.email ?? null),
    specialty,
    renderer: input.renderer ?? null,
    evidenceEnabled: input.evidenceEnabled === true,
    featureFlagEnabled: input.featureFlagEnabled === true,
    eligibilityAllowed: input.eligibility.allowed === true,
    eligibilityReason: input.eligibility.reason,
    mode: input.eligibility.mode,
  };
}
