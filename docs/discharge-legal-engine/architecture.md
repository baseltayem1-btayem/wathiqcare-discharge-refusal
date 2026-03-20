# Discharge Legal Workflow Engine — Architecture Overview

## System Purpose

The Discharge Legal Workflow Engine enables Saudi hospitals to issue
legally defensible electronic discharge acknowledgments. Starting from a
discharge order issued in the EMR, the system delivers a tokenised
secure link to the patient, guides them through document acknowledgment and
signature on mobile, and produces an immutable signed PDF packet stored
with a full audit trail.

---

## High-Level Flow

```
EMR / Admin
    │
    ▼
POST /api/discharge/session  ──► DischargeSessionService
    │   creates session + token hash
    │
    ▼
NotificationService (SMS via Taqnyat / Unifonic)
    │   sends Arabic SMS with secure link
    │
    ▼
Patient opens: https://<domain>/d/<raw-token>
    │
    ▼
TokenVerificationGuard
    │   sha256(raw-token + pepper) == stored hash
    │   checks expiry, access status
    │
    ▼
WorkflowOrchestrator.getNextStep(session)
    │   resolves dynamic step sequence from routingFlags
    │
    ▼
Patient completes steps in order:
  1. Discharge Notice (always)
  2. Home Care Agreement (if flags.homeCare)
  3. Equipment Receipt (if flags.equipment)
  4. Refusal Liability  (if flags.refusal)
  5. Payment (if paymentRequired)
  6. Signature Capture
    │
    ▼
SignatureProofService
  - stores signature image in S3
  - computes sha256 hash
  - binds to session + document + IP + user-agent
    │
    ▼
PdfGenerationJob (async queue)
  - renders HTML template with variable injection
  - converts to PDF via WeasyPrint / wkhtmltopdf
  - stores PDF in S3, writes pdf_url + pdf_hash_sha256
    │
    ▼
AuditEngine — records every event listed below
    │
    ▼
AdminDashboard / EMR sync
```

---

## Module Map

| Module | Path | Responsibility |
|--------|------|----------------|
| Discharge Session | `apps/api/backend/modules/discharge_legal_workflow/` | Session creation, token generation, routing |
| Notification | `apps/api/backend/services/notification_service.py` | SMS / email dispatch abstraction |
| Token Access | `apps/api/backend/api/routers/` + guard middleware | Token validation, expiry, rate-limit |
| Workflow Routing | `apps/api/backend/core/discharge_workflow_service.py` | Step orchestration logic |
| Legal Forms | `apps/api/backend/forms/` + `packages/legal-templates/` | Template registry, variable injection |
| Signature Engine | `apps/api/backend/signature/` | Canvas sig capture, hashing, storage |
| PDF Generation | `apps/api/backend/forms/pdf_generator.py` | HTML → PDF pipeline |
| Audit & Evidence | `apps/api/backend/audit/` + `apps/api/backend/legal/` | Event logging, evidence bundles |
| Payment | `apps/api/backend/modules/discharge_legal_workflow/payment_service.py` | Provider abstraction |
| Admin | `apps/web/app/admin/` | Internal operations dashboard |
| Patient UI | `apps/web/app/(patient)/d/[token]/` | Mobile-first Arabic patient flow |
| Integration | `apps/api/backend/integration/emr_connector.py` | EMR trigger endpoints |
| Shared Types | `packages/types/` | Single source of truth for all DTOs |
| SDK | `packages/sdk/` | TypeScript API client for web + integrators |

---

## Data Flow — Token Security

```
1. GenerateSecureToken()  → 96-char hex raw token
2. hash(rawToken + PEPPER) → stored in discharge_sessions.token_hash
3. SMS contains link: /d/<rawToken>
4. On access: hash(incoming + PEPPER) == stored_hash → pass
5. Raw token never touches DB
6. All failed access attempts → audit_logs.token_access_denied
```

---

## Workflow Routing Priority

Given `routingFlags`:

```
if refusal  → include refusal_of_discharge_and_financial_liability_acknowledgment
if homeCare → include home_care_agreement
if equipment → include equipment_receipt_and_training_acknowledgment
always      → include discharge_notice_acknowledgment

Step sequence:
  discharge_notice → home_care? → equipment? → refusal? → payment? → sign → pdf → done
```

---

## Audit Events

Every event below is recorded in `audit_logs` with session_id, timestamp,
actor_type, ip_address, user_agent, and free-form metadata JSON.

| Event | Trigger |
|-------|---------|
| `session_created` | Internal session creation |
| `sms_queued` | SMS job enqueued |
| `sms_sent` | Provider confirms dispatch |
| `sms_failed` | Provider error |
| `email_sent` | Fallback email sent |
| `token_accessed` | Patient opens link |
| `token_access_denied` | Invalid / expired token |
| `otp_verified` | OTP check passed |
| `notice_viewed` | Discharge notice screen rendered |
| `form_viewed` | Any form step opened |
| `form_acknowledged` | Acknowledgment checkbox confirmed |
| `payment_session_created` | Checkout URL generated |
| `payment_completed` | Webhook confirmed payment |
| `signature_started` | Signature canvas opened |
| `signature_completed` | Signature submitted and stored |
| `pdf_generation_started` | PDF job dequeued |
| `pdf_generated` | PDF stored in S3 |
| `workflow_completed` | All steps done |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Python + FastAPI |
| ORM | SQLAlchemy (existing) |
| Queue | Celery / BullMQ (TBD) |
| Storage | AWS S3 / S3-compatible |
| PDF | WeasyPrint / wkhtmltopdf |
| Frontend | Next.js 16 + TypeScript + Tailwind CSS |
| Database | PostgreSQL 16 |
| Cache | Redis |
| SMS | Taqnyat (primary), Unifonic (fallback) |
| Email | Microsoft Graph |
| Payment | HyperPay (primary abstraction) |
| Deployment | Vercel (web) + Railway / AWS (api) |
