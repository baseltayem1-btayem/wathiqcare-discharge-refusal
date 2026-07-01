# RC1 Gate 1.2 — 05 Risk Analysis

**Scope:** Risks associated with the current architecture and the proposed cleanup plan.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

The current architecture has a clear production path, but several structural risks could destabilize RC1 or introduce security/compliance gaps. The highest risks are: (1) unauthenticated prototype routes reachable in production, (2) production-unsafe env-gated bypasses, (3) two Python backends creating deployment ambiguity, (4) SQLAlchemy auto-creating tables outside Prisma control, and (5) in-memory audit loggers in the Python backend. The cleanup plan mitigates these risks without redesigning business workflows.

---

## Risk Register

### RISK-01 — Unauthenticated Prototype Routes Reachable in Production

| Field | Details |
|---|---|
| **Description** | `apps/web/src/app/prototype/clinical-workspace-2/` is mounted as a public route with no auth, feature flag, or middleware isolation. It simulates a full physician informed-consent workflow with patient signatures. |
| **Likelihood** | High — any user can navigate to `/prototype/clinical-workspace-2`. |
| **Impact** | High — reputational/compliance risk; non-production clinical UX exposed; no audit trail. |
| **Affected areas** | Public route exposure, consent workflow perception, compliance audit. |
| **Mitigation** | Remove the route or guard it with `APP_ENV !== "production"` middleware before RC1. |
| **Priority** | P0 |
| **Effort** | 2–4 h |

---

### RISK-02 — Production-Unsafe Env-Gated Bypasses

| Field | Details |
|---|---|
| **Description** | `TEMP_TENANT_ADMIN_INACTIVE_BYPASS`, `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED`, `FEATURE_AUTHORITATIVE_PILOT_ALLOW_PRODUCTION`, and `WATHIQCARE_PDF_ENGINE_PREVIEW_ENABLED` can enable experimental/bypass behavior in production via environment variables. |
| **Likelihood** | Medium — depends on env misconfiguration. |
| **Impact** | High — inactive tenants could retain admin access; patient OTPs could be redirected; non-evidentiary PDFs could be generated. |
| **Affected areas** | Authentication, OTP/SMS routing, PDF evidence integrity. |
| **Mitigation** | Remove bypasses or hard-code `!isProduction()` guards; sanitize `.env.example` and production templates. |
| **Priority** | P0 |
| **Effort** | 1–2 days |

---

### RISK-03 — Two Python Backends Create Deployment Ambiguity

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/` and root `backend/` are nearly identical. The root copy is stale, missing security hardening, newer migrations, and services. Deployment tooling or developers may target the wrong directory. |
| **Likelihood** | Medium — root `backend/` is still present in the repo. |
| **Impact** | High — deploying `backend/` would disable runtime secret validation, rate limiting, RBAC, and newer endpoints. |
| **Affected areas** | Backend deployment, security posture, operational consistency. |
| **Mitigation** | Verify no tooling references root `backend/`; schedule deletion post-RC1; add CI guardrail. |
| **Priority** | P1 |
| **Effort** | 1–2 days |

---

### RISK-04 — SQLAlchemy Auto-Creates Tables Outside Prisma Control

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/init_db.py` and `backend/init_db.py` call `Base.metadata.create_all()` on startup, which can create tables/columns independently of Prisma migrations. |
| **Likelihood** | Medium — occurs whenever the Python backend starts. |
| **Impact** | High — schema drift, migration conflicts, data-integrity issues. |
| **Affected areas** | Database schema, migrations, production data. |
| **Mitigation** | Remove `create_all()` calls; rely on Prisma migrations as the single schema source of truth. |
| **Priority** | P0 |
| **Effort** | 0.5 day |

---

