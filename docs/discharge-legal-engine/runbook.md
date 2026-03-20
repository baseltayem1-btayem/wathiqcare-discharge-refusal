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
| Variable | Required | Where |
|----------|----------|-------|
| `DATABASE_URL` | Yes | API |
| `JWT_SECRET` | Yes | API + Web |
| `PUBLIC_LINK_TOKEN_PEPPER` | Yes | API |
| `SMS_PROVIDER` | Yes | API |
| `APP_BASE_URL` | Yes | API (used in SMS link) |
| `NEXT_PUBLIC_API_URL` | Yes | Web |

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
```
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

---

## Common Issues

### Token access denied — `TOKEN_INVALID`
- Check that `PUBLIC_LINK_TOKEN_PEPPER` matches between the environment that
  created the session and the one serving the request.
- Verify token has not been URL-encoded or truncated in the SMS delivery.

### SMS not delivered
1. Check `notifications` table: `delivery_status`, `failure_reason`.
2. Verify `SMS_PROVIDER` is set correctly (`taqnyat` or `unifonic`).
3. Check API key validity with the provider dashboard.
4. If SMS fails and `email` is present on the session, a fallback email
   job is enqueued automatically.

### PDF not generating
1. Check that the PDF worker process is running (Celery / background task).
2. Check S3 credentials: `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`.
3. Check `discharge_documents.status` — if stuck at `pending_signature`,
   the signature step was not completed.
4. Admin can trigger a PDF regeneration from the session detail page.

### Payment stuck in `checkout_created`
1. Verify the webhook endpoint is reachable by the provider (check firewall / proxy).
2. Recheck `STRIPE_WEBHOOK_SECRET` / `HYPERPAY_ACCESS_TOKEN`.
3. Manually verify payment in provider dashboard, then update
   `payments.status = 'completed'` and re-trigger workflow via admin action.

---

## Monitoring

- All API requests log a `correlation_id` header (`X-Request-ID`).
- Structured JSON logs emitted to stdout; collect with your log aggregator.
- Failed SMS, PDF, payment events surface in the admin notification/payment logs.
- Critical errors raise `500` with a sanitised message (no stack traces to client).

---

## Data Retention

- Audit logs: permanent (legal requirement).
- Signed PDFs: permanent in S3 (legal archive).
- Notification message bodies: retain 90 days, then truncate.
- Session tokens (hash only): purge after 30 days post-completion.
