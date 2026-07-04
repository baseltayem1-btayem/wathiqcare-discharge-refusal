# RC1 Gate 1.2 — 03 Production Source of Truth

**Scope:** Declare the authoritative implementation for each architectural concern and justify the decision.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

For every duplicated concern, a single production source of truth is identified. The authoritative components are those that are actively built, deployed, and hardened for RC1. All other implementations are classified as legacy, parallel, or dead code to be archived or deleted after RC1.

---

## 1. Production Source of Truth by Concern

| Concern | Production Source of Truth | Why |
|---|---|---|
| **Frontend application** | `apps/web/` | Built by root workspaces and CI; runs Next.js 16.2.9; contains all RC1 modules (Informed Consents, Promissory Notes, Clinical Knowledge Engine, Discharge Refusal, etc.). |
| **Frontend package name** | `@wathiqcare/web` in `apps/web/package.json` | This is the package resolved by root workspaces and Vercel builds. |
| **Backend application** | `apps/api/backend/` | Referenced by `apps/api/package.json` `dev` script (`uvicorn backend.main:app`); contains runtime secret validation, CORS hardening, rate limiting, RBAC, and newer migrations/models. |
| **Backend entry point** | `apps/api/backend/main.py` | Production `uvicorn` launch target; includes `/ready` probe and startup validation. |
| **Authentication** | `apps/web/src/lib/server/auth.ts` + `apps/web/src/app/api/auth/*` | Cookie/JWT auth used by all server pages and API routes; Prisma-backed user/tenant/membership validation. |
| **JWT signing/verification** | `apps/web/src/lib/server/jwt.ts` + `auth-token.ts` | Production tokens are issued and verified here. |
| **Configuration validation** | `apps/web/src/lib/config/env-validation.ts` invoked by `apps/web/src/instrumentation.ts` | Fails fast at Next.js startup on missing/placeholder secrets. |
| **Database schema** | `apps/web/prisma/schema.prisma` | Canonical Prisma schema with 96 models and active migrations; used by production build and tests. |
| **Database access** | `apps/web/src/lib/server/prisma.ts` (`getPrisma()` singleton) | Production Prisma client used by all Next.js server code. |
| **Migrations** | `apps/web/prisma/migrations/` | Prisma migration files applied in production. |
| **Audit logging** | `apps/web/src/lib/server/saas-services.ts` (`writeAuditLog`) + `audit-chain-service.ts` | Persistent, hash-chained audit records in Prisma. |
| **Backend proxy target** | `BACKEND_API_BASE_URL` → `apps/api/backend/main.py` | `apps/web/src/lib/server/backendProxy.ts` and `backend.ts` route HTTP calls to this URL. |
| **Environment documentation** | Root `.env.example` (after cleanup) | Single placeholder template; must be sanitized and kept in sync with validators. |

---

## 2. Non-Production Implementations

| Concern | Non-Production Implementation | Classification | Disposition |
|---|---|---|---|
| Python backend | `backend/` (root) | Legacy / Dead Code | Delete after RC1 tooling audit |
| Python auth | `apps/api/backend/core/security.py` + `api/routers/auth.py` | Parallel | Evaluate: delegate to Next.js `/api/auth/me` or remove if unused |
| Python audit | `apps/api/backend/audit/audit_logger.py`, `backend/audit/audit_logger.py` | Dead code | Delete |
| SQLAlchemy models | `apps/api/backend/models/`, `backend/models/` | Parallel / Legacy | Read-only or archive |
| Prisma schema | `prisma/schema.prisma` | Legacy | Archive / delete |
| Prisma schema | `frontend/prisma/schema.prisma` | Legacy | Archive / delete |
| Frontend app | `frontend/` | Legacy | Archive / delete |
| Frontend app | `frontend-angular/` | Legacy | Archive / delete |
| NextAuth keys | `apps/web/src/lib/server/runtime-health.ts` | Dead code | Remove |
| Config docs | Root `.env.example` (current) | Documentation debt | Sanitize and align with validators |

