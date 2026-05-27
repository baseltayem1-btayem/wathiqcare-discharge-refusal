# Production Issuance Route Audit — Consent-Type Exposure

**Phase:** Production Issuance Route Consistency Audit
**Branch:** `phase24-evidence-package-final`
**Status:** Preview-only. **No production deployment.**
**Related:** [pilot-package/CONSENT_TYPE_READINESS_MATRIX.md](CONSENT_TYPE_READINESS_MATRIX.md), [pilot-package/UI_INTEGRATION_CHANGELOG.md](UI_INTEGRATION_CHANGELOG.md)
**Feature flag:** `FEATURE_UI_REFRESH_V1_1` remains **OFF** for this work — these are pure pilot-stabilization changes that ship independent of the visual refresh.

---

## 1. Architectural observation

The repository contains **two parallel issuance UI implementations**:

| Implementation | File | Wired into route? |
| --- | --- | --- |
| Legacy issuance page (v1.0.1 hardening landed here) | [apps/web/src/components/modules/informed-consent-issuance/InformedConsentIssuancePage.tsx](../apps/web/src/components/modules/informed-consent-issuance/InformedConsentIssuancePage.tsx) | **No live route** found in `apps/web/app/**/page.tsx` |
| Active production issuance page | [apps/web/src/components/modules/InformedConsentsModulePageNew.tsx](../apps/web/src/components/modules/InformedConsentsModulePageNew.tsx) | **Yes** — rendered by [apps/web/app/modules/informed-consents/create/page.tsx](../apps/web/app/modules/informed-consents/create/page.tsx) |

The previous "Consent Type Registry Validation and UI Restriction" phase
(commit `aa835da`) added `ConsentTypeStatus`, `getActiveConsentTypes()`, and
the "N more coming soon" disclosure **to the legacy page only**. The active
production route was unaffected and continued to expose an
unfiltered hardcoded list.

This audit closes that gap.

---

## 2. Findings on the active route (pre-patch)

### 2.1 Consent-type source

`InformedConsentsModulePageNew.tsx` previously declared the selector inline:

```tsx
{["GENERAL_CONSENT", "SURGICAL_CONSENT", "ANESTHESIA_CONSENT", "BLOOD_TRANSFUSION"].map((type) => ( … ))}
```

- **Mechanism:** hard-coded literal array, rendered without filtering.
- **Identifier system:** `SCREAMING_SNAKE` (`GENERAL_CONSENT`, …). Different
  from the lowercase identifier system used by the legacy page
  (`surgical`, `anesthesia`, …) — the two pages cannot share a single
  registry directly without renaming downstream API values.
- **Imports from `informed-consent-issuance/types.ts`:** **none**.
- **`getActiveConsentTypes()` invocation:** **not present**.

### 2.2 Gating mechanisms enforced on this route (pre-patch)

| Gate | Enforced? | Where |
| --- | --- | --- |
| Selector restricted to pilot-ready types | **No** | All 4 hardcoded buttons rendered unconditionally. |
| Pilot allowlist (`pilot-users` / `pilot-specialties`) | **No** | Not applied to the consent-type selector. |
| "Coming soon" hiding | **No** | No disclosure. |
| Template-catalog status filter (`status ∈ {ACTIVE, APPROVED}`) | **Yes** | [apps/web/src/lib/server/informed-consents-template-catalog.ts](../apps/web/src/lib/server/informed-consents-template-catalog.ts) (`listRuntimeConsentTemplates`, ~L673). |
| Template-version status filter | **Yes** | Same file, version `where` clause. |
| Server-side consent-type validation at draft generation | **No** | `/api/modules/informed-consents/generate-draft` accepts any `templateId` whose template the catalog returns. |

### 2.3 Can the production route expose incomplete consent types?

