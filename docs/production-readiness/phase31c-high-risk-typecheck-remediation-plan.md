# Phase 31C High-Risk Typecheck Remediation Plan

Date: 2026-06-01
Scope: Planning only, no code changes in this phase.
Input baseline: 528 TypeScript errors across 77 files.
Source classification: docs/production-readiness/phase31b-typecheck-baseline-classification-report.md

## Guardrails

- No deployment.
- No migrations.
- No patient journey behavior changes.
- No OTP, signing, token, or session behavior changes.
- No Arabic guard disablement.
- Retained frontend scope (landing, request-demo, OTP branding, route wrappers) remains clean.

## 1) Bucket A (Build-critical)

### Exact build-critical errors (2)

1. src/lib/projection/unified-disclosure-projection.ts(15,8): error TS2307: Cannot find module ./unified-disclosure-types or its corresponding type declarations.
2. src/lib/projection/unified-disclosure-shadow-mode.ts(3,55): error TS2307: Cannot find module ./unified-disclosure-types or its corresponding type declarations.

Note on additional non-build errors in the same file set:
- unified-disclosure-projection.ts also shows TS7006 implicit-any diagnostics; these are not module-resolution blockers.

### Why these are build-critical

- Both errors are unresolved module imports in runtime projection code paths.
- Missing module/type contract can break compilation and can also hide shape mismatches in disclosure payload processing.

### Proposed minimal fix

- Restore missing projection contract module: src/lib/projection/unified-disclosure-types.ts
- Keep import paths unchanged if restored at expected relative location.
- Do not alter business behavior; restore type definitions only.

### Fix classification

- Requires restoring module (primary action).
- Does not require route replacement.
- Does not require stale import removal if the module is restored correctly.

Risk: High
Estimated effort: 0.5 day

## 2) Bucket B (Prisma enum/type mismatch)

Baseline bucket size (from Phase 31B): 76 errors across 32 files.
Fresh diagnostic pattern scan confirms concentration in enum-string assignments and Prisma input contract mismatches.

### Root-cause groups

1. Enum naming mismatch / string-literal enum usage
- Pattern: Type string is not assignable to enum-backed Prisma fields.
- Representative files:
  - src/lib/server/operations.ts
  - src/lib/server/public-signing-service.ts
  - src/platform/subscribers/subscriber-module-access-service.ts
  - app/api/tenants/route.ts
- Risk: High
- Action: update service-layer types/mappers to Prisma enums (no runtime flow changes).

2. Schema/client drift or outdated DTO shapes
- Pattern: WhereInput/CreateInput/UncheckedCreateInput/FieldUpdateOperationsInput incompatibility.
- Representative files:
  - src/lib/server/promissory-note-service.ts
  - src/lib/server/operations.ts
  - app/api/platform/users/route.ts
- Risk: High
- Action: regenerate Prisma client first, then reconcile DTO/service shapes.

3. Outdated service code or obsolete fields
- Pattern: legacy object fields no longer matching current Prisma contracts.
- Representative files:
  - src/lib/server/admin-bootstrap.ts
  - src/lib/server/tenant-flag-service.ts
- Risk: Medium to High (depends on endpoint exposure)
- Action: quarantine low-usage obsolete services or patch contracts if in active API surface.

4. Stale generated Prisma client (possible contributor)
- Signal: broad enum/type friction across many services.
- Risk: Medium
- Action: regenerate Prisma client as first step in B-sequence; re-baseline before further edits.

### Domain impact mapping

Informed Consents
- Affected examples:
  - src/lib/server/informed-consents-template-catalog.ts
- Recommendation: fix now (core module).

Electronic Promissory Notes
- Affected examples:
  - src/lib/server/promissory-note-service.ts
- Recommendation: fix now (pilot-relevant financial/legal workflow).

Tenant/subscriber isolation
- Affected examples:
  - app/api/tenants/route.ts
  - app/api/tenants/[tenantId]/members/route.ts
  - src/platform/subscribers/subscriber-module-access-service.ts
  - src/lib/server/tenant-flag-service.ts
- Recommendation: fix now (security and isolation boundary).

Public signing/evidence/audit
- Affected examples:
  - src/lib/server/public-signing-service.ts
  - app/api/cases/[caseId]/legal-package/secure-signing/route.ts
  - app/api/discharge/cases/[caseId]/secure-signing-link/route.ts
- Recommendation: fix now for active pilot paths.

Unrelated modules
- Affected examples across launch/status/bootstrap/admin scripts.
- Recommendation: defer with waiver only if outside pilot scope and not invoked in production path.

## 3) Bucket C (Server/API logic) - Production-critical paths only

### Critical path inventory (from current diagnostic extraction)

