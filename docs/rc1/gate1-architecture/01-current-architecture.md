# RC1 Gate 1.2 — 01 Current Architecture

**Scope:** Document the current application architecture and identify structural ambiguity before RC1.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

WathiqCare has a clear production execution path, but several parallel/legacy implementations create architectural ambiguity. The live stack is the Next.js 16 application in `apps/web/`, backed by the Python FastAPI service in `apps/api/backend/`. However, a legacy copy of the Python backend exists at `backend/`, a legacy Next.js frontend exists at `frontend/`, an Angular prototype exists at `frontend-angular/`, and multiple prototype/pilot code paths are reachable inside `apps/web/`.

This document maps the current architecture, the production path, and the ambiguous duplicates.

---

## 1. Production Execution Path

```text
User → Vercel / Node.js → apps/web (Next.js 16)
       ↓ HTTP proxy (BACKEND_API_BASE_URL)
       apps/api/backend (FastAPI / uvicorn on port 8000)
       ↓ Prisma-managed PostgreSQL
```

### Frontend

| Layer | Path | Status |
|---|---|---|
| Production app | `apps/web/` | Live |
| Runtime config validation | `apps/web/src/lib/config/env-validation.ts` + `apps/web/src/instrumentation.ts` | Live |
| Server-side business logic | `apps/web/src/lib/server/` | Live |
| API routes (App Router) | `apps/web/src/app/api/` | Live |
| Proxy to Python backend | `apps/web/src/lib/server/backendProxy.ts` | Live |
| Database access (Prisma) | `apps/web/src/lib/server/prisma.ts` + `apps/web/prisma/schema.prisma` | Live |

### Backend

| Layer | Path | Status |
|---|---|---|
| Production entry point | `apps/api/backend/main.py` | Live |
| Runtime config validation | `apps/api/backend/main.py::_validate_runtime_config()` | Live |
| Routers | `apps/api/backend/api/routers/` | Live |
| Core services | `apps/api/backend/core/`, `services/`, `legal/`, `discharge/` | Live |
| Database models (SQLAlchemy read-only) | `apps/api/backend/models/` | Legacy/parallel |
| Migrations | `apps/api/backend/migrations/` | Historical SQL only; schema owned by Prisma |

---

## 2. Major Components

### 2.1 `apps/web/` (Production Next.js App)

- **Package name:** `@wathiqcare/web`
- **Framework:** Next.js 16.2.9, React 19.2.3
- **Build command:** `npm run build -w apps/web`
- **Key directories:**
  - `src/app/` — App Router pages and API route handlers
  - `src/lib/server/` — server-side business logic and data access
  - `src/components/` — React components
  - `prisma/schema.prisma` — canonical database schema
- **Authentication:** custom JWT/cookie auth implemented in `src/lib/server/auth.ts` and `src/app/api/auth/`
- **Audit:** Prisma-backed `writeAuditLog` + `audit-chain-service.ts`

### 2.2 `apps/api/backend/` (Production Python API)

- **Framework:** FastAPI
- **Run command:** `uvicorn backend.main:app --host 0.0.0.0 --port 8000` (from `apps/api/package.json`)
- **Role:** provides discharge, legal, forms, secure-link, notification, integration, and signature services consumed by `apps/web` via HTTP proxy
- **Hardening:** runtime secret validation, CORS allowlist, sensitive-route rate limiting (`core/http_hardening.py`), RBAC (`core/rbac.py`, `core/roles.py`)

### 2.3 Root `backend/` (Legacy Mirror)

- **Origin:** originally a symlink to `apps/api/backend/` (commit `26cb8034`), later materialized into a stale plain directory
- **Status:** not referenced by any package script; missing recent hardening, migrations, models, and services
- **Risk:** developers may edit the wrong copy; deployment tooling could accidentally target it

### 2.4 `frontend/` (Legacy Next.js App)

- **Package name:** `@wathiqcare/web` (same as `apps/web/` — collision)
- **Status:** not in root workspaces; not built by CI; appears to be a diverged branch snapshot
- **Contains:** overlapping landing, login, cases, workflow pages

### 2.5 `frontend-angular/` (Legacy Angular App)

- **Status:** not in root workspaces; unmaintained

---

## 3. Data Flow

1. Browser requests hit `apps/web` (Next.js).
2. `proxy.ts` handles routing, locale prefixing, and auth-cookie presence checks.
3. Server pages and API routes in `apps/web/src/app/` run business logic directly using Prisma.
4. Some routes proxy to the Python backend via `backendProxy.ts` / `backend.ts` at `BACKEND_API_BASE_URL`.
5. The Python backend (`apps/api/backend/main.py`) provides discharge/legal/secure-link/notification services and reads/writes the same PostgreSQL database.

---

## 4. Ambiguity Points

| # | Ambiguity | Consequence |
|---|---|---|
| 1 | Two Python backends (`apps/api/backend/` vs `backend/`) | Risk of editing/deploying the wrong one. |
| 2 | Two Next.js frontends (`apps/web/` vs `frontend/`) | Package-name collision; stale code. |
| 3 | Two ORM layers (Prisma + SQLAlchemy) on the same DB | Schema/migration drift risk. |
| 4 | Two auth stacks (Next.js cookie/JWT + Python bearer/JWT) | Secret/algorithm drift; weaker path may be used. |
| 5 | Two config validators (Next.js + Python) | Inconsistent required-secret checks. |
| 6 | Two audit stacks (Prisma-backed + in-memory Python) | Inconsistent/non-persistent audit. |
| 7 | Prototype routes under `/prototype/*` and `/landing-preview` | Ungated experimental code reachable in production. |
| 8 | Pilot/env-gated code (`controlled-production-pilot-governance.ts`, `pilot-email-override.ts`, etc.) | Experimental paths can be enabled by env in production. |

---

## 5. Technology Stack Summary

| Concern | Production Choice | Legacy/Parallel Choices |
|---|---|---|
| Frontend framework | Next.js 16 (`apps/web`) | Next.js 16 (`frontend/`), Angular (`frontend-angular/`) |
| Backend framework | FastAPI (`apps/api/backend`) | FastAPI (`backend/`) |
| Auth | Custom JWT + cookie (`apps/web`) | Python JWT (`apps/api/backend`, `backend/`) |
| Database ORM | Prisma (`apps/web/prisma`) | SQLAlchemy (`apps/api/backend/models`, `backend/models`) |
| Migrations | Prisma (`apps/web/prisma/migrations`) | Raw SQL (`apps/api/backend/migrations`), SQLAlchemy `create_all` |
| Audit | Prisma + hash chain (`apps/web/src/lib/server`) | In-memory Python (`backend/audit`, `apps/api/backend/audit`) |
| Config validation | `env-validation.ts` + `instrumentation.ts` | FastAPI startup validator; legacy `backend/main.py` has none |
