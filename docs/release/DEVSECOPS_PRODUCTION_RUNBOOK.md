# DevSecOps Production Release Runbook — Internal IMC Pilot

**Release:** WathiqCare v1.0 — Internal IMC Pilot  
**Validated Preview URL:** `https://wathiqcare-discharge-refusal-mgchr0e2r-wathiqcare.vercel.app`  
**Source Commit:** `e2b2e7de7ff59199ff5c0e60c8d350cf4c4ee6cc`  
**Runbook Date:** 2026-06-29  
**Owner/Executor:** DevSecOps / Release Engineering  

---

## Executive Summary

This runbook provides the **safe, non-destructive plan** to resolve the two remaining P0 blockers before Internal IMC Pilot go-live:

1. **P0-006 / P0-007 — Credential exposure in git history**
2. **P0-008 — FastAPI backend hardening & verification**

No destructive actions are performed in this document. All commands are **preparatory** and marked with an execution owner. Approval is required before any history rewrite, secret rotation, or production promotion.

**Current status:** `READY FOR OWNER APPROVAL`  
The plan is complete. The only blockers to execution are owner approvals and external-service access (Neon, Railway, Taqnyat/Resend).

---

## 1. Secrets Remediation Plan

### 1.1 Secrets Confirmed Exposed in Git History

| Secret | Exposed Value(s) in History | Location in History |
|--------|----------------------------|---------------------|
| **Neon DATABASE_URL** | `postgresql://neondb_owner:npg_wJ8PraiuEHI3@...` (multiple hosts/databases) | `.env` (commits `900d349` → `391a4ca`), `.env.staging`, `.env.vercel.prod.readonly` |
| **Neon DATABASE_URL_UNPOOLED** | Same password, direct host | `.env.staging`, `.env.vercel.prod.readonly` |
| **JWT_SECRET_KEY** | `wathiqcare-super-secret-key`, `d78c1dd46cb62cab2453022c6cf07ef447e5ce62a6f8da761bd137f6ff1ff6a2` | `.env`, `.env.staging`, `.env.vercel.prod.readonly` |
| **Microsoft Entra ID tenant** | `08b4493f-d1e2-4c61-b46f-d652ad477fa6` | `.env` |
| **Microsoft Entra ID client ID** | `d25f4d4d-51bf-4be8-b4fd-ce8744434eef` | `.env` |
| **Microsoft Entra ID client secret** | `replace-with-microsoft-graph-client-secret` (placeholder, but tenant+client ID are real) | `.env` |
| **Local DB password** | `wCare@2026` | `.env` |
| **Bootstrap secret** | `Dolly@20202030` | `.env.vercel.prod.readonly` |
| **Resend SMTP password** | `re_EatDbMkW_L2o3tD7j22feQGBs5EuXUND1` | `.env.vercel.prod.readonly` |
| **Backend URL** | `https://wathiqcare-discharge-refusal-production.up.railway.app` | `.env.vercel.prod.readonly` |
| **Neon DB URL (script)** | `postgresql://neondb_owner:npg_wJ8PraiuEHI3@ep-solitary-haze-a97tafw0.gwc.azure.neon.tech/neondb` | `query_documents.js` (commit `1d6a9f4`) |

### 1.2 Files to Remove from Git History

All of the following files have existed in git history and must be purged:

| File | Reason |
|------|--------|
| `.env` | Live DATABASE_URL, JWT secret, DB password, Microsoft credentials |
| `.env.staging` | Live DATABASE_URL (pooled + unpooled), JWT secret, backend URL, SMTP pass |
| `.env.vercel.prod.readonly` | Live DATABASE_URL, JWT secret, Resend SMTP pass, bootstrap secret, backend URL |
| `..env.swp` | Vim swap file — may contain transient secret state |
| `query_documents.js` | Hardcoded Neon DATABASE_URL with password |

**Templates that appear safe** (contain only placeholders or examples) but should be reviewed by owner before final history rewrite:
- `.env.example`
- `.env.prod.example`
- `.env.production.template`
- `sms-gateway/.env.example`

### 1.3 Secret Rotation Scope