| Question | Answer |
| --- | --- |
| Can the user **see** a non-validated consent type button? | **Yes (pre-patch).** Three of the four buttons (`SURGICAL_CONSENT`, `ANESTHESIA_CONSENT`, `BLOOD_TRANSFUSION`) had no pilot validation evidence. |
| Can the user **proceed past the template-selection step** with a non-validated type? | **No.** The catalog filters by `ACTIVE`/`APPROVED` status; if no template exists/is approved for that type, the user reaches a dead-end "no templates" state. |
| Can the user **submit** a draft for a non-validated type via the UI? | **No (in the standard path).** Template selection is required first, and no qualifying template would be offered. |
| Could a direct API caller bypass the gate? | **Partially.** `generate-draft` does not re-validate the consent type against an allowlist; it relies on the catalog filter for safety. Out of scope for this UI-only phase, but worth tracking. |

### 2.4 Identifier mismatches discovered (informational)

Two of the inline literals do not match the database `consentType` strings
used by seeded templates:

| Selector literal | Database `consentType` | Effect |
| --- | --- | --- |
| `SURGICAL_CONSENT` | `SURGERY_CONSENT` | API query returns no templates; dead end. |
| `BLOOD_TRANSFUSION` | `BLOOD_TRANSFUSION_CONSENT` | API query returns no templates; dead end. |

These mismatches actually act as an accidental safety net today, but they
should not be relied on. Tracked as a follow-up; **no rename is performed
in this phase** because changing the literal sent to the API is a behaviour
change, not a pure UI-filter change.

---

## 3. Restriction applied (this commit)

UI-only filtering layer added. **No backend, schema, API, or workflow code
was modified.**

### 3.1 New file

[apps/web/src/components/modules/informed-consents-active-types.ts](../apps/web/src/components/modules/informed-consents-active-types.ts)

- Declares `ActiveRouteConsentTypeStatus` (`pilot-ready` | `active` |
  `coming-soon` | `disabled`) — same taxonomy as the legacy page's
  `ConsentTypeStatus` for consistency.
- Declares `ACTIVE_ROUTE_CONSENT_TYPES`, the SCREAMING_SNAKE equivalent of
  the legacy `CONSENT_TYPES` registry, with per-type status.
- Exports helpers:
  - `getActiveRouteConsentTypes()` — returns only `pilot-ready` / `active`.
  - `isActiveRouteConsentTypeExposed(id)` — boolean check.
  - `getHiddenActiveRouteConsentTypeCount()` — disclosure count.

Initial pilot snapshot:

| `id` (sent to `/api/.../templates?type=`) | Status |
| --- | --- |
| `GENERAL_CONSENT` | `pilot-ready` |
| `SURGICAL_CONSENT` | `coming-soon` |
| `ANESTHESIA_CONSENT` | `coming-soon` |
| `BLOOD_TRANSFUSION` | `coming-soon` |

### 3.2 Modified file

[apps/web/src/components/modules/InformedConsentsModulePageNew.tsx](../apps/web/src/components/modules/InformedConsentsModulePageNew.tsx)

- Imports the helpers above.
- Computes `ACTIVE_ROUTE_CONSENT_TYPES_FOR_SELECTOR` and
  `HIDDEN_ACTIVE_ROUTE_CONSENT_TYPE_COUNT` once at module load.
- Replaces the inline `[…].map(…)` selector with a render over the
  filtered list. Identifiers sent to `setConsentType` / `loadTemplates`
  are **bitwise-identical** to the previous values for the exposed
  type (`GENERAL_CONSENT`).
- Adds a bilingual "N more coming soon" / "أنواع أخرى قريبًا" disclosure
  underneath the grid when any types are withheld.

### 3.3 What was not touched

- `loadTemplates()`, `setConsentType()`, `setCurrentStep()` — unchanged.
- `/api/modules/informed-consents/templates` — unchanged.
- `/api/modules/informed-consents/generate-draft` — unchanged.
- Template catalog (`listRuntimeConsentTemplates`) — unchanged.
- Prisma `ConsentTemplate` model — unchanged.
- OTP, signing workflow, audit chain, evidence package, secure-link
  validation, legal sequencing — unchanged.
