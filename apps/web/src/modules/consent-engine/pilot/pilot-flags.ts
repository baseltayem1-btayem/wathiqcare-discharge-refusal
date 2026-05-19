/**
 * Pilot Feature Flag / Activation Gate
 *
 * Pure utilities. No DB. No network. No side effects.
 * Default-deny. Does not modify or read the global
 * `ENABLE_DYNAMIC_CONSENT_ENGINE` flag — the caller passes
 * `featureFlagEnabled` explicitly so this module stays isolated.
 */

export interface PilotActivationInput {
  searchParams?: URLSearchParams;
  query?: Record<string, string | string[] | undefined>;
  featureFlagEnabled?: boolean;
}

const ENGINE_VALUE = "dynamic-preview";
const PILOT_VALUE = "dynamic-consent";

function pickString(
  value: string | string[] | undefined | null,
): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.length > 0 ? value[0] ?? null : null;
  return value;
}

/**
 * Returns true iff the caller has explicitly opted into the pilot
 * preview surface via the runtime feature flag or a known query
 * parameter. Default false.
 */
export function isPilotExplicitlyRequested(
  input: PilotActivationInput = {},
): boolean {
  try {
    if (input.featureFlagEnabled === true) return true;

    if (input.searchParams) {
      if (input.searchParams.get("engine") === ENGINE_VALUE) return true;
      if (input.searchParams.get("pilot") === PILOT_VALUE) return true;
    }

    if (input.query) {
      const engine = pickString(input.query.engine);
      const pilot = pickString(input.query.pilot);
      if (engine === ENGINE_VALUE) return true;
      if (pilot === PILOT_VALUE) return true;
    }

    return false;
  } catch {
    return false;
  }
}
