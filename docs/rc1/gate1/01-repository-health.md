# RC1 Gate 1 — 01 Repository Health

**Scope:** Git hygiene, repository structure, CI/CD pipeline health, dependency posture, secrets presence, and documentation accuracy.  
**Branch reviewed:** `feature/clinical-knowledge-engine-mvp`  
**Review date:** 2026-06-26  
**Deliverable owner:** RC1 Production Hardening

---

## Executive Summary

The repository is in a dirty, unmerged state with a large number of untracked temporary and evidence files. Multiple secrets and sensitive configuration artifacts are committed or present in the working tree. CI/CD hardening stages are placeholders, test failures do not block the build, and known high-severity dependency CVEs are unpatched. Documentation does not reflect the actual monorepo structure.

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High     | 6 |
| Medium   | 5 |
| Low      | 2 |

---

## Findings

### RH-CRIT-01 — CI/CD hardening and deployment stages are placeholder stubs
- **Priority:** Critical
- **Description:** `.github/workflows/enterprise-cicd-pipeline.yml` implements “RBAC integrity”, “audit logging configuration”, and “tenant isolation” validation as `echo "✓ ... passed"` with no real checks. Staging and production deployment steps only print messages; no deploy action, container push, or infra update is performed. The `test` job uses `continue-on-error: true`, allowing test failures to proceed.
- **Risk:** False assurance of hardening; broken tests, unaudited dependencies, and unvalidated artifacts can reach production undetected.
- **Recommendation:** Replace echo steps with executable validation scripts (RBAC schema check, tenant-isolation query test, audit-log write test); fail the pipeline on test failure; add real deploy actions or remove them until implemented.
- **Estimated effort:** 3–5 days

### RH-CRIT-02 — High-severity dependency CVEs are unpatched
- **Priority:** Critical
- **Description:** `npm audit` reports 10 vulnerabilities: 4 high, 4 moderate, 2 low. High-severity direct dependencies include `next@16.2.4` (DoS, middleware bypass, cache poisoning, XSS) and `nodemailer@8.0.5` (CRLF/header injection, TLS validation bypass, SSRF). Fixes are available.
- **Risk:** Known exploitable vulnerabilities in production-facing packages.
- **Recommendation:** Run `npm audit fix`; upgrade `next` to a patched 16.x release and `nodemailer` to a non-vulnerable version; add `npm audit --audit-level=moderate` to CI with `continue-on-error: false`.
- **Estimated effort:** 1–2 days

### RH-HIGH-01 — Production configuration template is tracked in git
- **Priority:** High
- **Description:** `.env.production.template` is committed despite `.gitignore` including `.env.production*`. The file contains production Neon hostnames, real Microsoft Entra tenant/client IDs, S3 bucket names, and SMS provider configuration.
- **Risk:** Infrastructure reconnaissance and tenant/bucket enumeration; violates the project’s own rule that production config belongs only in a secrets manager.
- **Recommendation:** Remove the file from git history (BFG/filter-repo), rotate any exposed credentials/IDs, and store production values in Vercel/AWS Secrets Manager. Commit only a fully placeholder/sanitized template.
- **Estimated effort:** 1–2 days

### RH-HIGH-02 — Hardcoded admin credentials in tracked file
- **Priority:** High
- **Description:** `tmp-login-test.cjs` (tracked) contains `email: "admin@wathiqcare.online", password: "[REDACTED]"`.
- **Risk:** Real admin credentials exposed in version control; can be replayed if still valid.
- **Recommendation:** Delete the file from history, rotate the admin password, and read credentials from environment variables only.
- **Estimated effort:** 2–4 hours

### RH-HIGH-03 — Release-gate artifact contains JWTs and PII
- **Priority:** High
- **Description:** `apps/web/artifacts/release-gate/final-prod-release-gate.json` (tracked) contains full `wathiqcare_access_token` JWTs, user emails, roles, tenant IDs, and user IDs.
- **Risk:** Sensitive user data and tokens committed; tokens may be refreshable or reveal signing details.
- **Recommendation:** Remove from git history, rotate the JWT signing secret, and never commit runtime artifacts or tokens. Add `**/artifacts/release-gate/*.json` to `.gitignore`.
- **Estimated effort:** 1–2 days

### RH-HIGH-04 — No repository-level branch protection evidence
- **Priority:** High
- **Description:** No `.github/CODEOWNERS`, `.github/settings.yml`, or required-status-checks configuration exists in the repo. The only branch restriction is a runtime workflow check that blocks certain branch prefixes from production deploy.
- **Risk:** Direct pushes to `main`, unreviewed merges, and CI bypass are possible.
- **Recommendation:** Enable GitHub branch protection for `main`: require PR reviews, require status checks, dismiss stale reviews, restrict push access, and add `CODEOWNERS` for critical paths.
- **Estimated effort:** 2–4 hours

### RH-HIGH-05 — Working tree contains an active session token
- **Priority:** High
- **Description:** Untracked `cookies.txt` in the repo root contains a `wathiqcare_access_token` JWT cookie. `.gitignore` does not explicitly ignore `cookies.txt`.
- **Risk:** Active session token can be replayed if still valid; high chance of accidental commit.
- **Recommendation:** Delete the file, rotate the signing secret if the token could be valid, and add `cookies.txt` to `.gitignore`.
- **Estimated effort:** 1–2 hours