- UI Refresh v1.1 feature flag — remains OFF.

---

## 4. Post-patch verification matrix

| Check | Expected | How verified |
| --- | --- | --- |
| Only `GENERAL_CONSENT` button renders | One card visible | Code review of `getActiveRouteConsentTypes()` output. |
| Disclosure pill reads "3 more coming soon" | Yes | `getHiddenActiveRouteConsentTypeCount()` returns `3`. |
| Selecting `GENERAL_CONSENT` still loads templates | Identical to baseline | `setConsentType("GENERAL_CONSENT")` + `loadTemplates("GENERAL_CONSENT", …)` unchanged. |
| No new compile errors on the patched file | Clean | `get_errors` reports only the pre-existing file-level jsx-a11y warning unrelated to this edit. |
| Backend remains unchanged | Yes | No edits under `apps/api/**`, `apps/web/app/api/**`, `apps/web/src/lib/server/**`, or `prisma/**`. |
| Legacy issuance page (`InformedConsentIssuancePage`) consistency | Already pilot-restricted via `getActiveConsentTypes()` | Commit `aa835da`. |

---

## 5. Preview-only validation plan

Before any production exposure, run the following on a Vercel preview
(do **not** enable `NEXT_PUBLIC_FF_UI_REFRESH_V1_1`):

1. Open `/modules/informed-consents/create` as a pilot physician.
2. Verify exactly **one** consent-type card renders (`GENERAL_CONSENT`).
3. Verify "3 more coming soon" / "3 أنواع أخرى قريبًا" disclosure.
4. Select the card → templates load → choose a template → advance through
   the standard workflow.
5. Run the v1.0.1 11-check smoke harness against the preview.
6. Confirm audit-chain hash continuity for a finalized consent matches
   the v1.0.1 baseline for an equivalent input.
7. Attempt direct navigation/state injection of a `coming-soon` id;
   confirm the existing template-catalog status filter still produces
   the empty-state result.

---

## 6. Promotion procedure (mirrors legacy registry)

To flip a `coming-soon` type to `pilot-ready` on the active route:

1. Run the targeted smoke against a Vercel preview using that consent
   type end-to-end (selector → template → draft → OTP → signature →
   finalize → audit chain → evidence package).
2. Confirm legal evidence-sample sign-off per
   `PILOT_USER_GUIDE_LEGAL_COMPLIANCE.md` §3.
3. IMC Governance Lead authorization recorded in commit message.
4. **Single-line edit** in
   [apps/web/src/components/modules/informed-consents-active-types.ts](../apps/web/src/components/modules/informed-consents-active-types.ts)
   changing the type's `status: "coming-soon"` → `status: "pilot-ready"`.
5. Update both this audit doc and `CONSENT_TYPE_READINESS_MATRIX.md`
   change log in the same commit.
6. No other code changes permitted in the promotion commit.

> If `SURGICAL_CONSENT` or `BLOOD_TRANSFUSION` is promoted, the
> identifier-mismatch follow-up (§2.4) MUST be resolved in the same
> commit — otherwise the type will appear exposed but render an empty
> template list.

---

## 7. Rollback

This phase is rollback-safe:

1. **Code-level revert:** revert the commit. Two files restored
   (deleted `informed-consents-active-types.ts` + restored inline array
   in `InformedConsentsModulePageNew.tsx`).
2. **Hot configuration:** none required. The change is purely a static
   import + filter; there is no runtime toggle to flip in production.
3. **Schema / migration:** none touched, nothing to roll back.

---

## 8. Change log

| Date | Author | Change |
| --- | --- | --- |
| 2026-05-27 | Pilot Stabilization | Audit performed. Active route restricted to `GENERAL_CONSENT` for the pilot via UI-only allowlist; "3 more coming soon" disclosure added. No backend, API, schema, or workflow change. |
