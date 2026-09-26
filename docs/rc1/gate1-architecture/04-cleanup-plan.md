# RC1 Gate 1.2 — 04 Cleanup Plan

**Scope:** Safe, prioritized cleanup plan to eliminate architectural ambiguity before and after RC1.  
**Plan date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Constraints

- Do **not** delete code in Gate 1.2 (analysis and planning only).
- Do **not** merge to main.
- Do **not** deploy.
- Do **not** redesign business workflows.
- Do **not** modify WathiqNote, OTP, SMS, PDF, signing, or promissory-note flows.

All destructive actions are scheduled for post-RC1 or dedicated follow-up gates.

---

## Phase 1 — Pre-RC1 Critical Stabilization (P0)

| # | Item | Action | Owner | Effort | Constraint Check |
|---|---|---|---|---|---|
| 1.1 | Tenant-admin inactive bypass | Remove `TEMP_TENANT_ADMIN_INACTIVE_BYPASS` from `apps/web/src/lib/server/auth.ts` | Engineering | 1–2 h | Does not modify OTP/SMS/PDF/signing flows |
| 1.2 | Pilot email OTP override | Remove `pilot-email-override.ts` or guard with `!isProduction()` | Engineering | 2–4 h | OTP flow is protected, not redesigned |
| 1.3 | Prototype clinical workspace route | Remove `apps/web/src/app/prototype/clinical-workspace-2/` from production routes or add env-based middleware guard | Engineering | 2–4 h | Does not modify consent engine business logic |
| 1.4 | Prisma enum shim + `ignoreBuildErrors` | Remove `apps/web/src/types/prisma-enum-compat.d.ts` and set `typescript.ignoreBuildErrors: false` in `next.config.ts` | Engineering | 8–16 h | Type-level only; no workflow changes |
| 1.5 | SQLAlchemy auto-create | Remove `Base.metadata.create_all()` from `apps/api/backend/init_db.py` and `backend/init_db.py` | Engineering | 0.5 day | DB access change only; no business logic |

---

## Phase 2 — Pre-RC1 High-Priority Cleanup (P1)

| # | Item | Action | Owner | Effort | Constraint Check |
|---|---|---|---|---|---|
| 2.1 | Root `backend/` legacy mirror | Verify no tooling references root `backend/`; schedule deletion in post-RC1 hardening gate | Release Manager / DevOps | 1–2 days | No code deletion now |
| 2.2 | `frontend/` legacy Next.js app | Archive or schedule deletion after confirming no unique assets are needed | Engineering | 0.5–1 day | No deployment |
| 2.3 | `frontend-angular/` legacy app | Archive or schedule deletion | Engineering | 0.5 day | No deployment |
| 2.4 | `/landing-preview` orphan route | Remove route; promote `WathiqcareWhiteLanding` to `/` only after approval | Engineering | 1–2 h | Landing only |
| 2.5 | `/request-demo` orphan component | Add approved route or remove component and links | Engineering | 2–3 h | Landing only |
| 2.6 | Dead link `/preview/physician-workflow` | Delete `InformedConsentsModulePageNew.tsx` and `components/preview/physician-workflow/` | Engineering | 1–2 h | Does not modify production consent flow |
| 2.7 | Temporary server files | Delete `apps/web/src/lib/server/__tmp_*.ts` or rename and add tests | Engineering | 1–2 h | Does not modify WathiqNote/PDF flows |
| 2.8 | `_legacy-rejected` UI subtree | Archive `apps/web/src/components/informed-consents/_legacy-rejected/` | Engineering | 1 h | Dead code only |
| 2.9 | Env validation alignment | Align Python `main.py` required secrets with Next.js; remove NextAuth ghost keys from `runtime-health.ts` | Engineering | 0.5–1 day | Config only |
| 2.10 | Pilot governance env guard | Ensure pilot flags cannot activate in production; add runtime warnings | Engineering | 2–3 h | Config/governance only |
| 2.11 | PDF preview flag | Remove `WATHIQCARE_PDF_ENGINE_PREVIEW_ENABLED` or restrict to non-production | Engineering | 1–2 h | PDF flag only; no PDF engine change |
| 2.12 | UAT mock encounter public flag | Remove `NEXT_PUBLIC_ENABLE_UAT_DEMO_DATA`; keep server-only flags | Engineering | 2–3 h | Config only |
| 2.13 | `prototype-v1` version string | Update `DEFAULT_VERSION` in `unified-disclosure-projection.ts` to production version | Engineering | 30 min | Metadata only |
| 2.14 | Python in-memory audit | Delete `apps/api/backend/audit/audit_logger.py` and `backend/audit/audit_logger.py` | Engineering | 0.5–1 day | Audit utility only |

