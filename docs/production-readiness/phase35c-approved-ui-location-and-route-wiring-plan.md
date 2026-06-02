# Phase 35C - Approved UI Location and Route Wiring Plan (No Deploy)

## Scope

This plan is read-only and preparation-only.

Constraints:

- No backend API changes
- No OTP/signing/token/session logic changes
- No migrations
- No SMS enablement
- No deployment in this phase

## Investigation Summary

### Active route currently used

- `apps/web/app/modules/informed-consents/page.tsx`

Current render path:

- `ApprovedPhysicianDashboard`
- release markers applied at wrapper level

Competing duplicate route (kept aligned):

- `apps/web/src/app/modules/informed-consents/page.tsx`
- also renders `ApprovedPhysicianDashboard`

### Other informed-consents surfaces

- `apps/web/app/modules/informed-consents/create/page.tsx` -> `InformedConsentsModulePageNew` (legacy issuance workflow)
- `apps/web/app/modules/informed-consents/consent-creation-workflow/page.tsx` -> redirects to `/modules/informed-consents/create`
- `apps/web/src/app/modules/informed-consents/[section]/page.tsx` -> `ModulePlaceholderPage`
- `apps/web/app/legacy/informed-consents/page.tsx` -> `InformedConsentsModulePageNew`

## Approved UI Inventory (Located)

### Physician approved-design stack

- `apps/web/src/components/approved-design/physician/ApprovedPhysicianDashboard.tsx`

### Patient approved-design stack

- `apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx`
- wired through `apps/web/app/sign/[token]/workflow/page.tsx`

### Legal approved-design stack

- `apps/web/src/components/approved-design/legal/ApprovedLegalCompliance.tsx`

### Full design-system reference (external workspace)

- `WathiqCare-Figma-UX-UI/src/app/App.tsx`
- `WathiqCare-Figma-UX-UI/src/app/components/PhysicianDashboard.tsx`
- `WathiqCare-Figma-UX-UI/src/app/components/ConsentBuilder.tsx`
- `WathiqCare-Figma-UX-UI/src/app/components/StatusTracking.tsx`
- step flow components under `WathiqCare-Figma-UX-UI/src/app/components/steps/`

## Current Wrong UI Source (Operationally)

Based on user live evidence, the currently visible `/modules/informed-consents` surface is to be treated as the wrong (legacy/simplified) UI for release approval.

Technical source presently serving that route:

- `apps/web/app/modules/informed-consents/page.tsx` -> `ApprovedPhysicianDashboard`

Reason for operational mismatch:

- The currently rendered physician surface is visually perceived as simplified and does not satisfy the approved pilot visual baseline expected by stakeholders.
- Marker presence does not resolve this mismatch.

## Why Approved UI Is Not Being Accepted in Production

1. Approval expectation is visual-completeness based, while current gate relied on marker and component identity.
2. Route-level markers were attached to a surface now judged visually insufficient.
3. Informed-consents UX is split across multiple stacks (`ApprovedPhysicianDashboard`, `InformedConsentsModulePageNew`, placeholder section pages), creating inconsistent user-visible experience.

## Wiring Fix Plan

### 1) Which component should `/modules/informed-consents` render?

Target recommendation:

- Render the stakeholder-approved physician landing experience (single authoritative component) only.
- Candidate options to decide before patch:
  - Option A: keep `ApprovedPhysicianDashboard` and upgrade it to match approved visual baseline exactly.
  - Option B: route root to the richer issuance stack (`InformedConsentsModulePageNew`) if that is the approved baseline.

Decision needed from product/UX owner before patch execution.

### 2) Which old/legacy component must be bypassed?

Bypass from release surface:

- `InformedConsentsModulePageNew` at legacy route and create route if not selected as approved baseline.
- `ModulePlaceholderPage` for informed-consents sections.

### 3) Does approved UI require params/props/tenant/auth context?

Yes.

- Root module route requires authenticated claims via `requirePageAuthClaimsOrRedirect` and module permission via `canAccessModule`.
- `ApprovedPhysicianDashboard` requires `currentUser` props (`name`, `role`).
- Patient workflow requires tokenized route `sign/[token]/workflow`.

No backend contract change required for the wiring patch.

### 4) Separate dashboard route and workflow route?

Yes, recommended.

- Keep `/modules/informed-consents` as physician dashboard shell.
- Keep issuance workflow at `/modules/informed-consents/create` (or a new explicit internal workflow route).
- Ensure consistent visual language between dashboard and workflow stacks.

### 5) Simplified consent-type screen handling

Recommended handling:

- Archive/rename simplified screen as internal-only fallback (not release primary).
- Keep behind explicit internal route or feature flag.
- Remove release markers from non-approved surfaces.

## Exact Route Wiring Change Required (Planned)

After UX-owner selection of approved baseline:

1. Update `apps/web/app/modules/informed-consents/page.tsx` to render only the selected approved component.
2. Mirror same change in `apps/web/src/app/modules/informed-consents/page.tsx` to prevent tree divergence.
3. Ensure release markers stay only on the approved surface.
4. Keep `/modules/informed-consents/create` mapped to non-primary workflow if required, but remove ambiguity in navigation labels.
5. De-scope placeholder section routes from release path or map them to real approved pages.

## Files to Change (Patch Set - Planned)

Primary:

- `apps/web/app/modules/informed-consents/page.tsx`
- `apps/web/src/app/modules/informed-consents/page.tsx`

Likely supporting:

- `apps/web/app/modules/informed-consents/create/page.tsx`
- `apps/web/src/app/modules/informed-consents/[section]/page.tsx`
- `apps/web/app/modules/informed-consents/consent-creation-workflow/page.tsx`

## Files to Archive/Disable Later (Planned)

- `apps/web/app/legacy/informed-consents/page.tsx`
- `apps/web/src/components/modules/InformedConsentsModulePageNew.tsx` (if not selected as approved baseline)
- `apps/web/src/components/ModulePlaceholderPage.tsx` for informed-consents section routes

## Visual Acceptance Criteria (Must Pass)

1. `/modules/informed-consents` matches approved baseline screenshots and interaction model.
2. Arabic/English switch preserves approved layout and copy quality.
3. No placeholder fingerprints visible (`Module structure prepared`, `Implementation Status`, `Module Links`).
4. No legacy-only visual artifacts from deprecated stack.
5. Markers present only on the approved rendered component tree.
6. Live user sign-off screenshot confirms approved surface.

## Rollback Plan

If patch causes regressions:

1. Revert root route to prior stable component using git rollback commit.
2. Keep pilot frozen during rollback.
3. Re-run authenticated visual proof with user sign-off evidence.
4. Re-open release decision only after UI parity is restored.

## Final Classification

**CURRENT UI CONFIRMED LEGACY - PILOT REMAINS FROZEN**