### RH-HIGH-06 — Python API workflow deploys without validation or approval gate
- **Priority:** High
- **Description:** `.github/workflows/main_wathiqcare-api.yml` deploys the Python API to Azure without pytest, lint (ruff/mypy), or security scanning. No `environment:` protection is defined on the deploy job, and the entire repo is uploaded as the deployment artifact.
- **Risk:** Unvalidated Python code deploys directly to production; artifact may include local env files.
- **Recommendation:** Add pytest, ruff/mypy, bandit, and a staging environment with required reviewers. Exclude `.env*` files from deployment artifact.
- **Estimated effort:** 2–3 days

### RH-MED-01 — Large dirty working tree with temporary/demo files
- **Priority:** Medium
- **Description:** 67 dirty files including `__tmp_*.ts`, `temp-*.mjs`, `scripts/sprint3-*`, `apps/web/scripts/content-mapping-api-examples.mjs`, screenshot/evidence directories, and uncommitted migrations.
- **Risk:** Dead code, accidental inclusion of local artifacts in builds, and potential credential leakage.
- **Recommendation:** Delete or `.gitignore` all temp/demo/artifact files; commit only RC1-ready changes; move one-off scripts to a protected tooling repo.
- **Estimated effort:** 1 day

### RH-MED-02 — Python dependencies are unpinned
- **Priority:** Medium
- **Description:** `requirements.txt` and `apps/api/requirements.txt` list packages without versions or hashes.
- **Risk:** Non-reproducible builds and supply-chain exposure.
- **Recommendation:** Pin versions and use `pip-compile`, `poetry.lock`, or `uv.lock` with hashes.
- **Estimated effort:** 1 day

### RH-MED-03 — Multiple applications outside the npm workspace
- **Priority:** Medium
- **Description:** `apps/api`, `apps/pdf-renderer`, `frontend/`, and `frontend-angular/` are not included in the root `workspaces` array. Their dependencies are not audited by root `npm audit`.
- **Risk:** Dependency drift and unaudited packages (e.g., `express@4.19.2` in `apps/pdf-renderer`).
- **Recommendation:** Consolidate workspace membership or create separate lockfiles and audit each app independently in CI.
- **Estimated effort:** 2–3 days

### RH-MED-04 — Dockerfile has conflicting `CMD` instructions
- **Priority:** Medium
- **Description:** `Dockerfile` contains two consecutive `CMD` instructions with different startup paths. Only the last executes.
- **Risk:** Container may start with the wrong working directory/command.
- **Recommendation:** Remove the second `CMD` and verify the startup path with a local container run.
- **Estimated effort:** 30 minutes

### RH-MED-05 — README is out of sync with the actual codebase
- **Priority:** Medium
- **Description:** `README.md` describes a small Python project (`backend/`, `config/rules.yaml`, `tests/test_workflow.py`) and omits the actual monorepo (`apps/web`, `apps/api`, `apps/pdf-renderer`, `packages/*`, `prisma/`, `frontend/`).
- **Risk:** Onboarding confusion and operational runbooks referencing non-existent paths.
- **Recommendation:** Rewrite README to match the current workspace layout, build commands, and deployment model.
- **Estimated effort:** 1 day

### RH-LOW-01 — `.env.example` contains real Microsoft tenant/client IDs
- **Priority:** Low
- **Description:** `.env.example` lines 80–81 include real GUIDs for `MICROSOFT_TENANT_ID` and `MICROSOFT_CLIENT_ID` rather than placeholders.
- **Risk:** Exposes Entra tenant and application registration metadata.
- **Recommendation:** Replace with `replace-with-...` placeholders; rotate the app registration if exposure is a concern.
- **Estimated effort:** 30 minutes

### RH-LOW-02 — Local `.env` / `.env.local` files exist in working tree
- **Priority:** Low
- **Description:** `.env`, `.env.local`, `apps/web/.env`, and `apps/web/.env.local` are present. They are gitignored but may contain real secrets.
- **Risk:** Accidental commit or leak during artifact upload.
- **Recommendation:** Verify they are never staged, use a secrets manager, and rotate any values that may have been exposed.
- **Estimated effort:** 1 hour

---

## Positive Observations

- The project uses a monorepo layout with clear separation between `apps/`, `packages/`, and `backend/`.
- A security-env audit script exists (`scripts/security-env-audit.mjs`) that scans for `NEXT_PUBLIC_*` secrets and artifact leaks.
- CI/CD includes dedicated language-isolation and Playwright workflows.

---

## Gate 1 Exit Criteria for Repository Health

1. Purge all secrets and production config from git history.
2. Patch high/moderate dependency CVEs and add audit gate to CI.
3. Replace placeholder CI hardening/deployment steps with real checks.
4. Enable GitHub branch protection, required reviews, and status checks.
5. Clean the working tree of temp/demo/artifact files.
6. Update README to reflect the actual monorepo.

Until these criteria are met, Repository Health does **not** satisfy RC1 Gate 1.