Every credential that appeared in history must be rotated, even if it has already been rotated informally:

| # | Secret | Rotation Owner | Where to Rotate |
|---|--------|----------------|-----------------|
| 1 | **Neon DATABASE_URL password** | Database Admin / DevOps | Neon console → reset `neondb_owner` password or create new role |
| 2 | **DATABASE_URL_UNPOOLED** | Database Admin / DevOps | Same as #1 |
| 3 | **JWT_SECRET_KEY** | DevSecOps | Vercel Preview + Production env vars |
| 4 | **NEXTAUTH_SECRET** | DevSecOps | Vercel Production env var |
| 5 | **PUBLIC_SIGNING_OTP_PEPPER** | DevSecOps | Vercel Preview + Production env vars |
| 6 | **PUBLIC_LINK_TOKEN_PEPPER** | DevSecOps | Vercel Preview + Production env vars |
| 7 | **WATHIQ_STEP_UP_SECRET** | DevSecOps | Vercel Preview + Production env vars |
| 8 | **BOOTSTRAP_SECRET** | DevSecOps | Vercel Preview + Production + Development env vars |
| 9 | **SMTP_PASS (Resend)** | Email Admin / DevOps | Resend dashboard → new API key; Vercel env vars |
| 10 | **TAQNYAT_API_KEY / TAQNYAT_BEARER_TOKEN** | SMS Admin / DevOps | Taqnyat dashboard → new token; Vercel Production env var |
| 11 | **SMS_GATEWAY_SECRET** | DevOps | Vercel Preview + Production env vars |
| 12 | **Microsoft Entra client secret** | Identity Admin | Azure AD → new client secret |
| 13 | **PILOT_DOCTOR_PASSWORD** | DevSecOps | Generate new strong password; Vercel Preview + Production |
| 14 | **PILOT_PLATFORM_ADMIN_PASSWORD, PILOT_LEGAL_PASSWORD, PILOT_FINANCE_PASSWORD** | DevSecOps | Generate new strong passwords; Vercel Preview + Production |
| 15 | **Backend service/Railway credentials** | Backend Owner | Railway dashboard → rotate service tokens, DB connection strings |

---

## 2. Where Each Secret Is Currently Configured

### 2.1 Vercel Environment Variables (Project: `wathiqcare-discharge-refusal`)

**Production-only sensitive vars:**
- `DATABASE_URL` — Production, Preview, Development
- `DATABASE_URL_UNPOOLED` — Production, Preview, Development
- `JWT_SECRET_KEY` — Production, Preview, Development
- `NEXTAUTH_SECRET` — Production
- `POSTGRES_PRISMA_URL` — Production
- `BACKEND_API_BASE_URL` — Production
- `NEXT_PUBLIC_API_BASE_URL` — Production
- `TAQNYAT_API_KEY`, `TAQNYAT_BEARER_TOKEN` — Production
- `SMS_GATEWAY_SECRET`, `SMS_GATEWAY_URL`, `SMS_TRANSPORT` — Production
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `EMAIL_FROM` — Production, Preview, Development
- `BOOTSTRAP_SECRET` — Development, Preview, Production
- `PILOT_*_PASSWORD` — Production (and some in Preview)

**Preview-only sensitive vars (added/updated during this verification):**
- `PUBLIC_SIGNING_OTP_PEPPER`
- `PUBLIC_LINK_TOKEN_PEPPER`
- `WATHIQ_STEP_UP_SECRET`
- `PILOT_DOCTOR_PASSWORD`

**Clean-up note:** `KIMI_UNIQUE_TEST` was created as a diagnostic variable during verification and should be removed from Preview before go-live.

### 2.2 Local `.env` File (Gitignored, Present in Working Directory)

`C:/work/wathiqnote-approved-source-q1bib96s3/.env` currently contains:
- `DATABASE_URL` with password `npg_m4YHocaOk2tV`
- `DATABASE_URL_UNPOOLED`
- `DATABASE_URL_POOLED`
- `JWT_SECRET_KEY=dev-secret-replace-in-production`
- Other local dev values

**Action:** After secret rotation, this file must be regenerated locally with the new values. It must never be committed.

