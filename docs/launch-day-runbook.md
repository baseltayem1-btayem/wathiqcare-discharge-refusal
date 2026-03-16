# Launch Day Runbook

Date: 2026-03-16
Scope: Day-0 operations only

## Control Objectives
- Keep launch changes limited to deployment and operational controls.
- Detect and remediate launch blockers quickly.
- Preserve a safe rollback path at all times.

## Command Center Roles
- Incident commander: owns go/no-go and rollback decision.
- Platform operator: executes compose and infrastructure commands.
- Backend owner: validates API health and logs.
- Frontend owner: validates SSR/proxy behavior and user journeys.
- Security observer: confirms policy adherence and secret handling.

## Pre-Launch Gate (T-30)
- [ ] Confirm all items in production environment readiness checklist are complete.
- [ ] Confirm cutover checklist preconditions are complete.
- [ ] Confirm rollback image tags and backup references are documented.

## Launch Sequence (T-0 to T+20)
1. Start stack:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

2. Validate container health:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

3. Validate backend and frontend endpoints:

```bash
curl -sf http://localhost:4000/api/health/live
curl -sf http://localhost:4000/api/health/ready
curl -sf http://localhost:3000/api/health
```

4. Run smoke tests in order:
- Login.
- Cases list.
- Case detail.
- Document view/download by authorized role.
- One workflow transition with audit trace.

## Known Freeze-Phase Defect and Approved Fix
Defect observed during freeze:
- Production proxy safety rejected private/internal backend hosts too broadly.
- This blocked valid SSR-to-API calls when frontend targeted Docker internal host `api:4000`.

Approved narrow fix:
- Allow internal host targeting only when source variable is `BACKEND_NEST_API_BASE_URL`.
- Continue rejecting private/single-label hosts for broader external variables.
- Keep same-host loop protection to prevent recursive proxying.

## Backend URL Targeting Policy (Launch Guardrail)
Allowed in production:
- `BACKEND_NEST_API_BASE_URL=http://api:4000` inside Docker network.
- Explicit hospital external backend URLs when required by architecture.

Disallowed in production:
- `BACKEND_API_BASE_URL` or `BACKEND_URL` set to private/single-label hosts.
- Loopback/private values intended for local development.
- Any target that equals incoming frontend host (self-proxy loop risk).

## Live Monitoring Window (T+20 to T+120)
- Track API 5xx rate and latency.
- Track frontend route failures and SSR proxy errors.
- Track readiness stability for Postgres, Redis, and MinIO.
- Record checkpoints every 15 minutes in launch channel.

## Fast Triage Playbook
If frontend API routes fail with backend unavailable behavior:
1. Confirm `BACKEND_NEST_API_BASE_URL` is set to Docker internal API host.
2. Confirm `api` service is healthy and reachable on backend network.
3. Confirm no external variable overrides are forcing disallowed private hosts.
4. Restart frontend container only after env correction.

## Rollback Trigger
Trigger rollback if user-critical path remains broken after 15 minutes despite triage.

## Launch Completion Criteria
- No Sev-1 or Sev-2 incidents for first 2 hours.
- Core workflows stable and auditable.
- On-call handoff completed with status summary.