### RISK-05 — In-Memory Python Audit Loses Evidence on Restart

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/audit/audit_logger.py` and `backend/audit/audit_logger.py` store audit entries in a Python list that is lost when the process restarts. |
| **Likelihood** | Certain on every deploy/restart. |
| **Impact** | High — non-compliant audit trail for medico-legal evidence. |
| **Affected areas** | Audit/evidence compliance, legal defensibility. |
| **Mitigation** | Delete Python audit loggers; route audit events through the Prisma-backed Next.js audit service. |
| **Priority** | P1 |
| **Effort** | 0.5–1 day |

---

### RISK-06 — Legacy Frontend Apps Cause Package-Name Collision

| Field | Details |
|---|---|
| **Description** | `frontend/package.json` uses the same name as `apps/web/package.json` (`@wathiqcare/web`) and is not in root workspaces. `frontend-angular/` is also unmaintained. |
| **Likelihood** | Low-Medium — tooling may accidentally resolve the wrong package. |
| **Impact** | Medium — stale code, deployment confusion, build noise. |
| **Affected areas** | Workspace tooling, CI/CD, developer onboarding. |
| **Mitigation** | Archive or delete `frontend/` and `frontend-angular/` after asset review. |
| **Priority** | P1 |
| **Effort** | 0.5–1 day |

---

### RISK-07 — Type-Safety Bypass via Prisma Enum Shim

| Field | Details |
|---|---|
| **Description** | `apps/web/src/types/prisma-enum-compat.d.ts` widens all Prisma enums to `string` and is paired with `typescript.ignoreBuildErrors: true` in `next.config.ts`. |
| **Likelihood** | Certain — active on every build. |
| **Impact** | High — type regressions reach production silently; invalid enum values may be passed to Prisma. |
| **Affected areas** | Type safety, runtime data integrity, build quality. |
| **Mitigation** | Remove the shim and fix cast sites; flip `ignoreBuildErrors` to `false`. |
| **Priority** | P0 |
| **Effort** | 8–16 h |

---

### RISK-08 — Inconsistent Environment Validation Between Stacks

| Field | Details |
|---|---|
| **Description** | Next.js validates `DATABASE_URL*`, `JWT_SECRET_KEY`, `PUBLIC_LINK_TOKEN_PEPPER`, `WATHIQ_STEP_UP_SECRET`; Python validates only two of these; root `backend/` validates none. Dead NextAuth keys remain in `runtime-health.ts`. |
| **Likelihood** | Medium — depends on deployment configuration. |
| **Impact** | Medium — the API could start with missing/placeholder secrets while the web app fails, leading to confusing outages. |
| **Affected areas** | Startup reliability, operational debugging. |
| **Mitigation** | Align required-secret sets; remove NextAuth ghost keys; sanitize `.env.example`. |
| **Priority** | P1 |
| **Effort** | 0.5–1 day |

---

### RISK-09 — Prototype Version String in Evidence Artifacts

| Field | Details |
|---|---|
| **Description** | `apps/web/src/lib/projection/unified-disclosure-projection.ts` uses `DEFAULT_VERSION = "prototype-v1"`. |
| **Likelihood** | High — used by disclosure/projection logic. |
| **Impact** | Medium — legal evidence may be challenged if labeled as prototype. |
| **Affected areas** | Legal evidence, PDF/disclosure artifacts. |
| **Mitigation** | Update to an approved production version string. |
| **Priority** | P1 |
| **Effort** | 30 min |

---

### RISK-10 — Cleanup Deletion Risks

| Field | Details |
|---|---|
| **Description** | Deleting root `backend/`, `frontend/`, or SQLAlchemy models may remove files still referenced by undocumented scripts, old deployments, or developer workflows. |
| **Likelihood** | Low-Medium — depends on tooling audit thoroughness. |
| **Impact** | Medium — broken scripts or lost unique assets. |
| **Affected areas** | CI/CD, local developer workflows, archived assets. |
| **Mitigation** | Perform tooling-reference audit before deletion; archive to `artifacts/` first; run full build/test suite after removal. |
| **Priority** | P2 |
| **Effort** | 1–2 days |

---

## Risk Summary Matrix

| Risk | Severity | Likelihood | Priority | Status |
|---|---|---|---|---|
| RISK-01 Prototype routes exposed | High | High | P0 | Open |
| RISK-02 Env-gated bypasses | High | Medium | P0 | Open |
| RISK-03 Two Python backends | High | Medium | P1 | Open |
| RISK-04 SQLAlchemy auto-create | High | Medium | P0 | Open |
| RISK-05 In-memory audit | High | Certain | P1 | Open |
| RISK-06 Legacy frontend collision | Medium | Medium | P1 | Open |
| RISK-07 Prisma enum shim | High | Certain | P0 | Open |
| RISK-08 Inconsistent env validation | Medium | Medium | P1 | Open |
| RISK-09 Prototype version string | Medium | High | P1 | Open |
| RISK-10 Cleanup deletion risks | Medium | Low-Medium | P2 | Open |

---

## Mitigation Tracking

| Mitigation | Target Phase | Acceptance Criteria |
|---|---|---|
| Remove/guard prototype routes | Phase 1 | `/prototype/clinical-workspace-2` no longer reachable in production |
| Remove production-unsafe bypasses | Phase 1 | No env can activate bypass in production |
| Delete root `backend/` | Phase 2 planning / Phase 4 execution | No tooling references root `backend/`; CI green |
| Remove SQLAlchemy `create_all` | Phase 1 | Python backend starts without creating tables |
| Delete Python audit loggers | Phase 2 | Python backend no longer imports in-memory audit |
| Archive legacy frontends | Phase 2 | `frontend/` and `frontend-angular/` removed from active branch |
| Remove Prisma enum shim | Phase 1 | Build succeeds with `ignoreBuildErrors: false` |
| Align env validation | Phase 2 | Python validates same required secrets as Next.js |
| Update version string | Phase 2 | No "prototype-v1" remains in production paths |
