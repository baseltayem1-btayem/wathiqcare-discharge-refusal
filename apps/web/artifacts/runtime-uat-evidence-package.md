# Runtime Stability UAT Evidence Package

Date: 2026-05-17  
Scope: Production runtime stability hardening

## 1) Production Environment Variables (Vercel)

Required keys validated by runtime diagnostics endpoint `/api/health/runtime`:
- `DATABASE_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `AUTH_TRUST_HOST`
- `NODE_ENV`

Evidence fields:
- `runtime.envPresence[]`
- `diagnostics.missingRequiredKeys[]`
- `runtime.fingerprint` (deployment env fingerprint)

## 2) Active Production Deployment Using Latest Env

Use `/api/health/runtime` and confirm:
- `deployment.vercelEnv = production`
- `deployment.gitCommitSha` equals expected release SHA
- `runtime.fingerprint` matches latest expected environment fingerprint

## 3) Neon Runtime Connectivity

Use `/api/health/db` and confirm:
- `pooled.source` and `direct.source`
- `pooled.sslMode`, `direct.sslMode`
- `pooled.connectionLimit`, `direct.connectionLimit`
- `prisma.ok = true`

## 4) Runtime Health Diagnostics

Added endpoints:
- `/api/health/db`
- `/api/health/auth`
- `/api/health/runtime`

## 5) Structured Runtime Logs

Events:
- `LOGIN_PRISMA_ERROR` (existing)
- `SESSION_RUNTIME_ERROR` (new)
- `MODULES_RUNTIME_ERROR` (new)

## 6) Crash Prevention Controls

Implemented:
- DB unavailable in auth path returns controlled `503` (`Authentication service temporarily unavailable`)
- Module card rendering failures are isolated and shown as disabled cards
- Invalid/missing session redirects to `/login` with `reason` query (`session_invalid`, `session_missing`, `session_cookie_error`)

## 7) Validation Snapshot (Local)

- `npm run lint -w apps/web` ✅ (warnings only)
- `npm run test -w apps/web` ❌ (pre-existing unrelated failures in role/legal test files)
- `npm run build -w apps/web` ✅

## 8) UAT Functional Checklist (to execute on production)

- [ ] Login
- [ ] `/modules`
- [ ] Informed consent workflow
- [ ] MRN search
- [ ] PDF generation
- [ ] QR verification

Attach:
- `/api/health/runtime` response JSON
- `/api/health/db` response JSON
- `/api/health/auth` response JSON
- Runtime logs containing `LOGIN_PRISMA_ERROR`, `SESSION_RUNTIME_ERROR`, `MODULES_RUNTIME_ERROR`
