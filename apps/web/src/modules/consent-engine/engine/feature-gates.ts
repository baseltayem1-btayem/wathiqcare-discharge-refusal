import { ENABLE_DYNAMIC_CONSENT_ENGINE } from "@/lib/config/feature-flags";

function normalizeFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isDynamicConsentEngineEnabled(): boolean {
  return normalizeFlag(process.env.ENABLE_DYNAMIC_CONSENT_ENGINE, ENABLE_DYNAMIC_CONSENT_ENGINE);
}