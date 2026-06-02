# Phase 32E - Focused Build Blocker Remediation Report

Date: 2026-06-01
Repository: wathiqcare-discharge-refusal
Branch: phase24-evidence-package-final

## Objective
Fix only the specific build blocker caused by the preview physician workflow page, without restoring broad preview/Figma files or changing protected runtime behavior.

## Exact build blocker
From prior Phase 32D failing build:
- Source page: `apps/web/app/preview/physician-workflow/page.tsx`
- Missing import path:
  - `@/components/preview/physician-workflow/PhysicianWorkflowPreview`
- Failure shape:
  - `Module not found: Can't resolve '@/components/preview/physician-workflow/PhysicianWorkflowPreview'`

## File changed
- `apps/web/app/preview/physician-workflow/page.tsx`

## Fix applied (smallest safe fix)
Applied preferred safe pattern A (redirect):
- Removed the missing component import.
- Kept existing auth/module access gate behavior.
- Replaced page render with redirect to `/modules/informed-consents` for authorized users.
- Unauthorized users still redirect to `/dashboard`.

No broad preview component restoration was performed.

## Validation commands run
1. `npx next build --webpack`
2. `npx tsc --noEmit`
3. `git status --porcelain --untracked-files=all`

## Build result
Command: `npx next build --webpack` (run in `apps/web`)

Result: PASSED
- `has_build_failed=False`
- `has_compiled_successfully=True`

Evidence log:
- `docs/production-readiness/phase32e-next-build-output.txt`

## Typecheck result
Command: `npx tsc --noEmit` (run in `apps/web`)

Result: FAILED (global baseline remains non-zero)
- Remaining global baseline count: **467** (`error TS` lines)

Evidence log:
- `docs/production-readiness/phase32e-tsc-noemit-output.txt`

## Protected-path typecheck slice
Rule used:
- Real protected-path TypeScript error = exact file path match to one of the protected files below.
- Keyword-only match = text match in the error line, but not an exact protected file path.

### Informed Consents
- Real protected-path errors: 0
- Exact-file hits checked:
  - `src/lib/server/informed-consents-template-catalog.ts`: 0
- Keyword-only matches: 7
  - `.next/dev/types/validator.ts(2582,39): error TS2307: Cannot find module '../../../app/api/internal/informed-consents/documents/[id]/preview-render/route.js' or its corresponding type declarations.`
  - `.next/dev/types/validator.ts(2762,39): error TS2307: Cannot find module '../../../app/api/modules/informed-consents/documents/[id]/signing-session/route.js' or its corresponding type declarations.`
  - `app/api/modules/informed-consents/documents/[id]/signature-certificate/route.ts(49,13): error TS2353: Object literal may only specify known properties, and 'signatureHash' does not exist in type 'ConsentDocumentSignatureSelect<DefaultArgs>'.`

### Evidence package
- Real protected-path errors: 0
- Exact-file hits checked:
  - `src/lib/server/evidence-package-2-service.ts`: 0
- Keyword-only matches: 5
  - `scripts/phase6c-controlled-educational-assets.ts(765,52): error TS2339: Property 'educationEvidencePackage' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.`
  - `scripts/phase6c-controlled-educational-assets.ts(789,64): error TS7006: Parameter 'evidencePackage' implicitly has an 'any' type.`
  - `src/lib/server/education-library-service.ts(717,31): error TS2339: Property 'educationEvidencePackage' does not exist on type 'Omit<PrismaClient<PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">'.`

### public signing
- Real protected-path errors: 0
- Exact-file hits checked:
  - `src/lib/server/public-signing-service.ts`: 0
- Keyword-only matches: 6
  - `src/components/modules/PublicSigningWorkflow.tsx(846,35): error TS2322: Type 'HTMLElement | null' is not assignable to type 'HTMLDivElement | null | undefined'.`
  - `src/components/modules/PublicSigningWorkflow.tsx(859,33): error TS2322: Type 'HTMLElement | null' is not assignable to type 'HTMLDivElement | null | undefined'.`
  - `src/components/modules/PublicSigningWorkflow.tsx(870,33): error TS2322: Type 'HTMLElement | null' is not assignable to type 'HTMLDivElement | null | undefined'.`

### promissory note service
- Real protected-path errors: 0
- Exact-file hits checked:
  - `src/lib/server/promissory-note-service.ts`: 0
- Keyword-only matches: 4
  - `app/api/cases/[caseId]/legal-package/secure-signing/route.ts(108,56): error TS2345: Argument of type '{ tenantId: string; initiatedBy: string; moduleKey: "legal_evidence"; moduleType: "promissory_note"; documentId: string; caseId: string; patientName: string; mobileNumber: string; locale: "ar"; }' is not assignable to parameter of type '{ tenantId: string; initiatedBy: string; moduleKey: "legal_evidence" | "discharge_refusal" | "informed_consent"; moduleType: "discharge_refusal" | "informed_consent" | "promissory_note"; ... 5 more ...; locale?: "ar" | ... 1 more ... | undefined; }'.`
  - `app/api/discharge/cases/[caseId]/secure-signing-link/route.ts(108,56): error TS2345: Argument of type '{ tenantId: string; initiatedBy: string; moduleKey: "discharge_refusal"; moduleType: "discharge_refusal"; documentId: string; caseId: string; patientName: string; mobileNumber: string; locale: "ar"; }' is not assignable to parameter of type '{ tenantId: string; initiatedBy: string; moduleKey: "legal_evidence" | "discharge_refusal" | "informed_consent"; moduleType: "discharge_refusal" | "informed_consent" | "promissory_note"; ... 5 more ...; locale?: "ar" | ... 1 more ... | undefined; }'.`

