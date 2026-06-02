# Phase 32C - Dependency Verification Before Cleanup

Date: 2026-06-01
Repository: wathiqcare-discharge-refusal
Branch: phase24-evidence-package-final

## Scope and constraints
- Read-only dependency verification before cleanup execution.
- No delete/revert/move/quarantine actions executed in this phase.
- No deploy, no migrations, no SMS enablement, no runtime behavior changes.

## Inputs
- docs/production-readiness/phase32b-workspace-cleanup-execution-plan.md
- Source-only reference scans (excluding .next/.vercel generated outputs for dependency decisions).

## Verification method
For each candidate file:
1. Searched import/reference usage in source paths using `rg`.
2. Confirmed whether references are in production server/runtime code paths.
3. Determined whether removal/revert would introduce build/typecheck risk via missing imports/symbols.
4. Mapped impact against protected runtime scope (informed consents, public signing, evidence/audit, tenant/subscriber).

## Results by file

### 1) apps/web/src/lib/projection/unified-disclosure-projection.ts
- Usage evidence:
  - Imported by shadow mode module: `apps/web/src/lib/projection/unified-disclosure-shadow-mode.ts`.
- Build/typecheck dependency:
  - Required transitively via `executeUnifiedDisclosureShadowMode` call chain.
- Protected runtime impact:
  - Yes; chain is invoked from `apps/web/src/lib/server/public-signing-service.ts` (protected public-signing runtime path).
- Classification:
  - KEEP REQUIRED FOR PROTECTED RUNTIME

### 2) apps/web/src/lib/projection/unified-disclosure-shadow-mode.ts
- Usage evidence:
  - Imported directly by `apps/web/src/lib/server/public-signing-service.ts`.
  - `executeUnifiedDisclosureShadowMode` invoked in public-signing flow.
- Build/typecheck dependency:
  - Yes, direct import from active server runtime module.
- Protected runtime impact:
  - Yes; public-signing protected path.
- Classification:
  - KEEP REQUIRED FOR PROTECTED RUNTIME

### 3) apps/web/src/lib/projection/unified-disclosure-types.ts
- Usage evidence:
  - Imported by both projection and shadow modules.
- Build/typecheck dependency:
  - Yes; required type contract for projection/shadow modules.
- Protected runtime impact:
  - Yes, via shadow/projection chain used in public-signing flow.
- Classification:
  - KEEP REQUIRED FOR BUILD

### 4) apps/web/src/lib/public-signing/decision-status.ts
- Usage evidence:
  - Imported directly by `apps/web/src/lib/server/public-signing-service.ts`.
  - `normalizePublicDecisionStatus` used in active signing decision handling.
- Build/typecheck dependency:
  - Yes, direct import and symbol usage from active server runtime module.
- Protected runtime impact:
  - Yes; public-signing protected path.
- Classification:
  - KEEP REQUIRED FOR PROTECTED RUNTIME

### 5) apps/web/src/lib/server/controlled-production-pilot-governance.ts
- Usage evidence:
  - Imported directly by `apps/web/src/lib/server/public-signing-service.ts`.
  - `evaluateControlledAuthoritativePilot` and `recordControlledPilotObservation` invoked in signing flow.
- Build/typecheck dependency:
  - Yes, direct import and active symbol usage.
- Protected runtime impact:
  - Yes; public-signing protected path and informed-consents-adjacent governance instrumentation.
- Classification:
  - KEEP REQUIRED FOR PROTECTED RUNTIME

### 6) Modified page.tsx revert candidate (exact path)
- Exact file path:
  - `apps/web/app/preview/physician-workflow/page.tsx`
- Route category:
  - Unrelated preview route (`/preview/physician-workflow`), not landing and not request-demo.
- Usage evidence:
  - Referenced as a route link from `apps/web/src/components/modules/InformedConsentsModulePageNew.tsx`.
- Recommendation:
  - REVERT SAFE
- Reason:
  - Current cleanup concern is a modified tracked file outside approved release scope; reverting this file's modifications keeps route presence intact while removing out-of-scope deltas.

## Consolidated classification table
| File | Source dependency found | Build/typecheck required | Protected runtime impact | Final classification |
|---|---|---|---|---|
| apps/web/src/lib/projection/unified-disclosure-projection.ts | Yes (via shadow mode) | Yes (transitive) | Yes | KEEP REQUIRED FOR PROTECTED RUNTIME |
| apps/web/src/lib/projection/unified-disclosure-shadow-mode.ts | Yes (direct in public-signing-service) | Yes | Yes | KEEP REQUIRED FOR PROTECTED RUNTIME |
| apps/web/src/lib/projection/unified-disclosure-types.ts | Yes (projection/shadow type contract) | Yes | Indirect yes | KEEP REQUIRED FOR BUILD |
| apps/web/src/lib/public-signing/decision-status.ts | Yes (direct in public-signing-service) | Yes | Yes | KEEP REQUIRED FOR PROTECTED RUNTIME |
| apps/web/src/lib/server/controlled-production-pilot-governance.ts | Yes (direct in public-signing-service) | Yes | Yes | KEEP REQUIRED FOR PROTECTED RUNTIME |
| apps/web/app/preview/physician-workflow/page.tsx | Route file, modified tracked file | Route exists independent of current diff | No (scope-unrelated preview) | REVERT SAFE |

## Cleanup readiness conclusion
- High-risk USER DECISION files 1-5 are actively referenced by source runtime/build paths and should not be removed/quarantined.
- The modified preview route file is scope-unrelated and is a safe revert candidate for controlled cleanup.

## Final recommendation
STOP - DEPENDENCY RISK REMAINS

Reason:
- Dependency verification confirms files 1-5 are required by active build/protected runtime paths.
- Cleanup execution should exclude removal/quarantine of those files and proceed only on independently safe candidates (for example temporary tsc outputs) plus approved revert of unrelated scope files.
