# WathiqCare Phased Rollout Plan

## Scope

This document defines the only approved rollout path for the validated WathiqCare baseline after production-readiness classification. It does not authorize uncontrolled full production deployment.

## Baseline

- Approved application baseline: `396cda6`
- Governance and rollout preparation must preserve the validated TrakCare-style interface and validated workflow behavior.

## Rollout Stages

### Phase 1: Controlled UAT Environment

Purpose:

- prove the validated release in a semi-production environment
- confirm HTTPS, UTF-8 database posture, monitored logging, controlled access, and release-gate behavior

Mandatory controls:

- HTTPS-only access for all public routes and secure links
- invite-only user creation
- no broad domain-based self-registration in the UAT exposure model
- real UTF-8 PostgreSQL database
- daily encrypted backup with documented restore path
- searchable logs for auth, OTP, secure-link, PDF, legal package, audit, storage, and API 500 failures

Go/no-go gate for Phase 2:

- production release gate passes against UAT
- no critical blockers in login, secure-link, OTP, audit, PDF, or legal package flows
- stakeholder UAT evidence recorded

### Phase 2: Limited Rollout

Purpose:

- restrict operational usage to a small approved group and monitor real user behavior under close supervision

Allowed users only:

- Legal Affairs
- selected physicians
- Medical Director
- Quality/Compliance

Mandatory controls:

- least-privilege role assignment
- invite-only onboarding
- access validation per role and route
- monitored first-use period with support ownership and escalation path

Go/no-go gate for Phase 3:

- operational observation period completed
- no critical or high incidents
- OTP, secure-link, PDF, legal package, backup, and audit controls remain stable
- stakeholder approvals completed

### Phase 3: Full Production Activation

Purpose:

- expand from limited rollout to full production activation only after operational stability is evidenced

Activation is blocked unless all of the following are true:

- observation period completed
- feedback cycle completed
- no unresolved critical or high incidents
- PDF and legal package generation remain stable
- OTP remains stable
- audit logging remains stable
- backup and restore are confirmed
- approvals are recorded from required stakeholders

## Required Environment Controls

### HTTPS

- `APP_BASE_URL`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_APP_BASE_URL` must use `https://`
- certificate must be valid and not expired
- browser validation must show no mixed-content warnings on login, dashboard, secure-link, PDF, and legal package flows
- secure links must be generated only with HTTPS origins

### Database

- PostgreSQL database encoding must be UTF-8
- recommended verification query:

```sql
SELECT current_database() AS database_name, pg_encoding_to_char(encoding) AS encoding
FROM pg_database
WHERE datname = current_database();
```

- backup region must remain in KSA-compatible hosted storage per deployment policy

### Access Control

- invite-based onboarding only via tenant/platform administrative flows
- do not expose or rely on open self-registration for UAT or limited rollout
- specifically block public use of `POST /api/auth/password/signup` at ingress, WAF, or environment routing for controlled rollout environments

### Monitoring

- retain timestamped logs from web and API surfaces
- keep logs searchable by event name, route, user, tenant, and case where available
- preserve access to Vercel web logs, Railway API logs, and any central aggregator if attached

## Release Gate Execution

Run the validated release harness against the target UAT environment after deployment and controlled user provisioning.

Example:

```powershell
$env:VALIDATION_BASE_URL = "https://uat.example.com"
$env:DATABASE_URL = "postgresql://..."
$env:BACKEND_API_BASE_URL = "https://api-uat.example.com"
node apps/web/scripts/prod-release-gate.cjs
```

## Default Recommendation Rule

- `HOLD` until Phase 1 evidence is captured and UAT passes
- `PROCEED WITH LIMITED ROLLOUT` only after Phase 1 passes and access controls are verified
- `PROCEED WITH FULL PRODUCTION ACTIVATION` only after Phase 2 observation and approvals complete