### tenant/subscriber services
- Real protected-path errors: 0
- Exact-file hits checked:
  - `src/lib/server/tenant-flag-service.ts`: 0
  - `src/platform/subscribers/subscriber-module-access-service.ts`: 0
- Keyword-only matches: 58
  - `app/api/cases/[caseId]/legal-package/secure-signing/route.ts(108,56): error TS2345: Argument of type '{ tenantId: string; initiatedBy: string; moduleKey: "legal_evidence"; moduleType: "promissory_note"; documentId: string; caseId: string; patientName: string; mobileNumber: string; locale: "ar"; }' is not assignable to parameter of type '{ tenantId: string; initiatedBy: string; moduleKey: "legal_evidence" | "discharge_refusal" | "informed_consent"; moduleType: "discharge_refusal" | "informed_consent" | "promissory_note"; ... 5 more ...; locale?: "ar" | ... 1 more ... | undefined; }'.`
  - `app/api/cases/route.ts(52,7): error TS2322: Type '{ status?: string | undefined; tenantId: string; }' is not assignable to type 'CaseWhereInput'.`
  - `app/api/discharge/cases/[caseId]/secure-signing-link/route.ts(108,56): error TS2345: Argument of type '{ tenantId: string; initiatedBy: string; moduleKey: "discharge_refusal"; moduleType: "discharge_refusal"; documentId: string; caseId: string; patientName: string; mobileNumber: string; locale: "ar"; }' is not assignable to parameter of type '{ tenantId: string; initiatedBy: string; moduleKey: "legal_evidence" | "discharge_refusal" | "informed_consent"; moduleType: "discharge_refusal" | "informed_consent" | "promissory_note"; ... 5 more ...; locale?: "ar" | ... 1 more ... | undefined; }'.`

### landing/request-demo/OTP retained scope
- Real protected-path errors: 0
- Exact-file hits checked:
  - `app/page.tsx`: 0
  - `app/[lang]/page.tsx`: 0
  - `app/request-demo/page.tsx`: 0
  - `app/[lang]/request-demo/page.tsx`: 0
  - `src/components/landing/WathiqcareWhiteLanding.tsx`: 0
  - `src/components/request-demo/WathiqcareRequestDemoPage.tsx`: 0
  - `src/components/public-signing/OtpVerificationBranding.tsx`: 0
  - `src/lib/branding/otp-page-branding.ts`: 0
- Keyword-only matches: 6
  - `src/components/legal/LegalComplianceDashboard.tsx(227,44): error TS2322: Type '{ readonly platformName: "WathiqCareΓäó"; readonly platformSub: "Legal Compliance Review"; readonly tabs: { readonly evidence: "Evidence Package"; readonly audit: "Audit Chain"; readonly otp: "OTP Event Log"; readonly pdf: "PDF Status"; }; ... 5 more ...; readonly langToggle: "AR"; } | { ...; }' is not assignable to type '{ readonly platformName: "WathiqCareΓäó"; readonly platformSub: "Legal Compliance Review"; readonly tabs: { readonly evidence: "Evidence Package"; readonly audit: "Audit Chain"; readonly otp: "OTP Event Log"; readonly pdf: "PDF Status"; }; ... 5 more ...; readonly langToggle: "AR"; }'.`
  - `src/components/legal/LegalComplianceDashboard.tsx(229,38): error TS2322: Type '{ readonly platformName: "WathiqCareΓäó"; readonly platformSub: "Legal Compliance Review"; readonly tabs: { readonly evidence: "Evidence Package"; readonly audit: "Audit Chain"; readonly otp: "OTP Event Log"; readonly pdf: "PDF Status"; }; ... 5 more ...; readonly langToggle: "AR"; } | { ...; }' is not assignable to type '{ readonly platformName: "WathiqCareΓäó"; readonly platformSub: "Legal Compliance Review"; readonly tabs: { readonly evidence: "Evidence Package"; readonly audit: "Audit Chain"; readonly otp: "OTP Event Log"; readonly pdf: "PDF Status"; }; ... 5 more ...; readonly langToggle: "AR"; }'.`
  - `src/components/legal/LegalComplianceDashboard.tsx(231,34): error TS2322: Type '{ readonly platformName: "WathiqCareΓäó"; readonly platformSub: "Legal Compliance Review"; readonly tabs: { readonly evidence: "Evidence Package"; readonly audit: "Audit Chain"; readonly otp: "OTP Event Log"; readonly pdf: "PDF Status"; }; ... 5 more ...; readonly langToggle: "AR"; } | { ...; }' is not assignable to type '{ readonly platformName: "WathiqCareΓäó"; readonly platformSub: "Legal Compliance Review"; readonly tabs: { readonly evidence: "Evidence Package"; readonly audit: "Audit Chain"; readonly otp: "OTP Event Log"; readonly pdf: "PDF Status"; }; ... 5 more ...; readonly langToggle: "AR"; }'.`

### Unrelated global baseline errors
- Count: 389
- These are the remaining TypeScript error lines not attributable to the protected groups above.

## Git status snapshot
Evidence snapshot:
- `docs/production-readiness/phase32e-final-git-status.txt`

## Final recommendation
READY FOR SINGLE-TENANT PILOT PREPARATION WITH BASELINE WAIVER

Reason (decision rule application):
- Build validation: PASSED.
- Real protected-path TypeScript errors: 0.
- Remaining TypeScript failures are unrelated global baseline errors (389 after removing keyword-only domain matches from the total 467 error lines).
