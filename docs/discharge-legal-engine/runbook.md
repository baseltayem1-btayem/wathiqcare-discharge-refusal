# Discharge Legal Workflow Engine — Runbook

Operational reference for engineers and on-call staff.

---

## Local Development

### Prerequisites

- Docker + Docker Compose (for PostgreSQL)
- Python 3.12 + venv
- Node.js 20+
- `.env` files at `apps/web/.env.local` and `apps/api/.env`

### Start everything

```bash
# 1. Start DB
docker compose up -d

# 2. Start API
cd apps/api
pip install -r requirements.txt
make migrate   # init DB schema
make seed      # optional sample data
make dev       # uvicorn on :8000

# 3. Start web (new terminal)
cd apps/web
npm install
npm run dev    # Next.js on :3000
```

### Run tests

```bash
# Backend
cd apps/api && pytest -q

# Frontend (lint)
cd apps/web && npm run lint
```

---

## Environment Variables

See `.env.example` at repo root and `apps/api/.env.example`.

Critical variables:

|`Variable`|`Required`|`Where`|
|---|---|---|
|`DATABASE_URL`|Yes|API|
|`JWT_SECRET`|Yes|API + Web|
|`PUBLIC_LINK_TOKEN_PEPPER`|Yes|API|
|`SMS_PROVIDER`|Yes|API|
|`APP_BASE_URL`|Yes|API (used in SMS link)|
|`NEXT_PUBLIC_API_URL`|Yes|Web|

---

## Deployment

> ⚠️ **Non-Production Environments Only**
> Current deployments to Railway (API) and Vercel (web) are **non-production validation
> environments** used for system integration testing and smoke checks.
> They **do not** constitute a production release and **do not** override the
> "NO-GO for production cutover" decision.
> See [`docs/deployment-status.md`](../deployment-status.md) for the full production release gate.

### Web (Vercel)

The root `vercel.json` is pre-configured:

```text
buildCommand:  npm --prefix apps/web run build
installCommand: npm --prefix apps/web install
outputDirectory: apps/web/.next
```

Set all environment variables in the Vercel dashboard under the project settings.

### API (Railway / AWS)

```bash
cd apps/api
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Set `DATABASE_URL`, `REDIS_URL`, and all secrets as environment variables on the host.

### Controlled Rollout

Controlled rollout artifacts are maintained under `docs/governance/`.

- `phased-rollout-plan.md` defines the three-phase rollout path
- `controlled-uat-execution-record.md` is the execution record for the UAT environment
- `limited-rollout-execution-record.md` is the execution record for the limited rollout wave
- `full-production-activation-checklist.md` is the final activation gate

For UAT and limited rollout environments, onboarding must be invite-only. Do not expose public self-registration during controlled rollout. The repository contains a password-signup route, so ingress or edge controls must block public use of `POST /api/auth/password/signup` in controlled environments.

---

## Common Issues

### Token access denied — `TOKEN_INVALID`

- Check that `PUBLIC_LINK_TOKEN_PEPPER` matches between the environment that created the session and the one serving the request.
- Verify token has not been URL-encoded or truncated in the SMS delivery.

### SMS not delivered

1. Check `notifications` table: `delivery_status`, `failure_reason`.
2. Verify `SMS_PROVIDER=taqnyat` and `SMS_ENABLED=true`.
3. Verify `SMS_BASE_URL`, `SMS_BEARER_TOKEN`, and `SMS_SENDER` are set correctly.
4. If SMS fails and `email` is present on the session, a fallback email job is enqueued automatically.

### PDF not generating

1. Check that the PDF worker process is running (Celery / background task).
2. Check S3 credentials: `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`.
3. Check `discharge_documents.status` — if stuck at `pending_signature`, the signature step was not completed.
4. Admin can trigger a PDF regeneration from the session detail page.

### Payment stuck in `checkout_created`

1. Verify the webhook endpoint is reachable by the provider (check firewall / proxy).
2. Recheck `STRIPE_WEBHOOK_SECRET` / `HYPERPAY_ACCESS_TOKEN`.
3. Manually verify payment in provider dashboard, then update `payments.status = 'completed'` and re-trigger workflow via admin action.

---

## Monitoring

- All API requests log a `correlation_id` header (`X-Request-ID`).
- Structured JSON logs emitted to stdout; collect with your log aggregator.
- Failed SMS, PDF, payment events surface in the admin notification/payment logs.
- Critical errors raise `500` with a sanitised message (no stack traces to client).
- For the validated rollout baseline, monitor authentication failures, OTP failures, OTP replay attempts, secure-link failures, PDF generation failures, legal-package generation failures, audit write failures, storage failures, and API 500 errors.
- Web log access should be retained through the frontend hosting log console, API log access through the backend hosting log console, and both surfaces should be searchable by timestamp, route, event name, tenant, and case where available.

---

## Manual SMS Verification

Use a platform admin bearer token and call the backend API directly.

```bash
# 1) Provider health/status
curl -X GET "$API_BASE_URL/api/sms/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 2) Send a test SMS
curl -X POST "$API_BASE_URL/api/sms/test" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"+9665XXXXXXXX","message":"WathiqCare SMS production test"}'
```

Expected log events:

- `sms_send_requested`
- `sms_send_succeeded`
- `sms_send_failed` (only on error paths, with status and attempt metadata)

---

## Data Retention

- Audit logs: permanent (legal requirement).
- Signed PDFs: permanent in S3 (legal archive).
- Notification message bodies: retain 90 days, then truncate.
- Session tokens (hash only): purge after 30 days post-completion.

## UAT Database Checks

Use a real UTF-8 PostgreSQL database for controlled UAT.

Encoding check:

```sql
SELECT current_database() AS database_name, pg_encoding_to_char(encoding) AS encoding
FROM pg_database
WHERE datname = current_database();
```

Backup and restore drill example:

```bash
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="wathiqcare-uat-YYYYMMDD.dump"
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" "wathiqcare-uat-YYYYMMDD.dump"
```
