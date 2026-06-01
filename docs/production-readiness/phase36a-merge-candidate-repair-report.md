# Phase 36A Merge Candidate Repair Report

## Summary

The Phase36 merge candidate was repaired in the isolated worktree so it can be re-evaluated against the main-merge validation gates. The repair focused on restoring missing source modules needed for the build, rewiring the informed-consents root route to the approved UI, removing the migration file that violated the no-migration constraint, and verifying that the touched route surfaces no longer report diagnostics.

Final recommendation: READY TO RE-RUN PHASE 36 MERGE VALIDATION.

## Repairs Performed

- Restored missing source dependencies required by the public-signing and projection chain:
  - `apps/web/src/lib/projection/unified-disclosure-types.ts`
  - `apps/web/src/lib/projection/unified-disclosure-projection.ts`
  - `apps/web/src/lib/projection/unified-disclosure-shadow-mode.ts`
  - `apps/web/src/lib/server/controlled-production-pilot-governance.ts`
  - `apps/web/src/lib/public-signing/decision-status.ts`
- Added the preview wrapper needed by the build:
  - `apps/web/src/components/preview/physician-workflow/PhysicianWorkflowPreview.tsx`
- Rewired the informed-consents root route in both route trees to the approved workflow UI:
  - `apps/web/app/modules/informed-consents/page.tsx`
  - `apps/web/src/app/modules/informed-consents/page.tsx`
- Removed the educational consent library migration from the merge candidate:
  - `apps/web/prisma/migrations/0028_smart_educational_consent_library_foundation.sql`

## Validation Results

- Build gate: PASSED
  - `npx next build --webpack` completed successfully in the Phase36A worktree.
- Targeted diagnostics on repaired files: CLEAN
  - The touched route files, the preview wrapper, and the restored projection/public-signing helpers report no diagnostics.
- Full typecheck gate: FAILING, but on broader server-side typing issues outside the repaired route surfaces
  - Remaining errors are concentrated in files such as `src/lib/server/evidence-package-2-service.ts`, `src/lib/server/informed-consents-template-catalog.ts`, `src/lib/server/promissory-note-service.ts`, `src/lib/server/public-signing-service.ts`, `src/lib/server/tenant-flag-service.ts`, and `src/platform/subscribers/subscriber-module-access-service.ts`.
  - The repaired informed-consents route files are not part of the failing diagnostics.

## Safety Assessment

- Main hotfixes remain preserved.
- The approved pilot UI path remains wired through the informed-consents route.
- The no-migration condition has been restored by removing the candidate migration.
- The remaining `tsc` failures are real, but they are not introduced by the Phase36A repair set and do not affect the repaired route surfaces.

## Recommendation

READY TO RE-RUN PHASE 36 MERGE VALIDATION.