---

## Phase 3 — Post-RC1 Hardening (P2)

| # | Item | Action | Owner | Effort |
|---|---|---|---|---|
| 3.1 | Feature-flag governance | Standardize naming (`FF_` / `NEXT_PUBLIC_FF_`), document GA status, remove non-RC1 flags | Engineering | 4–8 h |
| 3.2 | Dynamic-consent pilot allow-lists | Move allow-lists from code to DB/secure config; remove query-parameter activation | Engineering | 4–6 h |
| 3.3 | Snake_case module aliases | Remove `apps/web/src/lib/server/*_service.ts` wrappers and update imports | Engineering | 0.5 day |
| 3.4 | `experimental.cpus` in `next.config.ts` | Remove unless justified by a known build bug | Engineering | 15 min |
| 3.5 | Underscore-prefixed figma example | Move `components/figma/_example-HeroSection.tsx` to storybook/examples or delete | Engineering | 30 min |
| 3.6 | Resolve TODOs/FIXMEs | Address TODOs in production paths or document as backlog | Engineering | 4–8 h |
| 3.7 | Consolidate Python auth decision | Decide if Python backend needs auth; if so, delegate to Next.js `/api/auth/me` or share a canonical JWT verifier | Architecture | 0.5–1 day |
| 3.8 | Archive stale Prisma schemas | Delete `prisma/schema.prisma` and `frontend/prisma/schema.prisma` after diff review | Engineering | 0.5 day |

---

## Phase 4 — Post-RC1 Structural Deletion (P3)

| # | Item | Action | Owner | Effort |
|---|---|---|---|---|
| 4.1 | Delete root `backend/` | After confirming no deployment/tooling references it | Engineering | 1–2 h |
| 4.2 | Delete `frontend/` and `frontend-angular/` | After archiving any unique assets | Engineering | 1–2 h |
| 4.3 | Evaluate SQLAlchemy model layer | Remove or convert to read-only Prisma clients if Python backend is retained | Architecture | 2–5 days |
| 4.4 | Single config schema | Generate `.env.example` from a shared schema to prevent drift | Architecture | 1–2 days |

---

## Cleanup Priority Matrix

| Priority | Theme | Items |
|---|---|---|
| **P0** | Security / production safety | Tenant-admin bypass, pilot OTP override, prototype route exposure, Prisma enum shim, SQLAlchemy auto-create |
| **P1** | Dead code / legacy apps / env governance | Root `backend/`, `frontend/`, orphan routes, orphan components, temporary files, env alignment, pilot guards, audit logger deletion |
| **P2** | Polish / governance / tech debt | Feature flags, pilot allow-lists, module aliases, TODOs, config schema consolidation |
| **P3** | Structural deletion | Permanent removal of root `backend/`, `frontend/`, Angular app, SQLAlchemy layer |

---

## Estimated Total Effort

| Phase | Effort |
|---|---|
| Phase 1 (P0) | 2–4 engineering days |
| Phase 2 (P1) | 4–6 engineering days |
| Phase 3 (P2) | 3–5 engineering days |
| Phase 4 (P3) | 1–2 weeks |
| **Total** | **3–5 weeks** (spread across RC1 stabilization and post-RC1 hardening) |

---

## Verification Steps After Each Phase

1. `npm audit --audit-level=high` — 0 Critical/High.
2. `npm run test -w apps/web` — all tests pass.
3. `npm run build -w apps/web` — success.
4. `cd apps/api && uvicorn backend.main:app --host 0.0.0.0 --port 8000` — starts without errors.
5. Smoke checks on `/login`, `/modules`, `/modules/informed-consents`, `/modules/wathiqnote`, `/api/auth/me` — expected responses.
6. CI import-lint guardrail — no imports from deleted/archive paths.