### 2.3 FastAPI Backend Environment

The backend is deployed at `https://wathiqcare-discharge-refusal-production.up.railway.app` (Railway). Environment variables are managed in the Railway project dashboard, not in this repo. Current source code does **not** show explicit gating of `/api/system/inspect` or `/api/sms/test`, but the deployed endpoints currently return `401 Unauthorized`, suggesting an external auth layer or a different deployed revision.

---

## 3. Git History Rewrite Plan (DO NOT EXECUTE WITHOUT OWNER APPROVAL)

### 3.1 Recommended Tool

**Option A — git-filter-repo (recommended):**
- Faster, safer, preserves commit metadata better than BFG.
- Requires Python.

**Option B — BFG Repo-Cleaner:**
- Simpler for file/blob removal.
- Requires Java.

### 3.2 Pre-Rewrite Checklist

- [ ] Ensure all team members have pushed any pending work.
- [ ] Create a bare backup of the repository: `git clone --mirror <repo-url> wathiqcare-backup.git`
- [ ] Verify the list of files to purge with all stakeholders.
- [ ] Confirm new secret values are ready (do not put them in repo until after rewrite).
- [ ] Announce downtime / freeze on the repository.

### 3.3 git-filter-repo Command Plan

```bash
# 1. Install git-filter-repo (one-time)
pip install git-filter-repo

# 2. Create a fresh clone
mkdir -p /tmp/wathiqcare-rewrite
cd /tmp/wathiqcare-rewrite
git clone --mirror https://github.com/wathiqcare/wathiqcare-discharge-refusal.git

# 3. Run git-filter-repo to remove files from all branches and tags
cd wathiqcare-discharge-refusal.git
git filter-repo \
  --path .env \
  --path .env.staging \
  --path .env.vercel.prod.readonly \
  --path ..env.swp \
  --path query_documents.js \
  --invert-paths

# Optional: replace secret strings that appear in non-removed files (e.g., commit messages)
# git filter-repo --replace-text replacements.txt

# 4. Verify removal
git log --all --full-history -- .env .env.staging .env.vercel.prod.readonly ..env.swp query_documents.js
# Should return no commits

# 5. Force-push the rewritten history
# WARNING: This changes every commit hash. All contributors must re-clone.
git push --mirror --force
```

### 3.4 BFG Alternative Command Plan

```bash
# 1. Download BFG
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar -O bfg.jar

# 2. Mirror clone
git clone --mirror https://github.com/wathiqcare/wathiqcare-discharge-refusal.git

# 3. Remove files
java -jar bfg.jar --delete-files .env wathiqcare-discharge-refusal.git
java -jar bfg.jar --delete-files .env.staging wathiqcare-discharge-refusal.git
java -jar bfg.jar --delete-files .env.vercel.prod.readonly wathiqcare-discharge-refusal.git
java -jar bfg.jar --delete-files ..env.swp wathiqcare-discharge-refusal.git
java -jar bfg.jar --delete-files query_documents.js wathiqcare-discharge-refusal.git

# 4. Run git gc
cd wathiqcare-discharge-refusal.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force-push
git push --mirror --force
```

### 3.5 Post-Rewrite Verification

```bash
# Clone fresh copy
git clone https://github.com/wathiqcare/wathiqcare-discharge-refusal.git fresh-clone
cd fresh-clone

# Confirm target files are gone from history
git log --all --full-history -- .env .env.staging .env.vercel.prod.readonly ..env.swp query_documents.js
# Should be empty

# Confirm no secret strings in history
git log --all -S 'npg_wJ8PraiuEHI3'
git log --all -S 'npg_m4YHocaOk2tV'
git log --all -S 'wathiqcare-super-secret-key'
git log --all -S 'Dolly@20202030'
# All should be empty
```

---

## 4. Vercel Environment Variable Rotation Checklist

**Prerequisite:** New secret values generated and stored in a secure vault (1Password, Bitwarden, etc.). Do **not** store them in the repo.

### 4.1 Generate New Values

