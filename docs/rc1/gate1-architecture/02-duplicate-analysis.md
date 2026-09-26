# RC1 Gate 1.2 — 02 Duplicate Analysis

**Scope:** Identify and classify duplicated backend implementations, services, authentication, configuration, database access, and audit logic.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Methodology

- `diff -rq backend apps/api/backend` to compare the two Python backend trees.
- `grep` for cross-imports between `backend/` and `apps/api/backend/`.
- Manual review of auth, config, DB, and audit files in `apps/web/src/lib/server/`, `apps/api/backend/`, and `backend/`.
- Verification of package scripts and workspace membership.

---

## 1. Python Backend Duplication (`backend/` vs `apps/api/backend/`)

### Classification: `apps/api/backend/` = Production, `backend/` = Legacy / Dead Code

| Item | `apps/api/backend/` | `backend/` | Classification | Recommendation |
|---|---|---|---|---|
| `main.py` | Production entry point with CORS, secret validation, rate limiting, `/ready` probe | Basic FastAPI app without validation | Production / Legacy | Keep `apps/api/backend`; delete `backend/` later |
| `api/routers/alerts.py` | Exists | Missing | Production | Keep |
| `api/routers/sms_evidence.py` | Exists | Missing | Production | Keep |
| `api/routers/auth.py` | Rate-limited, masked logging, structured audit | Older login router | Production / Legacy | Keep `apps/api/backend`; delete `backend/` later |
| `api/deps.py` | Tenant isolation, role canonicalization, platform SSO fallback | Simpler deps | Production / Legacy | Keep `apps/api/backend`; delete `backend/` later |
| `core/security.py` | Issuer validation, TTL clamping, placeholder rejection | Weaker JWT validation | Production / Legacy | Keep `apps/api/backend`; delete `backend/` later |
| `core/http_hardening.py` | Sensitive-route rate limiter + sanitized exception handlers | Missing | Production | Keep |
| `core/rbac.py`, `core/roles.py` | Granular permissions + case access enforcement | Missing | Production | Keep |
| `core/database.py` | `postgresql+psycopg2` normalization, prefers `DATABASE_URL` | Older connection logic | Production / Legacy | Keep `apps/api/backend`; delete `backend/` later |
| `models/` | Extended models + new tables | Subset, missing new tables | Production / Legacy | Keep `apps/api/backend`; delete `backend/` later |
| `migrations/` | 11 raw SQL migration folders | 6 raw SQL migration folders | Production / Legacy | Keep `apps/api/backend`; delete `backend/` later |
| `services/integration_monitoring_service.py` | Exists | Missing | Production | Keep |
| `notifications/` package | Exists | Missing | Production | Keep |
| `legal/legal_artifact_service.py` | Exists | Missing | Production | Keep |

**Finding count:** 175 files in `apps/api/backend/` vs 138 files in `backend/`. No file exists only in root `backend/`.

### Cross-import check

- **No direct imports from `apps/api/backend/` to `backend/`** were found.
- All internal Python imports use the package-local `backend.*` namespace, which resolves to `apps/api/backend/` when `uvicorn` runs from `apps/api/`.
- No `PYTHONPATH` manipulation or absolute filesystem imports to root `backend/` were detected.

---

## 2. Authentication Duplication

### Finding AUTH-01 — Two independent auth stacks

| Stack | Location | Technology | Classification |
|---|---|---|---|
| Production auth | `apps/web/src/lib/server/auth.ts`, `pageAuth.ts`, `auth-token.ts`, `jwt.ts`, `app/api/auth/*` | Cookie + JWT, Prisma-backed | Production |
| Python API auth | `apps/api/backend/core/security.py`, `api/deps.py`, `api/routers/auth.py` | Bearer + JWT, SQLAlchemy-backed | Parallel / Legacy |
| Legacy Python auth | `backend/core/security.py`, `api/deps.py`, `api/routers/auth.py` | Bearer + JWT, weaker validation | Legacy / Dead Code |

- **Description:** The Next.js app performs its own session/cookie authentication. The Python backends also implement JWT verification and a login router, but there is no evidence that `apps/web` delegates auth to the Python backend. `backendProxy.ts` is defined but not imported by any production route.
- **Risk:** Secret/algorithm drift; two token issuers; weaker Python backend could be deployed accidentally.
- **Impact:** High — auth bugs affect every protected route.
- **Recommendation:** Keep Next.js auth as single source of truth. Consolidate Python backends to `apps/api/backend/` and decide whether Python needs its own auth or should call `/api/auth/me`.
- **Priority:** P0
- **Estimated effort:** 1–2 days

---

## 3. Configuration Loading Duplication

### Finding CFG-01 — Multiple env validators

