# Risk Summary: Commit 43dff9d Controlled Review

## Scope
This summary covers architecture stabilization risks for modular routing, module APIs, and role/tenant access behavior. It excludes unrelated in-progress workspace changes.

| Risk Area | Classification | Why | Mitigation |
|---|---|---|---|
| Auth risk | Medium | Session/cookie claim interpretation drives route and API access decisions; misconfiguration can cause unexpected redirects or denied access. | Validate token claims in staging, run login/session regression suite, verify cookie names and expirations across environments before rollout. |
| RBAC risk | Medium | Module access depends on role-to-module mappings and server-side gate checks; incorrect mappings could over-grant or over-block. | Enforce centralized module catalog mapping, run role matrix tests per role, and require security sign-off on allowedRoles changes. |
| Tenant isolation risk | Medium | Module APIs rely on tenant-scoped context; any leak in scoping logic could cross tenant boundaries. | Keep tenant filter enforcement in all module services, add negative tests for cross-tenant reads/writes, and enable query/audit monitoring for tenant_id mismatches. |
| Audit/legal defensibility risk | Low-Medium | Medico-legal defensibility depends on preserving traceability and event sequencing through module workflows. | Preserve audit event generation and immutable records, verify legal package generation paths, and retain evidence logs per policy. |
| Discharge-refusal regression risk | Low | Existing discharge-refusal routes were explicitly preserved and validated in smoke/testing. | Maintain compatibility route checks in CI, keep baseline discharge tests mandatory for release gates. |
| Database migration risk | Medium | Promissory-notes module introduces schema dependencies that must exist before route/API usage. | Apply migration in controlled order, run pre/post migration health checks, and block traffic to affected routes until migration success is confirmed. |
| UI regression risk | Low-Medium | Shared shell and module portal changes may alter navigation assumptions for users. | Run smoke and role navigation tests, verify TrakCare-style layout consistency, and monitor first-session behavior after deployment. |
| Production deployment risk | Medium | Coordinated deployment of UI, API, and schema changes can fail if sequence or env parity drifts. | Use phased deployment, preflight checks, canary observation, explicit rollback trigger criteria, and on-call escalation readiness. |
