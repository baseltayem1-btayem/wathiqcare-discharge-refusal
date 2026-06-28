# RC1 Gate 1 — 07 Technical Debt

**Scope:** Duplicate code, legacy modules, temporary files, unresolved TODO/FIXME comments, multiple frontends/backends, and architectural drift.  
**Files reviewed:** `apps/web/src/`, `backend/`, `apps/api/backend/`, `frontend/`, `frontend-angular/`, `apps/web/scripts/`  
**Review date:** 2026-06-26

---

## Executive Summary

Technical debt is high. There are two nearly identical Python backends, multiple unused frontend applications, duplicate JWT modules, committed temporary and legacy files, and unresolved TODO/FIXME comments in production paths. This debt increases maintenance burden, build size, and the risk of deploying the wrong component.

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High     | 3 |
| Medium   | 5 |
| Low      | 2 |

---

## Findings

### TD-CRIT-01 — Two divergent Python backends
- **Priority:** Critical
- **Description:** `apps/api/backend/` and `backend/` both contain nearly identical FastAPI/SQLAlchemy code. The root `backend/` has no CORS hardening, no security middleware, no rate limiting, and weaker JWT handling. `apps/api/backend/` includes `core/http_hardening.py` and stronger defaults.
- **Risk:** Deploying the wrong directory disables all API hardening and could reintroduce default JWT secrets.
- **Recommendation:** Delete or archive the root `backend/`; make `apps/api/backend/main.py` the single source of truth. Update CI and deployment scripts to reference only `apps/api`.
- **Estimated effort:** 1–2 days

### TD-HIGH-01 — Duplicate JWT implementations / inconsistent secret env vars
- **Priority:** High
- **Description:** Two JWT signer/verifier modules exist:
  - `apps/web/src/lib/server/auth-token.ts`
  - `apps/web/src/lib/server/jwt.ts`
  Step-up tokens in `apps/web/src/lib/server/security-policy-service.ts` lines 29–32 fall back to `JWT_SECRET` or a hardcoded dev secret, not `JWT_SECRET_KEY`.
- **Risk:** Secret mismatch and maintenance burden; weaker signing key possible.
- **Recommendation:** Consolidate JWT logic in one module and standardize on `JWT_SECRET_KEY`.
- **Estimated effort:** 0.5–1 day

### TD-HIGH-02 — Multiple unused frontend applications
- **Priority:** High
- **Description:** `frontend/` and `frontend-angular/` are not in the root `workspaces` array. Root scripts only build `apps/web`.
- **Risk:** Stale code, confused developers, accidental deployment of the wrong frontend.
- **Recommendation:** Move to an archive branch or delete; keep only `apps/web`.
- **Estimated effort:** 1 day

### TD-HIGH-03 — Hardcoded default passwords in release-gate script
- **Priority:** High
- **Description:** `apps/web/scripts/prod-release-gate.cjs` lines 15–16 set:
  - `DEFAULT_PASSWORD = process.env.RELEASE_GATE_PASSWORD || "Admin@Wathiqcare2026!"`
  - `RESET_PASSWORD = process.env.RELEASE_GATE_RESET_PASSWORD || "Reset@Wathiqcare2026!"`
- **Risk:** Backdoor credentials if the script is run without env vars.
- **Recommendation:** Remove defaults; fail immediately if env vars are unset.
- **Estimated effort:** 15 minutes

### TD-MED-01 — Legacy and temporary files committed in `apps/web`
- **Priority:** Medium
- **Description:** Temporary and legacy source files are part of the build and contribute lint/type errors:
  - `apps/web/src/lib/server/__tmp_test.ts`
  - `apps/web/src/lib/server/__tmp_test2.ts`
  - `apps/web/src/lib/server/__tmp_full.ts`
  - `apps/web/src/components/informed-consents/_legacy-rejected/`
- **Risk:** Dead code shipped to production; increased bundle size and confusion.
- **Recommendation:** Remove `__tmp*` files and archive `_legacy-rejected/` outside the repo.
- **Estimated effort:** 0.5 day