```bash
# Example: generate 64-byte hex secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example: generate 24-char pilot password
node -e "const c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'; console.log(Array.from({length:24},()=>c[Math.floor(Math.random()*c.length)]).join(''))"
```

### 4.2 Rotate Production (execute only after history rewrite)

```bash
# Set each variable in Production. Use --force if it already exists.
vercel env add JWT_SECRET_KEY production "" --value "<new-value>" --yes --force
vercel env add NEXTAUTH_SECRET production "" --value "<new-value>" --yes --force
vercel env add PUBLIC_SIGNING_OTP_PEPPER production "" --value "<new-value>" --yes --force
vercel env add PUBLIC_LINK_TOKEN_PEPPER production "" --value "<new-value>" --yes --force
vercel env add WATHIQ_STEP_UP_SECRET production "" --value "<new-value>" --yes --force
vercel env add BOOTSTRAP_SECRET production "" --value "<new-value>" --yes --force
vercel env add PILOT_DOCTOR_PASSWORD production "" --value "<new-value>" --yes --force
vercel env add PILOT_PLATFORM_ADMIN_PASSWORD production "" --value "<new-value>" --yes --force
vercel env add PILOT_LEGAL_PASSWORD production "" --value "<new-value>" --yes --force
vercel env add PILOT_FINANCE_PASSWORD production "" --value "<new-value>" --yes --force
vercel env add PILOT_LEGAL_ADMIN_PASSWORD production "" --value "<new-value>" --yes --force
# SMTP_PASS, TAQNYAT_API_KEY, TAQNYAT_BEARER_TOKEN, SMS_GATEWAY_SECRET from provider dashboards
```

### 4.3 Rotate Preview

```bash
vercel env add JWT_SECRET_KEY preview "" --value "<new-preview-value>" --yes --force
vercel env add PUBLIC_SIGNING_OTP_PEPPER preview "" --value "<new-preview-value>" --yes --force
vercel env add PUBLIC_LINK_TOKEN_PEPPER preview "" --value "<new-preview-value>" --yes --force
vercel env add WATHIQ_STEP_UP_SECRET preview "" --value "<new-preview-value>" --yes --force
vercel env add BOOTSTRAP_SECRET preview "" --value "<new-preview-value>" --yes --force
vercel env add PILOT_DOCTOR_PASSWORD preview "" --value "<new-preview-value>" --yes --force
vercel env rm KIMI_UNIQUE_TEST preview --yes  # cleanup diagnostic var
```

### 4.4 Rotate Development

```bash
vercel env add JWT_SECRET_KEY development "" --value "<new-dev-value>" --yes --force
vercel env add BOOTSTRAP_SECRET development "" --value "<new-dev-value>" --yes --force
```

### 4.5 Post-Rotation Verification

```bash
vercel env pull .env.production.local --environment production --yes
vercel env pull .env.preview.local --environment preview --yes

# Verify no empty critical values
grep -E 'JWT_SECRET_KEY|PUBLIC_SIGNING_OTP_PEPPER|PUBLIC_LINK_TOKEN_PEPPER|WATHIQ_STEP_UP_SECRET|BOOTSTRAP_SECRET|DATABASE_URL' .env.production.local
```

---

## 5. Backend (FastAPI) Hardening Plan

### 5.1 Current State

| Item | Detail |
|------|--------|
| **Deployment host** | Railway (`wathiqcare-discharge-refusal-production.up.railway.app`) |
| **Health endpoint** | `GET /health` → `200 OK` |
| **System inspect endpoint** | `GET /api/system/inspect` → currently `401 Unauthorized` |
| **SMS test endpoint** | `POST /api/sms/test` → currently `401 Unauthorized` |
| **Source code** | `backend/main.py` includes `system_inspect_router` and `sms_test_router` unconditionally |

**Observation:** The deployed backend returns `401` on both inspect and sms-test, but the source code in commit `e2b2e7de` does not show explicit gating. This indicates either:
- A Railway/custom auth layer is in front of the backend, OR
- The deployed revision differs from the source commit.

### 5.2 Is BACKEND_API_BASE_URL Required for the Internal IMC Pilot?

**Answer: Not for the Informed Consents pilot path.**

