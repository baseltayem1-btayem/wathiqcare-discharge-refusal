/**
 * Active-route consent-type registry (legacy ID system).
 * ------------------------------------------------------------
 * The production issuance route (`/modules/informed-consents/create` →
 * `InformedConsentsModulePageNew`) historically hard-coded a 4-item
 * consent-type list inline. That bypassed the pilot-readiness gate
 * established in v1.0.1 via:
 *
 *   apps/web/src/components/modules/informed-consent-issuance/types.ts
 *
 * which is wired into the *other* issuance entry point. The two routes
 * use different identifier systems (lowercase ids vs. SCREAMING_SNAKE
 * `consentType` values consumed by `/api/modules/informed-consents/
 * templates?type=...`), so we cannot simply re-import the existing
 * registry. This module is the SCREAMING_SNAKE-side equivalent.
 *
 * Safety boundary:
 *   - UI-layer filtering only.
 *   - No DB schema, no API, no workflow, no audit-chain change.
 *   - Identifiers are unchanged; we only restrict which appear in
 *     the selector. Downstream API calls receive the same string
 *     values they would have before.
 *
 * Status taxonomy is intentionally aligned with `types.ts` so a single
 * mental model governs both routes:
 *   - "pilot-ready" : validated end-to-end against the v1.0.1 smoke.
 *   - "active"      : fully validated and approved for general use.
 *   - "coming-soon" : architecturally present but not yet validated
 *                     for live pilot exposure.
 *   - "disabled"    : explicitly withheld.
 *
 * v1.0.1 pilot snapshot:
 *   GENERAL_CONSENT       → pilot-ready
 *   SURGICAL_CONSENT      → coming-soon  (UI id; DB stores SURGERY_CONSENT)
 *   ANESTHESIA_CONSENT    → coming-soon
 *   BLOOD_TRANSFUSION     → coming-soon  (UI id; DB stores BLOOD_TRANSFUSION_CONSENT)
 *
 * Promotion path: see pilot-package/CONSENT_TYPE_READINESS_MATRIX.md §4.
 */

export type ActiveRouteConsentTypeStatus =
  | "pilot-ready"
  | "active"
  | "coming-soon"
  | "disabled";

export type ActiveRouteConsentType = {
  /** Identifier sent to `/api/modules/informed-consents/templates?type=`. */
  id: string;
  /** Display label (falls back to id.replace(/_/g, " ") if absent). */
  label?: string;
  status: ActiveRouteConsentTypeStatus;
};

/**
 * Source of truth for the active production issuance route.
 * Order is the order the selector renders. Do not reorder without
 * also updating PRODUCTION_ISSUANCE_ROUTE_AUDIT.md.
 */
export const ACTIVE_ROUTE_CONSENT_TYPES: readonly ActiveRouteConsentType[] = [
  { id: "GENERAL_CONSENT",    status: "pilot-ready" },
  { id: "SURGICAL_CONSENT",   status: "coming-soon" },
  { id: "ANESTHESIA_CONSENT", status: "coming-soon" },
  { id: "BLOOD_TRANSFUSION",  status: "coming-soon" },
];

/** Types eligible for selector exposure during the controlled pilot. */
export function getActiveRouteConsentTypes(): ReadonlyArray<ActiveRouteConsentType> {
  return ACTIVE_ROUTE_CONSENT_TYPES.filter(
    (t) => t.status === "pilot-ready" || t.status === "active",
  );
}

/** True iff `id` is currently exposed in the selector. */
export function isActiveRouteConsentTypeExposed(id: string): boolean {
  return getActiveRouteConsentTypes().some((t) => t.id === id);
}

/** Count of types deliberately withheld from the selector. */
export function getHiddenActiveRouteConsentTypeCount(): number {
  return ACTIVE_ROUTE_CONSENT_TYPES.length - getActiveRouteConsentTypes().length;
}
