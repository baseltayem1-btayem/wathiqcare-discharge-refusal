# Root Cause Analysis — Informed Consent stops after consent type selection

## Incident summary
- **Reported symptom:** user selects a consent type and cannot continue.
- **Confirmed failing transition in code:** `Consent Type -> Template Selection`.
- **Primary affected component:** `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/components/modules/InformedConsentsModulePageNew.tsx`
- **Primary affected server loader:** `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/informed-consents-template-catalog.ts`
- **API involved:** `GET /api/modules/informed-consents/templates`

## Exact failing step
When the user clicks a consent type, the frontend immediately calls:

`/api/modules/informed-consents/templates?type=<consentType>&specialty=<physicianSpecialty>&department=<encounterDepartment>`

The workflow then advances to template selection, but template lookup can return an empty result because the request payload uses encounter/display labels that do not match the canonical template catalog keys.

## Root cause
This is primarily a **template/procedure mapping normalization failure** with a secondary **frontend error masking issue**.

### 1) Canonical mapping mismatch
The template catalog expects canonical values such as:
- `SURGERY_CONSENT`
- `BLOOD_TRANSFUSION_CONSENT`
- `SURGERY`
- `GENERAL_SURGERY`

But the workflow was sending values such as:
- `SURGICAL_CONSENT`
- `BLOOD_TRANSFUSION`
- `GENERAL_SURGERY` as specialty
- `General Surgery` as department label

Examples from code:
- UI consent options: `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/components/modules/InformedConsentsModulePageNew.tsx:650-657`
- Catalog filtering: `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/informed-consents-template-catalog.ts:657-714`
- Saudi seeded template types/specialties: `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/informed-consents-saudi-template-library.ts:64-144`
- UAT mock encounter department/specialty labels: `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/uat-mock-encounters.ts:33-69`

### 2) Frontend hid template API failures
The template loader used:

`apiFetch(...).catch(() => [])`

That converted real API failures into an empty template list, so the user only saw the workflow stall with **"No templates available"** instead of the underlying cause.

## Exact error message
- **User-visible current behavior:** `No templates available`
- **New hotfix behavior when nothing matches:** `No active consent templates were found for the selected consent type and encounter context.`

## Failure classification
- **Frontend rendering error:** Partial — the UI advanced and masked backend/data-loader failures.
- **Missing procedure mapping:** **Yes, effectively** through canonical value mismatch.
- **Missing template:** No hard evidence of missing templates in source; seeded templates exist.
- **API failure:** Possible to be hidden by the old frontend catch; not directly confirmable from production from this sandbox.
- **JSON parsing error:** No direct evidence.
- **React hydration error:** No direct evidence.
- **Production deployment mismatch:** **Not confirmable** from this sandbox.

## Hotfix implemented
### Files changed
- `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/informed-consents-template-catalog.ts`
- `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/components/modules/InformedConsentsModulePageNew.tsx`
- `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/informed-consents-template-catalog.test.ts`

### What changed
1. Added canonical normalization for consent type, specialty, and department lookup values.
2. Added alias support for legacy labels such as `SURGICAL_CONSENT` and `BLOOD_TRANSFUSION`.
3. Matched templates in memory using canonicalized values instead of strict raw filter equality.
4. Preserved generic templates for broader encounter contexts.
5. Removed the frontend `.catch(() => [])` that was suppressing template API failures.
6. Added explicit regression tests for the affected mappings.

## Recommended fix
- Keep all informed-consent lookup filters normalized at a single backend boundary.
- Do not filter template selection by raw display labels from TrakCare/UI.
- Never swallow template-loader API errors into empty arrays.
- Consider returning diagnostic metadata from the template API when zero templates match.

## Validation performed
### Passed
- `npx tsx --test src/lib/server/informed-consents-template-catalog.test.ts`
- `npm run lint -- src/lib/server/informed-consents-template-catalog.ts src/lib/server/informed-consents-template-catalog.test.ts src/components/modules/InformedConsentsModulePageNew.tsx`

### Existing unrelated failures still present
- `npm run test` still fails on:
  - `src/lib/server/legal-case-pdf-storage.test.ts`
  - `src/lib/server/pdf-engine-foundation.test.ts`
- Existing build still fails in this sandbox with Prisma schema/tooling incompatibility discovered before this hotfix.

## Validation screenshots
- **Production screenshots:** not obtainable from this sandbox because `wathiqcare.online` and the documented Vercel alias were not resolvable/reachable here.
- **Captured historical artifact:** `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/vercel-health.out.txt` contains a previous Vercel error page (`Deployment has failed`) for `instant-preview-site.vercel.app`, but this is not sufficient to assert current production state.

## Production SHA / alias / deployed build verification
### Local
- **Current local HEAD SHA:** `12674d0e178ec09cebc22ce4600b4dc11f2aa0be`

### Production
- **Current production deployment SHA:** not confirmed from this sandbox
- **Runtime endpoint available in code for verification:** `/api/health/runtime`
  - Source: `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/app/api/health/runtime/route.ts:14-36`
  - Expected fields: `deployment.gitCommitSha`, `deployment.vercelUrl`, `deployment.gitCommitRef`

### Documented aliases found in repo
- `https://wathiqcare.online`
- `https://web-kaizcjuea-wathiqcare.vercel.app`

### Build-state conclusion
- **Old build vs latest build:** **not confirmed**
- Reason: current production/runtime endpoints were unreachable from this sandbox, so no live SHA comparison was possible.

## End-to-end workflow status
Actual production E2E could **not** be executed from this sandbox, so the following steps are **not verified on production**:

- Consent Type → **PASS at code/test level only**
- Procedure Education → **NOT VERIFIED**
- Understanding Check → **NOT VERIFIED**
- Signature → **NOT VERIFIED**
- OTP → **NOT VERIFIED**
- Evidence → **NOT VERIFIED**

## Final assessment
The most likely incident trigger is the **consent template lookup using non-canonical consent/specialty/department values**, combined with the frontend **masking template API failures as an empty result**, which made the workflow appear to stop immediately after consent type selection.
