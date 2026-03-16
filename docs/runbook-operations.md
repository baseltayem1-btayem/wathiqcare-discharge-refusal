# Runbook Operations

## Purpose
Operational runbook for deploying and operating WathiqCare Stage 4 hardened stack in production.

## Stack Components
- frontend (Next.js)
- api (backend-nest)
- postgres
- redis
- minio (+ minio-init)

Primary deployment file:
- docker-compose.prod.yml

## Pre-Deployment Checklist
1. Create a production env file from template:
   - cp .env.prod.example .env.prod
2. Replace all placeholder secrets in .env.prod.
3. Confirm DNS/TLS and reverse proxy pathing to frontend and backend.
4. Confirm persistent storage for database and object storage volumes.

## Deploy Procedure
From repository root:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod pull
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Check service status:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

## Health and Readiness Checks
Backend:

```bash
curl -sf http://localhost:4000/api/health/live
curl -sf http://localhost:4000/api/health/ready
curl -sf http://localhost:4000/api/health
```

Frontend:

```bash
curl -sf http://localhost:3000/api/health
```

Expected behavior:
- /health/live returns HTTP 200 when process is alive.
- /health/ready returns HTTP 200 only when dependencies are ready.
- /health may return HTTP 503 if readiness checks fail.

## Logs and Troubleshooting
Tail logs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f frontend
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f postgres
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f redis
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f minio
```

Quick triage map:
- API fails to start:
  - Check env validation errors in api logs.
  - Check strict readiness failure event details.
- Readiness fails on database:
  - Validate DB credentials and postgres health.
- Readiness fails on redis:
  - Validate REDIS_URL and redis password.
  - In production, OTP memory fallback must remain false.
- Readiness fails on object storage:
  - Validate S3_* values and minio health.

## Routine Operations
### Restart a Single Service

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod restart api
```

### Restart Entire Stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod down
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Apply Backend Schema Migrations
Migrations run at backend startup. For controlled rollout:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api npx prisma migrate deploy
```

Then restart api.

## Secret Rotation
1. Update rotated secrets in .env.prod.
2. Restart affected services.
3. Verify auth/session behavior after JWT rotation.
4. Confirm readiness endpoints are healthy.

## Smoke Test After Deployment
1. Login via frontend.
2. Open cases list.
3. Open one case details view.
4. Validate document listing and legal notes access by role.
5. Trigger one allowed workflow transition and confirm audit entry.

## Rollback Procedure
1. Identify last known-good image tags.
2. Update compose image references or rebuild from previous commit.
3. Run:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod down
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

4. Re-run health and smoke tests.

## Operational Notes
- Local helper script run_local.sh is now aligned with backend-nest as primary backend.
- Validation helper check_all.sh now validates backend-nest build/tests first, then frontend checks.
