/**
 * FEATURE_UI_REFRESH_V1_1
 * ------------------------------------------------------------
 * Safe UI Integration from Figma — v1.1 design refresh.
 *
 * Scope:
 *   - Visual only (layout, typography, spacing, colors, cards,
 *     stepper visuals, responsive behaviour, a11y).
 *   - NEVER touches: OTP logic, signing workflow, audit chain,
 *     evidence generation, secure-link validation, legal sequencing,
 *     backend APIs, database schema.
 *
 * Activation:
 *   - Build/runtime env: NEXT_PUBLIC_FF_UI_REFRESH_V1_1=1 (or "true")
 *   - Default: OFF (legacy UI unchanged).
 *   - Preview-only by policy. Do NOT enable in production until
 *     full regression + smoke pass (see UI_INTEGRATION_CHANGELOG.md).
 *
 * Pattern:
 *   The flag is read once at module load. Because it is a
 *   NEXT_PUBLIC_* variable, Next.js inlines the value at build time
 *   for client bundles and at process start for server code, so
 *   both render paths see the same boolean.
 */

function readUIRefreshFlag(): boolean {
  const raw = process.env.NEXT_PUBLIC_FF_UI_REFRESH_V1_1;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on";
}

export const FEATURE_UI_REFRESH_V1_1: boolean = readUIRefreshFlag();

/** Stable attribute name used to scope v1.1 tokens in CSS. */
export const UI_REFRESH_ATTR = "data-ui-refresh" as const;

/** Attribute value the boundary applies when the flag is on. */
export const UI_REFRESH_ATTR_VALUE = "v1.1" as const;
