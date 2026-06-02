# Phase 31B Typecheck Baseline Classification Report

Date: 2026-06-01
Scope: Classification only (no code changes)
Command run: `npx tsc --noEmit --pretty false`
Result: 528 errors in 77 files

## Executive Summary

- Build status (from prior Phase 31B): Passing.
- Retained-scope frontend (landing/request-demo/OTP branding + route wrappers): 0 type errors.
- Baseline typecheck remains large and concentrated in server/API and test/script areas.
- Immediate production-risk buckets are primarily runtime-facing server/API type mismatches (especially Prisma-related enum/input mismatches).

## Bucket Classification (A-F)

| Bucket | Errors | Files | Risk | Representative files | Recommended action |
|---|---:|---:|---|---|---|
| A. Build-critical errors | 2 | 2 | High | src/lib/projection/unified-disclosure-projection.ts, src/lib/projection/unified-disclosure-shadow-mode.ts | Fix now |
| B. Prisma enum/type mismatch errors | 76 | 32 | High | src/lib/server/operations.ts, src/lib/server/public-signing-service.ts, src/platform/subscribers/subscriber-module-access-service.ts, app/api/tenants/route.ts, app/api/auth/microsoft/route.ts | Regenerate Prisma client, then fix now for remaining schema/client divergence |
| C. Server/API logic type errors | 219 | 49 | High | src/lib/server/education-library-service.ts, src/lib/server/consent-library-service.ts, app/api/internal/dynamic-consent/signed-pdf/route.ts, app/api/modules/informed-consents/documents/[id]/signature-certificate/route.ts, src/modules/consent-engine/validation/signature-layout-validator.ts | Fix high-risk files now; defer lower-risk items with documented baseline waiver |
| D. Test/script-only errors | 216 | 11 | Low (for production runtime) | src/lib/environment/environment.test.ts, scripts/phase6a-general-anesthesia-package.ts, scripts/phase6c-controlled-educational-assets.ts, smoke-modules.spec.ts, src/lib/server/pilot-email-override.test.ts | Exclude from production typecheck and/or defer with documented baseline waiver |
| E. Obsolete/archival development files | 15 | 4 | Medium | .next/dev/types/validator.ts, .next/types/app/preview/patient-education/[templateCode]/page.ts, app/internal/enterprise-consent/page.tsx, src/components/approved-design/patient/ApprovedPatientWorkflow.tsx | Quarantine/archive or exclude from production typecheck |
| F. Retained-scope frontend errors | 0 | 0 | Low | None | No action required; keep as protected clean scope |

Total check: 2 + 76 + 219 + 216 + 15 + 0 = 528 errors.

## Top 10 Files By Error Count

| Rank | File | Errors | Bucket |
|---:|---|---:|---|
| 1 | src/lib/environment/environment.test.ts | 146 | D |
| 2 | src/lib/server/education-library-service.ts | 35 | C |
| 3 | src/lib/server/consent-library-service.ts | 24 | C |
| 4 | scripts/phase6a-general-anesthesia-package.ts | 22 | D |
| 5 | scripts/phase6c-controlled-educational-assets.ts | 21 | D |
| 6 | src/lib/server/operations.ts | 18 | C |
| 7 | src/lib/server/public-signing-service.ts | 15 | B |
| 8 | src/lib/server/informed-consents-template-catalog.ts | 12 | C |
| 9 | src/lib/server/admin-bootstrap.ts | 11 | C |
| 10 | app/api/tenants/route.ts | 11 | B |

## Pilot Readiness Under Build-Pass/Typecheck-Waiver Model

Assessment:

- A build-pass/typecheck-waiver model is technically possible for a narrowly scoped production pilot, but only with strict guardrails because buckets B and C contain many runtime-path server/API typing failures.
- If pilot scope touches affected API/service paths, waiver risk is elevated and not recommended.

Guardrails required if waiver is used:

- Freeze scope to validated routes only.
- Block rollout of endpoints represented in high-density B/C files until fixed.
- Add explicit documented waiver for D/E only (tests/scripts/obsolete files), not for critical B/C runtime paths.
- Keep A and F at zero/clean before pilot gate.

## Final Recommendation

**FIX HIGH-RISK TYPECHECK BUCKETS FIRST**

Rationale:

- Build is passing and retained-scope frontend is clean.
- However, the unresolved B/C runtime-facing type errors are too concentrated to treat as a broad safe waiver without additional targeted remediation.
- D/E can be handled via exclusion/quarantine and documented waivers; B/C should be prioritized for risk reduction before pilot expansion.
