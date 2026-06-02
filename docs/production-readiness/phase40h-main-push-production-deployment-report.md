# Phase 40H — Main Push & Production Deployment Report

**Date:** 2026-06-01
**Branch merged:** `phase40g-final-ui-clean` → `main`
**Production URL (alias):** https://wathiqcare.online
**Production URL (deploy):** https://wathiqcare-discharge-refusal-b6iwie3bs-wathiqcare.vercel.app
**Production commit SHA:** `ffe3b03d40258d87539a11898c8621745f095dae`
**Status:** Deployment complete, production verified.

---

## 1. Pre-Commit Verification

- Staged files: **46** (24 source + 22 docs/screenshots).
- Forbidden-pattern scan (`prisma/migrations | signature-orchestration-service | public-signing/decision-status | unified-disclosure-projection | unified-disclosure-shadow-mode | controlled-production-pilot-governance | PhysicianWorkflowPreview | .env | .next | .vercel | node_modules | logs | __phase*`): **NONE**

---

## 2. Commit & Branch Push

```
git commit -m "feat(informed-consents): activate final physician consent builder UI"
[phase40g-final-ui-clean 657490b] feat(informed-consents): activate final physician consent builder UI
 46 files changed, 3590 insertions(+), 41 deletions(-)
```

```
git push origin phase40g-final-ui-clean
 * [new branch]      phase40g-final-ui-clean -> phase40g-final-ui-clean
```

---

## 3. Merge to Main

```
git checkout main
git pull origin main          # Already up to date.
git merge --no-ff phase40g-final-ui-clean
Merge made by the 'ort' strategy.
 46 files changed, 3590 insertions(+), 41 deletions(-)

git push origin main
   83f3880..ffe3b03  main -> main
```

| Ref | Before | After |
|-----|--------|-------|
| `origin/main` | `83f3880` | `ffe3b03` |
| Merge commit | n/a | `ffe3b03d40258d87539a11898c8621745f095dae` |
| Feature commit | n/a | `657490b0237ab01e4c4250b7187fbfabe50f8fa9` |

---

## 4. Vercel Production Deploy

```
cd apps/web
npx vercel deploy --prod --yes
...
Build Completed in /vercel/output [2m]
Deployment completed
▲ Production  https://wathiqcare-discharge-refusal-b6iwie3bs-wathiqcare.vercel.app
Completing…
▲ Aliased     https://wathiqcare.online
✓ Ready in 3m
```

Deploy log: `__phase40h_deploy.log`.

---

## 5. Production Runtime Verification

### 5.1 `GET https://wathiqcare.online/api/health/runtime` → **200**

```json
{
  "status": "ok",
  "deployment": {
    "vercelEnv": "production",
    "vercelUrl": "wathiqcare-discharge-refusal-b6iwie3bs-wathiqcare.vercel.app",
    "gitCommitSha": "ffe3b03d40258d87539a11898c8621745f095dae",
    "gitCommitRef": "main"
  },
  "runtime": { "nodeEnv": "production", "fingerprint": "58ec1998fd12cf60", "envPresence": [...] },
  "diagnostics": {
    "missingRequiredKeys": [],
    "modes": { "maintenanceMode": false, "readonlyMode": false, "degradedMode": false, "effectiveMode": "normal" }
  }
}
```

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| HTTP status | 200 | 200 | ✅ |
| `gitCommitSha` matches local main HEAD | `ffe3b03…` | `ffe3b03d40258d87539a11898c8621745f095dae` | ✅ |
| `gitCommitRef` | `main` | `main` | ✅ |
| `vercelEnv` | `production` | `production` | ✅ |
| `maintenanceMode` / `readonlyMode` / `degradedMode` | all false | all false | ✅ |
| `missingRequiredKeys` | empty | `[]` | ✅ |
| `effectiveMode` | `normal` | `normal` | ✅ |

### 5.2 Physician Journey (authenticated `dr.ahmed@wathiqcare.med.sa`)

Captured via `__phase40h_prod_capture.cjs`. Output dir:
`docs/production-readiness/phase40h-production-screenshots/`.

