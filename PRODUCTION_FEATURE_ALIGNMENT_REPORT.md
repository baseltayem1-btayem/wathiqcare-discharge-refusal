# PRODUCTION FEATURE ALIGNMENT REPORT

**Date:** 2026-05-22  
**Repository:** `baseltayem1-btayem/wathiqcare-discharge-refusal`

## 1. Verification Result

Direct runtime verification of `https://wathiqcare.online` was attempted three ways:

- `curl` → `Could not resolve host: wathiqcare.online`
- browser navigation → `ERR_BLOCKED_BY_CLIENT`
- `web_fetch` → `fetch failed`

This environment could not directly read `https://wathiqcare.online/api/health/runtime`, even though the repository exposes `gitCommitSha` there via `apps/web/app/api/health/runtime/route.ts`.

## 2. SHA Audit

### Production SHA

- **Runtime-verified production SHA:** **NOT DIRECTLY RETRIEVABLE FROM THIS ENVIRONMENT**
- **Best repository-backed production-equivalent SHA:** `82f6e23a7f51673747dcaf9dc1f85c08ad83291b`

Why `82f6e23` is the strongest available production-equivalent SHA:

- The commit message explicitly states the committed files were **already live in production via CLI-uploaded deploys** and were being committed so git-based deploys would match `wathiqcare.online`.

### Latest SHA

- **Latest integrated main SHA:** `12674d0e178ec09cebc22ce4600b4dc11f2aa0be`
- **Current working branch SHA:** `4ebbe8c6291e93c55eb3265253257e972267f5f1`

### Latest pilot baseline note

- The last explicitly pilot-labelled baseline found in repository docs is **`43dff9d` + fixes** (`PILOT_LAUNCH_BRIEF.md`).
- For active git comparison, this report uses **`origin/main` @ `12674d0`** as the latest integrated pilot candidate.

## 3. Phase Commit Mapping

Only **Phase 12** is explicitly labelled in git history. Phases **13–17** are **not explicitly phase-tagged** in commit messages or repository docs that were discoverable in this audit, so only feature-bearing SHAs can be named for them.

| Requested phase | Verifiable SHA | Status |
| --- | --- | --- |
| Phase 12.1 | `b311fbc` | Explicitly labelled in commit message |
| Phase 12.2 | `c82c162` | Explicitly labelled in commit message |
| Phase 13 | `0416dba` | Closest feature-bearing SHA for issuance UI updates; no explicit phase label found |
| Phase 14 | `82f6e23` | Closest feature-bearing SHA for signature/PDF/clinical-AI/evidence code; no explicit phase label found |
| Phase 15 | `6341327` | Closest feature-bearing SHA for OTP/signing-link preview workflow; no explicit phase label found |
| Phase 16 | **Not verifiable from git metadata** | No explicit phase-labelled SHA found |
| Phase 17 | **Not verifiable from git metadata** | No explicit phase-labelled SHA found |

## 4. Production SHA vs Latest SHA

- **Production-equivalent SHA:** `82f6e23`
- **Latest integrated SHA:** `12674d0`
- **Relationship:** `82f6e23` is an ancestor of `12674d0`
- **Commits missing from production-equivalent baseline:** `7`

### Missing commits

1. `0a1b6cb` — build(vercel): align production build with turbopack to honor ignoreBuildErrors
2. `b311fbc` — feat(ui): phase 12.1 - enterprise dense shell + evidence panel architecture
3. `183bc2d` — style(ui): phase 12.1 polish - rtl stability, enterprise typography, evidence layout refinement
4. `c82c162` — feat(ui): phase 12.2 — integrate real informed consent workflow into enterprise shell
5. `70449fe` — fix(build): switch production build off Turbopack to stabilize Prisma runtime
6. `6341327` — feat(consent-preview): add test-mode defaults, fixed OTP 123456, simulated signing-link
7. `12674d0` — feat: add diagnose-uat-accounts.mjs — QA/UAT account investigation & repair tool

## 5. Legacy UI vs Expected Functionality

### What is still mounted on the main informed-consents route

The route `apps/web/app/modules/informed-consents/page.tsx` still mounts:

- `InformedConsentsModulePageNew`

That component still contains the legacy/live indicators:

- `TrakCare Sync`
- `Generate Draft`
- `UAT_MOCK`

### Expected functionality audit

| Expected functionality | Exists in repository code? | Mounted on `/modules/informed-consents`? | Audit result |
| --- | --- | --- | --- |
| Patient Education | Yes | No | Present in `MedicalExplanationForm.tsx` as `Patient Education Summary`, but not on the mounted landing route |
| Understanding Check | No exact feature found | No | Exact UI/feature name not found in audited code |
| FAQ | No exact feature found | No | Exact UI/feature name not found in audited code |
| Signature Journey | Partial | No | Signature workflow exists, but no exact feature surface with this label on the mounted route |
| OTP Verification | Yes | No | Present in enterprise preview/signature flow, not on mounted landing route |
| Evidence Package | Yes | No | Present in evidence/export code and preview flows, not on mounted landing route |
| Clinical Knowledge Center | No exact UI feature found | No | Backend clinical-AI pieces exist, but no audited UI feature with this exact name |

## 6. Does the new workflow exist in production code?

**Yes — but not as the primary informed-consents landing experience.**

Verified routes/components in current code:

- `/modules/informed-consents` → `InformedConsentsModulePageNew` (**legacy route wiring**)
- `/modules/informed-consents/create` → `InformedConsentIssuancePage` (**new issuance workflow exists here**)
- `/internal/enterprise-consent` → enterprise preview workflow (**preview-only**)

### Practical conclusion

The new workflow is **present in the codebase**, but the main informed-consents page is still wired to the older UI.  
That means a straight deployment of the current route wiring can still legitimately show:

- TrakCare Sync
- Generate Draft
- UAT_MOCK

## 7. Deployment Status

| Item | Status |
| --- | --- |
| Direct runtime SHA verification | Blocked from this environment |
| Best production-equivalent SHA evidence | `82f6e23` |
| Latest integrated git SHA | `12674d0` |
| New workflow present somewhere in code | Yes |
| New workflow mounted on primary informed-consents route | No |
| Feature alignment | **Not aligned** |

## 8. Exact Promote Action Required

**Promoting the latest existing SHA alone is not sufficient** to make the production informed-consents landing page match the expected Phase 12–17 workflow.

### Required action

1. **Change route wiring for** `apps/web/app/modules/informed-consents/page.tsx`
   - replace `InformedConsentsModulePageNew`
   - **or** redirect the landing route to `/modules/informed-consents/create`
2. Add any still-missing exact surfaces that were not found in code:
   - Understanding Check
   - FAQ
   - Clinical Knowledge Center
   - exact Signature Journey surface (if required as a named UI block)
3. Deploy the new SHA after the route rewrite is committed and validated.

### Important finding

If `12674d0` is promoted **as-is**, the primary informed-consents route is still wired to the old screen, so the production UI can continue to show the legacy TrakCare/Generate Draft/UAT_MOCK workflow.
