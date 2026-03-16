# Production Cutover Checklist

Date: 2026-03-16
Scope: Pre-Go-Live Operational Freeze

## Go/No-Go Preconditions
- [ ] No unresolved code-level launch blockers.
- [ ] Latest frontend production build passed.
- [ ] Backend build and tests passed.
- [ ] All production secrets populated with non-placeholder values.
- [ ] Backup jobs enabled and restore drill validated.
- [ ] On-call roster confirmed for first 24 hours.

## T-7 Days
- [ ] Confirm final approved image tags for frontend and api.
- [ ] Confirm DNS, TLS certificates, and reverse proxy routes.
- [ ] Confirm production data retention and audit logging policy.
- [ ] Confirm incident commander, comms lead, and approvers.

## T-24 Hours
- [ ] Run full production compose config interpolation check.
- [ ] Capture pre-cutover backup snapshot (DB + object storage).
- [ ] Confirm no pending schema or migration surprises.
- [ ] Freeze repository for release branch content.

## T-2 Hours
- [ ] Announce start of cutover window to stakeholders.
- [ ] Validate infrastructure quotas and host capacity.
- [ ] Pre-pull/build images on target hosts.
- [ ] Confirm rollback target image tags are available.

## T-0 Cutover Execution
1. Bring up production stack:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

2. Verify service health:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
curl -sf http://localhost:4000/api/health/ready
curl -sf http://localhost:3000/api/health
```

3. Execute smoke tests:
- [ ] Login flow.
- [ ] Case list and case detail open correctly.
- [ ] Document list/download access behaves by role.
- [ ] One end-to-end refusal workflow transition recorded with audit trace.

## T+30 Minutes Stabilization
- [ ] Error rate remains below agreed threshold.
- [ ] No repeated 5xx bursts in frontend/api logs.
- [ ] Redis, Postgres, and MinIO health remain green.

## Rollback Criteria
Rollback is mandatory if any of the following persists beyond 15 minutes:
- Backend readiness endpoint remains unhealthy.
- Frontend cannot reach backend for SSR proxy routes.
- Login/session flows fail for authorized users.
- Data integrity or document access violations are observed.

## Rollback Procedure
1. Stop current stack:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod down
```

2. Deploy last known-good images.
3. Bring stack up and rerun health and smoke checks.
4. Publish stakeholder update with rollback status and next maintenance window.

## Cutover Sign-offs
- Technical approval: Platform SRE lead.
- Security approval: Security lead.
- Clinical operations approval: Hospital operations lead.
- Product approval: Product owner.