| Location | Validates | Classification |
|---|---|---|
| `apps/web/src/lib/config/env-validation.ts` + `instrumentation.ts` | `DATABASE_URL*`, `JWT_SECRET_KEY`, `PUBLIC_LINK_TOKEN_PEPPER`, `WATHIQ_STEP_UP_SECRET` | Production |
| `apps/api/backend/main.py` | `JWT_SECRET_KEY`, `PUBLIC_LINK_TOKEN_PEPPER` | Parallel |
| `backend/main.py` | None | Legacy |
| `apps/web/src/lib/server/runtime-health.ts` | `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (unused keys) | Dead code |
| Root `.env.example` | Overlapping blocks, real-looking GUIDs | Documentation debt |

- **Description:** Required secrets are validated in Next.js and partially in the production Python backend. The legacy `backend/main.py` has no validation. Dead NextAuth keys remain in a runtime-health validator.
- **Risk:** Inconsistent required-secret enforcement; placeholder secrets may reach production.
- **Impact:** Medium-High — misconfiguration can fail the web app while the API starts silently.
- **Recommendation:** Align Python startup validation with Next.js; remove NextAuth ghost keys; sanitize `.env.example`.
- **Priority:** P1
- **Estimated effort:** 0.5–1 day

---

## 4. Database Access Duplication

### Finding DB-01 — Two ORMs on the same database

| Layer | Location | ORM / Tool | Classification |
|---|---|---|---|
| Production | `apps/web/src/lib/server/prisma.ts` | Prisma | Production |
| Canonical schema | `apps/web/prisma/schema.prisma` | Prisma schema | Production |
| Parallel | `apps/api/backend/core/database.py`, `models/` | SQLAlchemy | Parallel |
| Parallel | `backend/core/database.py`, `models/` | SQLAlchemy | Legacy |
| Stale schema | `prisma/schema.prisma` | Prisma | Legacy |
| Stale schema | `frontend/prisma/schema.prisma` | Prisma | Legacy |

- **Description:** Prisma is the production ORM and owns the canonical schema and migrations. The Python backends use SQLAlchemy models and `Base.metadata.create_all()` on startup, which can create tables outside Prisma migration control. Three divergent Prisma schemas exist.
- **Risk:** Schema drift; migration conflicts; tables created outside Prisma control.
- **Impact:** High — threatens data integrity.
- **Recommendation:** Keep Prisma as single source of truth; remove `Base.metadata.create_all()` from Python startup; archive root and frontend Prisma schemas.
- **Priority:** P0 (stop auto-create), P1 (schema consolidation)
- **Estimated effort:** 1–3 days

---

## 5. Audit Logic Duplication

### Finding AUD-01 — Three audit implementations

| Implementation | Location | Persistence | Classification |
|---|---|---|---|
| Production audit | `apps/web/src/lib/server/saas-services.ts` + `audit-chain-service.ts` | Prisma `auditLog` + `auditChainEvent` | Production |
| Python audit (production path) | `apps/api/backend/audit/audit_logger.py` | In-memory list only | Parallel / Dead code |
| Python audit (legacy path) | `backend/audit/audit_logger.py` | In-memory list only | Legacy / Dead code |

- **Description:** Next.js writes a persistent, hash-chained audit trail. Both Python audit loggers store entries only in memory and lose them on process restart.
- **Risk:** Non-compliant audit trail; inconsistent semantics.
- **Impact:** Medium-High — medico-legal evidence requires durable audit.
- **Recommendation:** Delete Python in-memory audit loggers; if Python needs audit, call the Prisma-backed service or a shared audit API.
- **Priority:** P1
- **Estimated effort:** 0.5–1 day

---

## 6. Frontend Duplication

### Finding FE-01 — Legacy Next.js frontend

| App | Path | Workspace | Status |
|---|---|---|---|
| Production | `apps/web/` | Yes | Live |
| Legacy | `frontend/` | No | Dead code |
| Legacy | `frontend-angular/` | No | Dead code |

- **Description:** `frontend/` duplicates `apps/web/` domain logic, uses the same package name, and is not in root workspaces. `frontend-angular/` is an unmaintained Angular app.
- **Risk:** Package-name collision; stale code; accidental deployment.
- **Impact:** Medium — maintenance burden and confusion.
- **Recommendation:** Archive or delete `frontend/` and `frontend-angular/` after confirming no unique assets are needed.
- **Priority:** P1
- **Estimated effort:** 0.5–1 day

---

## 7. Internal `apps/web/src/lib/server` Aliases

### Finding ALIAS-01 — snake_case re-export wrappers

- **Description:** Several modules exist in both kebab-case and snake_case forms in the same directory (e.g., `audit-chain-service.ts` + `audit_chain_service.ts`, `consent-service.ts` + `consent_service.ts`).
- **Risk:** Import inconsistency; maintenance noise.
- **Impact:** Low.
- **Recommendation:** Remove snake_case aliases and update imports to kebab-case canonical files.
- **Priority:** P2
- **Estimated effort:** 0.5 day

---

## Summary Table

| ID | Finding | Classification | Recommendation | Priority | Effort |
|---|---|---|---|---|---|
| BE-01 | Root `backend/` is stale mirror of `apps/api/backend/` | Legacy / Dead Code | Delete later (post-RC1) after tooling audit | P1 | 1–2 days |
| AUTH-01 | Two independent auth stacks (Next.js + Python) | Parallel / Legacy | Keep Next.js; consolidate Python auth decision | P0 | 1–2 days |
| CFG-01 | Multiple env validators + dead NextAuth keys | Duplication / Dead code | Align validators; remove NextAuth ghosts | P1 | 0.5–1 day |
| DB-01 | Prisma + SQLAlchemy + 3 Prisma schemas | Duplication / Legacy | Keep Prisma; stop SQLAlchemy auto-create; archive stale schemas | P0/P1 | 1–3 days |
| AUD-01 | In-memory Python audit vs Prisma audit | Parallel / Dead code | Delete Python audit loggers | P1 | 0.5–1 day |
| FE-01 | `frontend/` and `frontend-angular/` legacy apps | Legacy / Dead code | Archive or delete | P1 | 0.5–1 day |
| ALIAS-01 | snake_case re-export wrappers | Duplication | Remove aliases | P2 | 0.5 day |
