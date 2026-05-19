/**
 * Pilot Eligibility Validator
 *
 * Composes the explicit-request gate, user allow-list, and specialty
 * allow-list into a single default-deny decision.
 */

import { isPilotExplicitlyRequested } from "@/modules/consent-engine/pilot/pilot-flags";
import { isPilotUser } from "@/modules/consent-engine/pilot/pilot-users";
import { isPilotSpecialty } from "@/modules/consent-engine/pilot/pilot-specialties";

export type PilotEligibilityReason =
  | "pilot-not-requested"
  | "user-not-allow-listed"
  | "specialty-not-enabled"
  | "blocked-by-default"
  | "pilot-preview-allowed";

export interface PilotEligibilityInput {
  email?: string | null;
  specialty?: string | null;
  searchParams?: URLSearchParams;
  featureFlagEnabled?: boolean;
}

export interface PilotEligibilityResult {
  allowed: boolean;
  reason: PilotEligibilityReason;
  mode: "preview-only" | "blocked";
  checks: {
    requested: boolean;
    userAllowed: boolean;
    specialtyAllowed: boolean;
  };
}

/**
 * Default-deny pilot eligibility check.
 *
 * - Never throws.
 * - No DB writes.
 * - No network calls.
 * - Returns blocked-by-default on any internal failure.
 */
export function canAccessDynamicConsentPilot(
  input: PilotEligibilityInput,
): PilotEligibilityResult {
  try {
    const requested = isPilotExplicitlyRequested({
      searchParams: input.searchParams,
      featureFlagEnabled: input.featureFlagEnabled,
    });
    const userAllowed = isPilotUser(input.email);
    const specialtyAllowed = isPilotSpecialty(input.specialty);

    const checks = { requested, userAllowed, specialtyAllowed };

    if (!requested) {
      return { allowed: false, reason: "pilot-not-requested", mode: "blocked", checks };
    }
    if (!userAllowed) {
      return {
        allowed: false,
        reason: "user-not-allow-listed",
        mode: "blocked",
        checks,
      };
    }
    if (!specialtyAllowed) {
      return {
        allowed: false,
        reason: "specialty-not-enabled",
        mode: "blocked",
        checks,
      };
    }

    return {
      allowed: true,
      reason: "pilot-preview-allowed",
      mode: "preview-only",
      checks,
    };
  } catch {
    return {
      allowed: false,
      reason: "blocked-by-default",
      mode: "blocked",
      checks: { requested: false, userAllowed: false, specialtyAllowed: false },
    };
  }
}
