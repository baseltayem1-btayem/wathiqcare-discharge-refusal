# RC1 Gate 1.2 — 06 Final Verdict

**Scope:** Architecture cleanup analysis and planning for WathiqCare RC1.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Verdict

**PASS WITH OBSERVATIONS**

The production architecture is identifiable and the cleanup path is clear. No code was deleted, no deployments occurred, and no business workflows were redesigned during Gate 1.2. However, several P0 and P1 risks remain open and must be addressed before RC1 final.

---

## Summary of Findings

| Category | Count | Key Items |
|---|---|---|
| Production source of truth identified | 6 | `apps/web/`, `apps/api/backend/`, Next.js auth, Prisma schema, `saas-services.ts` audit, `env-validation.ts` config |
| Legacy / dead-code duplicates | 5 | Root `backend/`, `frontend/`, `frontend-angular/`, root `prisma/schema.prisma`, `frontend/prisma/schema.prisma` |
| Parallel implementations | 3 | Python auth, SQLAlchemy models, in-memory Python audit |
| Prototype/temp leakage | 10+ | `/prototype/clinical-workspace-2`, `/landing-preview`, pilot bypasses, `__tmp_*` files, `_legacy-rejected` subtree, Prisma enum shim |
| P0 risks | 5 | Prototype route exposure, env-gated bypasses, SQLAlchemy auto-create, Prisma enum shim, tenant-admin bypass, pilot OTP override |

---

## What Was Verified

1. **Production execution path:** `apps/web/` proxies via HTTP to `apps/api/backend/main.py` (port 8000). No production code imports Python modules directly.
2. **No cross-imports:** `apps/api/backend/` does not import from root `backend/`; `apps/web` does not import from either Python backend.
3. **Backend duplication:** `apps/api/backend/` is the hardened, current backend; root `backend/` is a stale mirror missing security features, migrations, and services.
4. **Auth duplication:** Production auth lives in `apps/web/src/lib/server/auth.ts` and `app/api/auth/*`. Python backends implement parallel JWT auth that is not consumed by the web app.
5. **DB duplication:** Prisma (`apps/web/prisma/schema.prisma`) owns the canonical schema; SQLAlchemy models in Python backends are partial mirrors and auto-create tables on startup.
6. **Audit duplication:** Production audit is Prisma-backed in `apps/web/src/lib/server`; Python audit loggers are in-memory only.
7. **Prototype leakage:** Multiple prototype routes, preview components, and env-gated pilot paths are reachable or activatable in production.

---

## Required Actions Before RC1 Final

### P0 — Must Complete

1. Remove or middleware-guard `/prototype/clinical-workspace-2`.
2. Remove `TEMP_TENANT_ADMIN_INACTIVE_BYPASS` from `apps/web/src/lib/server/auth.ts`.
3. Remove or production-block `pilot-email-override.ts`.
4. Remove `Base.metadata.create_all()` from Python `init_db.py` files.
5. Remove `apps/web/src/types/prisma-enum-compat.d.ts` and set `typescript.ignoreBuildErrors: false` after fixing cast sites.

### P1 — Strongly Recommended

1. Verify no tooling references root `backend/`; schedule deletion post-RC1.
2. Archive or delete `frontend/` and `frontend-angular/`.
3. Remove `/landing-preview`, `/request-demo` orphan component, and `/preview/physician-workflow` dead links.
4. Delete `apps/web/src/lib/server/__tmp_*.ts` and archive `_legacy-rejected` subtree.
5. Align Python env validation with Next.js; remove NextAuth ghost keys.
6. Delete Python in-memory audit loggers.
7. Remove or production-block `WATHIQCARE_PDF_ENGINE_PREVIEW_ENABLED` and `NEXT_PUBLIC_ENABLE_UAT_DEMO_DATA`.
8. Update `prototype-v1` version string to production value.

### P2 — Post-RC1 Hardening

1. Standardize and document feature flags.
2. Move dynamic-consent pilot allow-lists to secure config.
3. Remove snake_case module aliases in `apps/web/src/lib/server/`.
4. Resolve remaining TODOs/FIXMEs in production paths.

---

## Constraints Respected

- ✅ No code deleted in Gate 1.2.
- ✅ No merge to main.
- ✅ No deployment.
- ✅ No business workflow redesign.
- ✅ No modifications to WathiqNote, OTP, SMS, PDF, signing, or promissory-note flows.

---

## Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Release Manager | — | 2026-06-26 | Pass with observations |
| Security Lead | — | — | Review required |
| Engineering Lead | — | — | Review required |
| Architecture Lead | — | — | Review required |

**Gate 1.2 status:** Analysis complete. Proceed to P0 remediation before RC1 final.