Evidence:
- The current Preview deployment has **no** `BACKEND_API_BASE_URL` configured.
- The complete Playwright smoke suite (7/7) for the informed-consents physician workspace, patient signing surface, OTP, final-pdf, and audit timeline passes without the backend.
- `grep -r "backendProxy\|getConfiguredBackendApiBaseUrl" apps/web/src/` shows **no active call sites** for the backend proxy in current frontend routes.
- `BACKEND_API_BASE_URL` is set only in Vercel **Production**, likely for legacy discharge-refusal flows not in scope for the IMC pilot.

**Recommendation:** Keep `BACKEND_API_BASE_URL` in Production but verify it is not used by the pilot surface. If it is unused, consider removing it after pilot to reduce attack surface.

### 5.3 Required Backend Hardening Actions (Owner: Backend Team / Railway Admin)

| # | Action | Acceptance Criteria |
|---|--------|---------------------|
| 1 | **Confirm auth mechanism** | Document what returns `401` on `/api/system/inspect` and `/api/sms/test` (Railway basic auth, API gateway, deployed code branch). |
| 2 | **Gate `system_inspect`** | `GET /api/system/inspect` requires valid authentication OR is disabled entirely in production. |
| 3 | **Gate `sms_test`** | `POST /api/sms/test` requires `WATHIQCARE_BACKEND_SMS_TEST_ENABLED=true` AND valid admin credentials, OR is disabled in production. |
| 4 | **CORS restriction** | Backend CORS allows only `https://wathiqcare.online`, `https://*.wathiqcare.vercel.app`, and known preview origins. |
| 5 | **Tenant isolation audit** | Verify discharge/signature endpoints enforce `tenant_id` ownership on every request. |
| 6 | **Dependency/update scan** | Run `pip-audit` / `safety` on `backend/requirements.txt`; patch critical vulnerabilities. |
| 7 | **Log/monitoring** | Confirm backend access logs are shipped to the SIEM and alert on `401/403` spikes. |
| 8 | **Redeploy backend** | Push hardened backend image to Railway; confirm `/health` still returns `200`. |

### 5.4 Suggested Source-Code Change (for owner review)

If the deployed code is indeed ungated, add environment-based gating before redeploy:

```python
# backend/main.py
import os

if os.getenv("WATHIQCARE_BACKEND_SYSTEM_INSPECT_ENABLED", "false").lower() == "true":
    app.include_router(system_inspect_router)

if os.getenv("WATHIQCARE_BACKEND_SMS_TEST_ENABLED", "false").lower() == "true":
    app.include_router(sms_test_router)
```

Then set both env vars to `false` in Railway Production.

### 5.5 Backend Verification Commands

```bash
BACKEND="https://wathiqcare-discharge-refusal-production.up.railway.app"

# Should remain 200
curl -s -o /dev/null -w "%{http_code}\n" "$BACKEND/health"

# Should remain 401 (or 404 if disabled)
curl -s -o /dev/null -w "%{http_code}\n" "$BACKEND/api/system/inspect"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BACKEND/api/sms/test" \
  -H "Content-Type: application/json" -d '{"to":"+966500000000"}'

# With valid auth token (replace <TOKEN>), should still be denied for non-admin
# curl -H "Authorization: Bearer <TOKEN>" "$BACKEND/api/system/inspect"
```

---

## 6. End-to-End Release Runbook

### Phase 1 — Preparation (Owner: Release Commander + Security Lead)

1. **Freeze repository** — no merges until history rewrite is complete.
2. **Back up repository** — `git clone --mirror` to secure storage.
3. **Generate new secrets** — store in vault; do not commit.
4. **Schedule maintenance window** — communicate to IMC pilot stakeholders.
5. **Confirm access:**
   - Neon console (database password rotation)
   - Railway dashboard (backend env vars + redeploy)
   - Resend dashboard (SMTP key rotation)
   - Taqnyat dashboard (SMS token rotation)
   - Vercel dashboard/CLI (env var rotation + production promotion)
   - Azure AD (Microsoft client secret rotation, if used)

### Phase 2 — History Rewrite (Owner: DevSecOps)