/api/modules/informed-consents
- 4 errors, 1 file
- app/api/modules/informed-consents/documents/[id]/signature-certificate/route.ts

/api/public-signing
- 0 direct C-errors in this run

/api/sign
- 0 direct C-errors in this run

Promissory note APIs/services
- 1 C-error, 1 file
- src/lib/server/promissory-note-service.ts

Tenant/subscriber isolation APIs/services
- 36 C-errors, 10 files
- app/api/platform/tenants/[tenantId]/admins/create/route.ts
- app/api/platform/users/create/route.ts
- app/api/tenant/users/create/route.ts
- app/api/tenants/[tenantId]/members/route.ts
- app/api/tenants/[tenantId]/roles/[roleId]/route.ts
- app/api/tenants/[tenantId]/roles/route.ts
- app/api/tenants/[tenantId]/subscription/route.ts
- app/api/tenants/route.ts
- src/lib/server/tenant-flag-service.ts
- src/platform/subscribers/subscriber-module-access-service.ts

audit/evidence services
- 30 C-errors, 4 files
- app/api/modules/informed-consents/documents/[id]/signature-certificate/route.ts
- src/lib/server/evidence-package-2-service.ts
- src/lib/server/legal-package-module-service.ts
- src/lib/server/public-signing-service.ts

### Separation from non-production/legacy C

- Non-production or unrelated C-set remains large and should be deferred after critical path stabilization.
- Prioritize only critical path files above in Phase 31C remediation execution.

Risk: High
Estimated effort: 2 to 4 days (paired with Bucket B fixes)

## 4) Bucket D (Test/script-only)

Do not fix now unless required by build.

### Exclusion strategy from production typecheck

- Introduce a production-oriented tsconfig profile (for example: tsconfig.prod-check.json) that excludes:
  - scripts/**
  - **/*.test.ts
  - **/*.spec.ts
  - smoke harness files
- Keep a separate CI lane for test/script typecheck quality, not tied to pilot production gate.

Risk: Low for runtime
Estimated effort: 0.5 day

## 5) Bucket E (Obsolete/archival development files)

Current set includes:
- .next/dev/types/validator.ts
- .next/types/app/preview/patient-education/[templateCode]/page.ts
- app/internal/enterprise-consent/page.tsx
- src/components/approved-design/patient/ApprovedPatientWorkflow.tsx

### Quarantine/archive plan (no deletion in this phase)

- Move legacy/internal-only files to a quarantine namespace (for example: src/_legacy-quarantine or app/_internal-archive) in a later execution phase.
- Exclude .next generated typings from production typecheck profile.
- Mark archival candidates with owner and removal criteria.

Risk: Medium (noise + accidental coupling)
Estimated effort: 0.5 to 1 day

## Minimal Safe Remediation Sequence (A -> B -> C)

1. A1: Restore src/lib/projection/unified-disclosure-types.ts only.
2. A2: Re-run npx tsc --noEmit and confirm TS2307 removal in both projection files.
3. B1: Regenerate Prisma client.
4. B2: Re-run typecheck and re-baseline Bucket B.
5. B3: Patch enum-string assignments and Prisma DTO/input contract mismatches in pilot-critical services first:
   - tenant/subscriber isolation
   - public signing/evidence/audit
   - informed consents
   - promissory notes
6. C1: Address remaining non-Prisma logic typing in the same critical-path files only.
7. C2: Re-run build + typecheck; verify retained frontend scope remains zero-error.
8. D/E: Apply exclusion/quarantine profile updates in a controlled follow-up PR.

## Dependency on Tenant Isolation

- Strong dependency: tenant/subscriber isolation paths currently carry a high error concentration.
- Pilot go/no-go depends on stabilizing these files because they govern access boundaries and provisioning semantics.
- Tenant isolation fixes should be executed before expanding pilot traffic.

## Effort and Risk Summary

| Area | Risk | Effort | Notes |
|---|---|---|---|
| A Build-critical | High | 0.5 day | Fast unblock; restore missing module contract |
| B Prisma mismatch | High | 1.5 to 3 days | Regenerate + targeted enum/shape reconciliation |
| C Production-critical server/API | High | 2 to 4 days | Focus only on defined pilot-critical routes/services |
| D Test/script-only | Low | 0.5 day | Exclusion strategy, separate CI lane |
| E Obsolete/archival | Medium | 0.5 to 1 day | Quarantine plan without deletion |

## Pilot Feasibility After A+B+C Remediation

- Controlled production pilot can proceed after A+B+C high-risk remediation and validation reruns.
- Build-only waiver without A+B+C remediation is not recommended for this pilot scope.

## Final Recommendation

REMEDIATE A+B+C BEFORE PILOT
