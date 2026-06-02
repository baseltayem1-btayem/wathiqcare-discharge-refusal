# Phase 32B-Review - Manual High-Risk Review Before Cleanup

Date: 2026-06-01
Repository: wathiqcare-discharge-refusal
Branch: phase24-evidence-package-final

Scope:
- Review-only extraction from Phase 32B cleanup planning.
- No cleanup actions executed.
- No deploy, migration, SMS, or runtime-behavior changes.

Source reviewed:
- docs/production-readiness/phase32b-workspace-cleanup-execution-plan.md

## 1) High-risk files requiring manual decision
| File path | Git status | Phase 32B classification | Why it is high-risk | Recommended action |
|---|---|---|---|---|
| apps/web/src/lib/projection/unified-disclosure-projection.ts | ?? | B. REVIEW REQUIRED | Runtime projection module may be referenced by active flows; removing without dependency confirmation may break typecheck/imports. Keeping without approval may carry non-approved runtime logic. | USER DECISION REQUIRED |
| apps/web/src/lib/projection/unified-disclosure-shadow-mode.ts | ?? | B. REVIEW REQUIRED | Shadow-mode projection module may affect runtime/observability behavior if referenced; dependency and intent must be confirmed. | USER DECISION REQUIRED |
| apps/web/src/lib/projection/unified-disclosure-types.ts | ?? | B. REVIEW REQUIRED | Shared type contract may be required to satisfy projection imports; removal risk is compile breakage. | USER DECISION REQUIRED |
| apps/web/src/lib/public-signing/decision-status.ts | ?? | B. REVIEW REQUIRED | Public-signing helper could alter interpretation pathways if wired; not explicitly approved in keep baseline. | USER DECISION REQUIRED |
| apps/web/src/lib/server/controlled-production-pilot-governance.ts | ?? | B. REVIEW REQUIRED | Runtime governance file is security/release sensitive and outside explicitly approved remediation scope. | USER DECISION REQUIRED |
| apps/web/app/preview/physician-workflow/page.tsx | M | D. DO NOT KEEP | Explicitly outside current pilot-readiness scope; keeping risks scope contamination. Reverting may discard intentional parallel work unless ownership is confirmed. | USER DECISION REQUIRED |
| docs/production-readiness/phase31b-typecheck-baseline-classification-report.md | ?? | B. REVIEW REQUIRED | Historical report may be useful for audit trail but is not mandatory for current baseline gate. | QUARANTINE |
| docs/production-readiness/phase31c-high-risk-typecheck-remediation-plan.md | ?? | B. REVIEW REQUIRED | Historical planning artifact; potentially useful context but not required in active release baseline set. | QUARANTINE |
| docs/production-readiness/phase31d-high-risk-typecheck-remediation-execution-report.md | ?? | B. REVIEW REQUIRED | Historical execution artifact pre-final approved set; may create conflicting decision context if left active. | QUARANTINE |

## 2) Protected files that must not be touched
Confirmed protected and excluded from cleanup actions:

Mandatory reports:
- docs/production-readiness/phase31e-final-production-critical-typecheck-remediation-report.md
- docs/production-readiness/phase31f-controlled-pilot-baseline-waiver-and-go-no-go.md
- docs/production-readiness/phase31g-remaining-protected-path-remediation-report.md
- docs/production-readiness/phase31h-final-controlled-pilot-baseline-waiver-approval.md
- docs/production-readiness/phase32-tenant-subscriber-isolation-verification-report.md
- docs/production-readiness/phase32a-workspace-reconciliation-before-single-tenant-pilot.md
- docs/production-readiness/phase32b-workspace-cleanup-execution-plan.md

Phase 31E and 31G remediated source files:
- apps/web/src/lib/server/evidence-package-2-service.ts
- apps/web/src/lib/server/informed-consents-template-catalog.ts
- apps/web/src/lib/server/legal-package-module-service.ts
- apps/web/src/lib/server/promissory-note-service.ts
- apps/web/src/lib/server/public-signing-service.ts
- apps/web/src/lib/server/tenant-flag-service.ts
- apps/web/src/platform/subscribers/subscriber-module-access-service.ts

Retained landing/request-demo/OTP branding files:
- apps/web/app/page.tsx
- apps/web/app/[lang]/page.tsx
- apps/web/app/request-demo/page.tsx
- apps/web/app/[lang]/request-demo/page.tsx
- apps/web/src/components/landing/WathiqcareWhiteLanding.tsx
- apps/web/src/components/request-demo/WathiqcareRequestDemoPage.tsx
- apps/web/src/components/public-signing/OtpVerificationBranding.tsx
- apps/web/src/lib/branding/otp-page-branding.ts

Route wrappers required for landing/request-demo:
- apps/web/app/page.tsx
- apps/web/app/[lang]/page.tsx
- apps/web/app/request-demo/page.tsx
- apps/web/app/[lang]/request-demo/page.tsx

## 3) Files safe to remove or quarantine
Clearly safe candidates identified from current Phase 32B set:

Remove untracked:
- apps/web/tsc-phase31d-stage1-utf8.txt
- apps/web/tsc-phase31d-stage1.txt

Quarantine:
- docs/production-readiness/phase31b-typecheck-baseline-classification-report.md
- docs/production-readiness/phase31c-high-risk-typecheck-remediation-plan.md
- docs/production-readiness/phase31d-high-risk-typecheck-remediation-execution-report.md

No additional parser helper files, logs, generated local artifacts, temporary scripts, or screenshots were identified in the current extracted Phase 32B high-risk set.

## 4) Files that must be kept for current release baseline
Protected-path TypeScript remediation baseline:
- apps/web/src/lib/server/evidence-package-2-service.ts
- apps/web/src/lib/server/informed-consents-template-catalog.ts
- apps/web/src/lib/server/legal-package-module-service.ts
- apps/web/src/lib/server/promissory-note-service.ts
- apps/web/src/lib/server/public-signing-service.ts
- apps/web/src/lib/server/tenant-flag-service.ts
- apps/web/src/platform/subscribers/subscriber-module-access-service.ts

Tenant/subscriber isolation verification baseline:
- docs/production-readiness/phase32-tenant-subscriber-isolation-verification-report.md

Single-tenant pilot documentation baseline:
- docs/production-readiness/phase31h-final-controlled-pilot-baseline-waiver-approval.md
- docs/production-readiness/phase32a-workspace-reconciliation-before-single-tenant-pilot.md
- docs/production-readiness/phase32b-workspace-cleanup-execution-plan.md

Production-readiness evidence baseline:
- docs/production-readiness/phase31e-final-production-critical-typecheck-remediation-report.md
- docs/production-readiness/phase31f-controlled-pilot-baseline-waiver-and-go-no-go.md
- docs/production-readiness/phase31g-remaining-protected-path-remediation-report.md

Retained landing/request-demo/OTP baseline:
- apps/web/app/page.tsx
- apps/web/app/[lang]/page.tsx
- apps/web/app/request-demo/page.tsx
- apps/web/app/[lang]/request-demo/page.tsx
- apps/web/src/components/landing/WathiqcareWhiteLanding.tsx
- apps/web/src/components/request-demo/WathiqcareRequestDemoPage.tsx
- apps/web/src/components/public-signing/OtpVerificationBranding.tsx
- apps/web/src/lib/branding/otp-page-branding.ts

## 5) Final cleanup recommendation
USER DECISION REQUIRED

Reason:
- Multiple runtime-source B-class files and one D-class modified physician workflow file require explicit manual decision before controlled cleanup execution.
- Cleanup can proceed in a controlled manner only after user decisions are provided for all USER DECISION REQUIRED items.