---

## 3. Justification for Key Decisions

### 3.1 Why `apps/web/` is the production frontend

- Root `package.json` workspaces include `apps/web` and `packages/*`; `frontend/` is excluded.
- CI build scripts (`npm run build`, `npm run dev`) target `apps/web`.
- `apps/web` has the latest Next.js 16, React 19.2, and all RC1 modules.
- `frontend/package.json` has an older Next.js version and the same package name, creating a collision.

### 3.2 Why `apps/api/backend/` is the production backend

- `apps/api/package.json` script: `uvicorn backend.main:app --host 0.0.0.0 --port 8000` resolves to `apps/api/backend/main.py` from the `apps/api/` working directory.
- Runtime logs in `apps/web/railway_logs.txt` show logger names matching `apps/api/backend` module paths (e.g., `backend.services.integration_monitoring_service`).
- `apps/api/backend/main.py` contains production-hardening features absent from `backend/main.py`:
  - `_validate_runtime_config()` for `JWT_SECRET_KEY` and `PUBLIC_LINK_TOKEN_PEPPER`
  - CORS allowlist defaulting to `wathiqcare.online`
  - `SensitiveRouteRateLimiter`
  - `/ready` health probe
  - Integration scheduler lifecycle
- Git history shows production-hardening commits on `apps/api/backend/main.py` that do not appear in `backend/main.py`.

### 3.3 Why Prisma (not SQLAlchemy) owns the schema

- `apps/web/prisma/schema.prisma` has 96 models and active migrations.
- Production build and tests use Prisma (`npm run prisma:generate`, `npm run test`).
- SQLAlchemy models in `apps/api/backend/models/` are a partial, read-only mirror and call `Base.metadata.create_all()`, which can create unmanaged tables.

### 3.4 Why Next.js auth (not Python auth) is the production auth

- All `apps/web` server pages and API routes use `requireAuth`, `requirePageSessionOrRedirect`, or `getSessionCookieName` from `apps/web/src/lib/server/auth.ts`.
- The client-side `apiFetch` calls Next.js `/api/auth/me`, not the Python backend.
- `backendProxy.ts` (the HTTP proxy) is the only intended integration point with the Python backend; no route imports Python auth modules.

---

## 4. Mapping: Legacy → Production

| If you need to change... | Use this production file | Do not edit |
|---|---|---|
| Backend startup / CORS / secrets | `apps/api/backend/main.py` | `backend/main.py` |
| Backend auth deps | `apps/api/backend/api/deps.py` | `backend/api/deps.py` |
| Backend JWT/security | `apps/api/backend/core/security.py` | `backend/core/security.py` |
| Backend discharge API | `apps/api/backend/api/routers/discharge.py` | `backend/api/routers/discharge.py` |
| Backend secure links | `apps/api/backend/services/secure_link_service.py` | `backend/services/secure_link_service.py` |
| Frontend pages/components | `apps/web/src/app/` / `src/components/` | `frontend/` |
| Auth logic | `apps/web/src/lib/server/auth.ts` | Python auth routers |
| Env validation | `apps/web/src/lib/config/env-validation.ts` | `backend/main.py` (add parallel validation only if needed) |
| DB schema | `apps/web/prisma/schema.prisma` | SQLAlchemy models as schema source |
| Audit logging | `apps/web/src/lib/server/saas-services.ts` | Python `audit_logger.py` |

---

## 5. Recommended Source-of-Truth Guardrails

1. **CI check:** fail the build if `backend/` differs from `apps/api/backend/` (or after deletion, fail if `backend/` exists).
2. **Workspace cleanup:** remove `frontend/` and `frontend-angular/` from the active branch to prevent package-name collisions.
3. **Import lint:** add an ESLint/CI rule that forbids imports from `backend/` (root), `frontend/`, or `frontend-angular/` into `apps/web/`.
4. **Schema gate:** require all schema changes to be made in `apps/web/prisma/schema.prisma`; block SQLAlchemy `create_all` in production.