1. Execute the `git-filter-repo` plan from Section 3.
2. Force-push rewritten history to origin.
3. Verify purge with `git log --all -S '<old-secret>'`.
4. Invalidate any old fork/clone caches; ask team to re-clone.

### Phase 3 — Secret Rotation (Owner: DevSecOps + Service Owners)

1. Rotate Neon database password and update `DATABASE_URL` / `DATABASE_URL_UNPOOLED` in Vercel (all environments) and Railway.
2. Rotate Vercel secrets per Section 4.
3. Rotate Resend SMTP key and update `SMTP_PASS`.
4. Rotate Taqnyat SMS token and update `TAQNYAT_API_KEY` / `TAQNYAT_BEARER_TOKEN`.
5. Rotate Microsoft Entra client secret (if still in use) and update env vars.
6. Rotate backend/Railway service tokens.
7. Rotate pilot account passwords and distribute securely to pilot users.

### Phase 4 — Backend Hardening & Redeploy (Owner: Backend Team)

1. Implement gating for `/api/system/inspect` and `/api/sms/test`.
2. Restrict CORS to known origins.
3. Run security scan on dependencies.
4. Deploy hardened backend to Railway.
5. Run verification commands from Section 5.5.
6. Confirm tenant isolation with a multi-tenant test case.

### Phase 5 — Preview Validation (Owner: Release Engineer)

1. Create fresh Preview deployment from the rewritten commit:
   ```bash
   vercel --target preview --yes
   ```
2. Verify all required Preview env vars are non-empty.
3. Ensure smoke-physician account exists with role `doctor`.
4. Run Playwright smoke suite:
   ```bash
   PREVIEW_URL=<new-preview-url> TEST_PHYSICIAN_PASSWORD=<new-password> \
     npx playwright test --config playwright.preview.config.ts
   ```
5. Verify P0-001 through P0-008:
   - P0-001: bypass headers return `stepUp.verified: false`
   - P0-002: OTP endpoints require valid OTP
   - P0-003: new signing tokens have `token_hash`, no raw `token`
   - P0-004: OTP pepper set and functional
   - P0-005: public final-pdf route resolves
   - P0-006/P0-007: history verified clean, all old secrets rotated
   - P0-008: backend inspect/sms-test return 401/404, tenant isolation confirmed

### Phase 6 — Production Promotion (Owner: Release Commander)

1. Confirm all mandatory items in `docs/release/FINAL_GO_LIVE_CHECKLIST.md` are ✅.
2. Obtain sign-off from Engineering Lead, Security Lead, Clinical Governance Lead, and IMC Pilot Sponsor.
3. Promote validated Preview to Production:
   ```bash
   vercel --target production --yes
   # or via Vercel dashboard: promote the validated Preview deployment
   ```
4. Post-promotion smoke tests against `https://wathiqcare.online`:
   - Login
   - Physician workspace
   - Patient signing surface
   - OTP flow
   - Final PDF
   - Audit timeline
5. Monitor error logs for 30 minutes.
6. Announce Internal IMC Pilot go-live.

---

## 7. Risks & Rollback

| Risk | Mitigation |
|------|------------|
| History rewrite breaks open PRs / forks | Freeze repo; notify all contributors; provide re-clone instructions. |
| Secret rotation causes service outage | Rotate in controlled order: DB → Vercel → backend; verify health at each step. |
| Backend hardening blocks legitimate traffic | Test all pilot flows in Preview before production promotion. |
| Production promotion fails | Vercel instant rollback to previous production deployment via dashboard. |
| Old secrets still in cached builds | Trigger fresh deployments after rotation; do not reuse build cache with old env. |

---

## 8. Approval Gate

Before executing any destructive step, obtain written approval for:

- [ ] Git history rewrite and force-push
- [ ] Production secret rotation
- [ ] Backend code change and redeploy
- [ ] Production promotion

**Runbook prepared by:** Automated release-validation session  
**Ready for owner approval:** ✅  
**Missing required access/details:** None for planning; external dashboard access required for execution (Neon, Railway, Resend, Taqnyat, Azure AD).
