# Phase 32B - Workspace Cleanup Execution Plan

Date: 2026-06-01
Repository: wathiqcare-discharge-refusal
Branch: phase24-evidence-package-final

## Scope and constraints
- Planning only.
- No cleanup execution in this phase.
- No deploy, no migrations, no SMS enablement.
- No patient-journey, OTP/signing/token/session behavior changes.
- No Arabic guard changes.

## Input source
- Source report: docs/production-readiness/phase32a-workspace-reconciliation-before-single-tenant-pilot.md
- Extracted scope for this plan: all files classified B, C, and D.

## Protected from automatic removal
The following must not be auto-removed during cleanup execution:
- docs/production-readiness/phase31e-final-production-critical-typecheck-remediation-report.md
- docs/production-readiness/phase31f-controlled-pilot-baseline-waiver-and-go-no-go.md
- docs/production-readiness/phase31g-remaining-protected-path-remediation-report.md
- docs/production-readiness/phase31h-final-controlled-pilot-baseline-waiver-approval.md
- docs/production-readiness/phase32-tenant-subscriber-isolation-verification-report.md
- docs/production-readiness/phase32a-workspace-reconciliation-before-single-tenant-pilot.md
- Phase 31E/31G approved remediation source files:
  - apps/web/src/lib/server/evidence-package-2-service.ts
  - apps/web/src/lib/server/informed-consents-template-catalog.ts
  - apps/web/src/lib/server/legal-package-module-service.ts
  - apps/web/src/lib/server/promissory-note-service.ts
  - apps/web/src/lib/server/public-signing-service.ts
  - apps/web/src/lib/server/tenant-flag-service.ts
  - apps/web/src/platform/subscribers/subscriber-module-access-service.ts
- Retained landing/request-demo/OTP branding files:
  - apps/web/app/page.tsx
  - apps/web/app/[lang]/page.tsx
  - apps/web/app/request-demo/page.tsx
  - apps/web/app/[lang]/request-demo/page.tsx
  - apps/web/src/components/landing/WathiqcareWhiteLanding.tsx
  - apps/web/src/components/request-demo/WathiqcareRequestDemoPage.tsx
  - apps/web/src/components/public-signing/OtpVerificationBranding.tsx
  - apps/web/src/lib/branding/otp-page-branding.ts
- Route wrappers required for landing/request-demo are protected by the retained app route files above.

## Cleanup planning table (B/C/D only)
| File path | Current git status | Classification | Reason | Proposed action | Risk if kept | Risk if removed |
|---|---|---|---|---|---|---|
| apps/web/src/lib/projection/unified-disclosure-projection.ts | ?? | B. REVIEW REQUIRED | Restored/helper projection runtime module with possible runtime coupling. | ask user | Unreviewed runtime module may carry behavior/policy drift. | Could reintroduce TS/import breakage if still required by other projection files. |
| apps/web/src/lib/projection/unified-disclosure-shadow-mode.ts | ?? | B. REVIEW REQUIRED | Restored/helper shadow module; runtime impact unknown. | ask user | May introduce unapproved pilot governance/runtime path logic. | Could break shadow/projection references if dependency exists. |
| apps/web/src/lib/projection/unified-disclosure-types.ts | ?? | B. REVIEW REQUIRED | Restored type-contract helper from prior remediation context. | ask user | Could retain non-approved schema/contracts in active tree. | If referenced, removal can break typecheck/import resolution. |
| apps/web/src/lib/public-signing/decision-status.ts | ?? | B. REVIEW REQUIRED | New public-signing helper outside explicit keep list. | ask user | Potential drift in signing decision semantics if later wired. | If used by pending code, removal can break compile/runtime imports. |
| apps/web/src/lib/server/controlled-production-pilot-governance.ts | ?? | B. REVIEW REQUIRED | New runtime governance file; release-impacting and security-sensitive. | ask user | Unapproved runtime governance logic present in repo state. | If referenced, removal can break build or pilot observability hooks. |
| docs/production-readiness/phase31b-typecheck-baseline-classification-report.md | ?? | B. REVIEW REQUIRED | Earlier production-readiness artifact; not mandatory keep for current gate. | quarantine to _archive/pre-production-cleanup/ | Workspace noise and evidence sprawl if left uncurated. | Historical context loss unless archived before removal. |
| docs/production-readiness/phase31c-high-risk-typecheck-remediation-plan.md | ?? | B. REVIEW REQUIRED | Earlier planning artifact; may be useful for audit trail. | quarantine to _archive/pre-production-cleanup/ | Workspace noise; confusion about active authoritative phase set. | Planning traceability loss unless archived. |
| docs/production-readiness/phase31d-high-risk-typecheck-remediation-execution-report.md | ?? | B. REVIEW REQUIRED | Earlier execution artifact pre-final approved set. | quarantine to _archive/pre-production-cleanup/ | Workspace clutter and conflicting historical decision signals. | Forensic timeline loss unless archived. |
| apps/web/tsc-phase31d-stage1-utf8.txt | ?? | C. QUARANTINE / REMOVE CANDIDATE | Temporary tsc output artifact. | remove untracked | Pollutes workspace and can be mistaken for release evidence. | Minimal functional risk; only diagnostic history is lost. |
| apps/web/tsc-phase31d-stage1.txt | ?? | C. QUARANTINE / REMOVE CANDIDATE | Temporary/raw tsc output artifact. | remove untracked | Same as above; noisy local artifact. | Minimal functional risk; only diagnostic history is lost. |
| apps/web/app/preview/physician-workflow/page.tsx | M | D. DO NOT KEEP | Unrelated physician workflow scope excluded from current pilot-readiness track. | revert | Carries non-approved scope into pilot prep baseline. | Revert may discard intentional work if it belongs to a separate initiative; confirm ownership before execute. |

## Explicitly flagged categories (do not auto-keep)
These categories remain explicitly excluded from automatic keep decisions:
- Broad ApprovedPatientWorkflow changes.
- Physician/Figma workflow files.
- Temporary scripts.
- tsc output files.
- Parser helper files.
- Debug logs.
- Unrelated backend/API files not part of Phase 31E/31G.
- Generated local artifacts.

Current detection in extracted B/C/D set:
- Detected and flagged now:
  - Physician workflow file: apps/web/app/preview/physician-workflow/page.tsx
  - tsc output files: apps/web/tsc-phase31d-stage1-utf8.txt, apps/web/tsc-phase31d-stage1.txt
  - Unrelated backend/runtime candidate requiring manual review: apps/web/src/lib/server/controlled-production-pilot-governance.ts
- Not currently present in extracted B/C/D list from Phase 32A:
  - ApprovedPatientWorkflow broad edits
  - parser helper files
  - debug logs
  - generated local artifacts beyond listed tsc outputs

## Proposed execution order (for later approval phase)
1. Manual user decision on all "ask user" files first.
2. Revert D-class excluded scope file only after user confirmation of ownership.
3. Remove C-class temporary tsc artifacts (or archive if user wants retention).
4. Quarantine selected B-class historical docs to _archive/pre-production-cleanup/.
5. Re-run git status and produce post-clean verification snapshot.

## Planning outcome
- This phase prepared cleanup actions only.
- No files were moved, removed, reverted, or edited during cleanup execution.

## Final recommendation
STOP - HIGH-RISK FILES MUST BE MANUALLY REVIEWED
