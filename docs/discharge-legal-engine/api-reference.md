# Discharge Legal Workflow Engine — API Reference

All public endpoints return `application/json`. Errors follow the
structure `{ "code": string, "message": string, "detail"?: any }`.

---

## Authentication

| Endpoint group | Auth method |
|----------------|-------------|
| `POST /api/discharge/session` | JWT Bearer (internal staff) |
| `GET/POST /api/public/…` | URL token (patient-facing) |
| `GET/PATCH /api/admin/…` | JWT Bearer (admin role) |
| `POST /api/integrations/…` | Static API key (`X-Api-Key` header) |
| `POST /api/payments/webhook/:provider` | HMAC signature verification |

---

## Internal — Session Creation

### `POST /api/discharge/session`

Creates a discharge session, generates a secure patient link, and
enqueues an SMS.

**Request body**
```json
{
  "patientId": "string",
  "encounterId": "string",
  "phone": "+966XXXXXXXXX",
  "email": "optional@email.com",
  "flags": {
    "standard": true,
    "homeCare": false,
    "equipment": false,
    "refusal": false
  },
  "paymentRequired": false,
  "paymentAmount": 0,
  "equipmentItems": [],
  "homeCarePlan": null,
  "liabilityTerms": null
}
```

**Response `201`**
```json
{
  "sessionId": "uuid",
  "secureUrl": "https://wathiqcare.com/d/<token>",
  "tokenExpiresAt": "2026-03-20T12:00:00Z"
}
```

**Errors**
| Code | Meaning |
|------|---------|
| `PATIENT_NOT_FOUND` | `patientId` does not exist |
| `ENCOUNTER_NOT_FOUND` | `encounterId` does not exist |
| `SESSION_ALREADY_ACTIVE` | Active session for encounter exists |
| `INVALID_PHONE` | Phone number not valid |

---

## Public Patient — Session Access

### `GET /api/public/discharge/session/:token`

Returns the public-safe session payload for the patient UI.

**URL params**: `token` — raw 96-char hex token from SMS link

**Response `200`**
```json
{
  "sessionId": "uuid",
  "patientFullNameAr": "اسم المريض",
  "encounterMrn": "MRN-001",
  "workflowStatus": "patient_opened_link",
  "accessStatus": "opened",
  "routingFlags": { "standard": true, "homeCare": true, "equipment": false, "refusal": false },
  "workflowSteps": [ ... ],
  "currentStep": "notice",
  "documents": [ ... ],
  "tokenExpiresAt": "2026-03-20T12:00:00Z"
}
```

**Errors**
| Code | Meaning |
|------|---------|
| `TOKEN_INVALID` | Token not found |
| `TOKEN_EXPIRED` | Token past expiry |
| `SESSION_LOCKED` | Too many failed attempts |
| `SESSION_COMPLETED` | Workflow already finished (safe redirect) |

---

### `POST /api/public/discharge/session/:token/verify`

OTP verification (optional, configurable per environment).

**Request body**
```json
{ "otp": "123456" }
```

**Response `200`**
```json
{ "verified": true }
```

---

### `POST /api/public/discharge/session/:token/forms/:type`

Submit form acknowledgment. `:type` is the kebab-case document type.

| `:type` value | Document |
|---------------|---------|
| `discharge-notice-acknowledgment` | Discharge notice |
| `home-care-agreement` | Home care agreement |
| `equipment-receipt-and-training-acknowledgment` | Equipment receipt |
| `refusal-of-discharge-and-financial-liability-acknowledgment` | Refusal liability |

**Request body**
```json
{
  "formType": "discharge_notice_acknowledgment",
  "acknowledged": true,
  "metadata": {}
}
```

**Response `200`**
```json
{
  "acknowledged": true,
  "nextStep": "home_care"
}
```

---

### `POST /api/public/discharge/session/:token/sign`

Submit the patient's electronic signature.

**Request body**
```json
{
  "signerName": "اسم المريض",
  "signerRole": "patient",
  "signatureDataUrl": "data:image/png;base64,...",
  "consentAccepted": true
}
```

**Response `200`**
```json
{
  "signatureId": "uuid",
  "documentId": "uuid",
  "pdfGenerationQueued": true
}
```

---

### `POST /api/public/discharge/session/:token/payment`

Initiate a payment checkout session.

**Request body**
```json
{ "method": "card" }
```

**Response `200`**
```json
{
  "paymentId": "uuid",
  "checkoutUrl": "https://pay.provider.com/checkout/xxx",
  "provider": "hyperpay"
}
```

---

### `GET /api/public/discharge/session/:token/document/:documentId/pdf`

Download the completed signed PDF.

**Response** `application/pdf` binary stream.

---

## Payment Webhook

### `POST /api/payments/webhook/:provider`

Called by the payment provider to notify of status changes.

**Behaviour**
- Validates HMAC signature against `STRIPE_WEBHOOK_SECRET` / provider key
- Updates `payments.status`
- Logs `payment_completed` audit event
- Unblocks workflow if blocked by payment

---

## Admin

### `GET /api/admin/discharge-sessions`

Query params: `status`, `dateFrom`, `dateTo`, `patientName`, `encounterId`, `page`, `limit`

### `GET /api/admin/discharge-sessions/:id`

Full session detail with relations.

### `GET /api/admin/discharge-sessions/:id/audit`

Returns list of `AuditLog` events ordered by `event_time`.

### `GET /api/admin/discharge-sessions/:id/documents`

Returns list of `DischargeDocument` records.

### `GET /api/admin/legal-documents/templates`

Lists all registered legal templates with version metadata.

### `PATCH /api/admin/legal-documents/templates/:id`

Publish or unpublish a template version.

### `GET /api/admin/notifications`

Query params: `status`, `channel`, `dateFrom`, `dateTo`

### `GET /api/admin/payments`

Query params: `status`, `provider`, `dateFrom`, `dateTo`

---

## Integration (EMR)

### `POST /api/integrations/emr/discharge-order-issued`

**Headers**: `X-Api-Key: <EMR_API_KEY>`

**Request body**: Same as `CreateSessionRequest` but with `externalPatientId` / `externalEncounterId`.

### `POST /api/integrations/emr/discharge-status-sync`

Push completion status back to the EMR. Body is the current `DischargeSession` payload.