### TD-MED-02 — Unresolved TODO/FIXME comments in production paths
- **Priority:** Medium
- **Description:** Representative unresolved markers:
  - `apps/web/src/lib/environment/audit-logging.ts` line 58: “TODO: Implement actual audit logging to database / SIEM”
  - `apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx` lines 1623, 1678
  - `apps/web/src/components/modules/informed-consent-issuance/InformedConsentIssuancePage.tsx` lines 287, 338, 339, 454
  - `apps/web/src/lib/services/refusalForms.service.ts` line 73
- **Risk:** Incomplete production features.
- **Recommendation:** Triage and resolve or move to backlog before RC1.
- **Estimated effort:** Varies (1–3 days)

### TD-MED-03 — Temporary operational scripts directly mutate state
- **Priority:** Medium
- **Description:** `scripts/set-cme-flag.mjs`, `scripts/temp-list-flags.mjs`, `scripts/temp-update-role.mjs`, `apps/web/scripts/content-mapping-api-examples.mjs`, `apps/web/scripts/sprint3-api-proof.ts`, `apps/web/scripts/sprint3-screenshot-proof.mjs` are temporary/demo scripts.
- **Risk:** If accidentally committed or run in production, they can alter tenant state or generate fake evidence.
- **Recommendation:** Delete temp scripts or move them to a protected `ops/` repo with explicit safeguards.
- **Estimated effort:** 0.5 day

### TD-MED-04 — `NEXTAUTH_SECRET` required but unused
- **Priority:** Medium
- **Description:** `apps/web/src/lib/config/env-validation.ts` line 13 and `apps/web/src/lib/server/runtime-health.ts` line 11 list `NEXTAUTH_SECRET` as required, but auth uses `JWT_SECRET_KEY`.
- **Risk:** Operational confusion / false-positive “missing secret” alerts.
- **Recommendation:** Remove from required list or migrate auth to NextAuth.
- **Estimated effort:** 15 minutes

### TD-MED-05 — Committed release-gate artifacts contain runtime data
- **Priority:** Medium
- **Description:** `apps/web/artifacts/release-gate/final-prod-release-gate.json` contains JWTs, emails, roles, tenant IDs, and user IDs.
- **Risk:** Sensitive user data and tokens committed.
- **Recommendation:** Remove from history and `.gitignore` the `artifacts/release-gate/` directory.
- **Estimated effort:** 1 day

### TD-LOW-01 — Duplicate and conflicting env-example header blocks
- **Priority:** Low
- **Description:** `.env.example` has two concatenated blocks with overlapping keys, documented in Configuration findings.
- **Risk:** Onboarding confusion.
- **Recommendation:** Deduplicate and generate from a central config schema.
- **Estimated effort:** 0.5 day

### TD-LOW-02 — Legacy README describes a different project structure
- **Priority:** Low
- **Description:** `README.md` describes `backend/`, `config/rules.yaml`, `tests/test_workflow.py` rather than the actual monorepo.
- **Risk:** Onboarding confusion.
- **Recommendation:** Rewrite README to match current structure.
- **Estimated effort:** 1 day

---

## Positive Observations

1. The codebase separates concerns clearly between apps, packages, and backend services.
2. Newer modules (Clinical Knowledge Engine, Content Mapping) follow cleaner patterns than legacy code.
3. A release-gate script exists to validate readiness before deploy.

---

## Gate 1 Exit Criteria for Technical Debt

1. Delete or archive the root `backend/` directory and unify on `apps/api/backend/`.
2. Remove all temporary and legacy source files from `apps/web/src`.
3. Consolidate JWT logic into a single module using `JWT_SECRET_KEY`.
4. Remove or archive unused `frontend/` and `frontend-angular/` applications.
5. Resolve or backlog all TODO/FIXME comments in production paths.
6. Remove hardcoded default passwords from release-gate scripts.

Technical debt does not currently satisfy RC1 Gate 1.