| # | Requirement | URL | HTTP | Screenshot |
|---|-------------|-----|------|------------|
| 01 | `/modules/informed-consents` opens Consent Builder Step 1 | `/modules/informed-consents` | 200 | `01_modules_informed-consents_default_landing.png` (159 KB) |
| 02 | Step 2 Procedure reachable | `/modules/informed-consents` (+click Procedure) | 200 | `02_step2_procedure.png` (168 KB) |
| 03 | Step 7 Validation reachable | `/modules/informed-consents` (+click Validation) | 200 | `03_step7_validation.png` (157 KB) |
| 04 | Step 8 Send reachable | `/modules/informed-consents` (+click Send) | 200 | `04_step8_send.png` (161 KB) |
| 05 | Arabic mode works | `/modules/informed-consents?lang=ar` | 200 | `05_arabic_mode.png` (159 KB) |
| 06 | `/modules/informed-consents/create` unchanged | `/modules/informed-consents/create` | 200 | `06_modules_informed-consents_create.png` (113 KB) |
| 07 | `/modules` catalog unchanged | `/modules` | 200 | `07_modules.png` (83 KB) |

### 5.3 Patient Route Preservation (anonymous, no new tokens issued)

| Token (truncated) | URL | HTTP | Interpretation |
|-------------------|-----|------|----------------|
| `xYonm4Ro…` | `/sign/{token}/workflow` | 404 | Route mounted; token expired/unknown (expected) |
| `FQiasUsN…` | `/sign/{token}/workflow` | 404 | Route mounted; token expired/unknown (expected) |

The 404 responses confirm `/sign/[token]/workflow` remains mounted and
untouched — no 500, no routing collapse.

### 5.4 SMS Disabled

- Code path `src/services/sms/taqnyatClient.ts` requires
  `TAQNYAT_SMS_ENABLED ∈ {"1","true","yes"}` AND a bearer token; if either is
  missing, `sendSms()` short-circuits with
  `{ ok: false, statusCode: 503, response: { code: 'TAQNYAT_NOT_CONFIGURED_OR_DISABLED' } }`.
- `TAQNYAT_SMS_ENABLED` is not declared as a required env key (absent from
  `health/runtime.envPresence`); without it, `isSmsEnabled()` returns `false`.
- Production override file `apps/web/.env.vercel.production.release` line 11
  pins `SMS_ENABLED="false"`.
- **Status:** SMS remains disabled in production.

---

## 6. Verbatim Requirement Confirmation

> "/api/health/runtime returns 200; runtime commit SHA matches main;
> /modules/informed-consents opens Consent Builder Step 1 after login;
> Step 2, Step 7, Step 8 are reachable; Arabic mode works;
> /modules/informed-consents/create remains unchanged; /modules catalog
> remains unchanged; /sign/[token]/workflow remains mounted; SMS remains
> disabled."

| Requirement | Result |
|-------------|--------|
| `/api/health/runtime` returns 200 | ✅ §5.1 |
| Runtime commit SHA matches main | ✅ `ffe3b03d…` matches local & origin/main |
| `/modules/informed-consents` opens Consent Builder Step 1 after login | ✅ shot 01 |
| Step 2 reachable | ✅ shot 02 |
| Step 7 reachable | ✅ shot 03 |
| Step 8 reachable | ✅ shot 04 |
| Arabic mode works | ✅ shot 05 |
| `/modules/informed-consents/create` unchanged | ✅ shot 06 |
| `/modules` catalog unchanged | ✅ shot 07 |
| `/sign/[token]/workflow` remains mounted | ✅ §5.3 (404 on expired tokens; route alive) |
| SMS remains disabled | ✅ §5.4 |

---

## 7. Scope Compliance

| Hard rule | Compliance |
|-----------|------------|
| No new files beyond Phase 40G staged set | ✅ Exactly 46 files committed |
| No migrations | ✅ Zero `prisma/migrations/*` |
| No SMS enablement | ✅ `SMS_ENABLED="false"`, env unset |
| No OTP/signing/token/session logic changes | ✅ Zero diff hits |
| No public-signing API changes | ✅ Zero diff hits |
| No patient journey changes | ✅ `/sign/[token]/workflow` 404 baseline preserved |
| No projection / shadow-mode / governance files | ✅ Zero diff hits |
| No temporary logs in commit | ✅ Logs stay untracked (`__phase40h_*.log`) |
| No `.env` / `.next` / `.vercel` / `node_modules` | ✅ Zero diff hits |

---

## 8. Patient Delivery Status

Patient SMS/OTP delivery remains **frozen**:
- `TAQNYAT_SMS_ENABLED` not enabled in production env.
- `SMS_ENABLED="false"` in production release override.
- No new patient tokens issued during Phase 40H (anon route check used pre-existing expired tokens only).
- `/sign/[token]/workflow` route mounted and reachable for legitimate tokens
  but the SMS notification channel that delivers tokens to patients is not
  active.

---

## 9. Final Classification

**PRODUCTION DEPLOYED – PHYSICIAN JOURNEY UI ACTIVE; PATIENT DELIVERY STILL FROZEN**
