# WathiqNote End-to-End Issuance Proof

## Production Run

**Date:** 2026-06-25  
**Domain:** https://wathiqcare.online  
**Route:** `/modules/wathiqnote`  
**Branch:** `feature/wathiqnote-route-activation` → merged to `main`  
**Production commit:** `2972ca4`  
**Vercel production deployment:** `wathiqcare-discharge-refusal-40gt33wsw-wathiqcare.vercel.app`

### Summary

Clicking the button **"إصدار السند وإرسال رابط التوقيع"** on the production WathiqNote workspace executes the full issuance chain:

1. `POST /api/modules/promissory-notes` → **HTTP 201 Created**
2. `POST /api/modules/promissory-notes/{id}/debtor-signing/start` → **HTTP 200 OK**

### Production Test Result

| Metric | Value |
|--------|-------|
| Test file | `apps/web/tests/e2e-issuance-screenshot.spec.ts` |
| Result | **1 passed (22.3s)** |
| Created note ID | `44737b59-01c0-4800-8c84-36e0ae1888b0` |
| Note number | `PN-20260625-2A88AC` |
| Create API status | **201** |
| Signing start API status | **200** |
| Signing URL | `https://wathiqcare.online/public-signing/promissory-note/...?lang=ar` |
| OTP | `213557` |
| Note status after issuance | `PENDING_OTP` |
| Link SMS status | **sent** |
| OTP SMS status | **sent** |

### Production Network Log

#### 1. Create Promissory Note

```http
POST https://wathiqcare.online/api/modules/promissory-notes HTTP/1.1
Content-Type: application/json
Cookie: wathiqcare_access_token=<tenant_admin_jwt>
```

```json
{
  "caseId": "f7ca657b-88ac-4c45-8fc6-306cbe3b0fb9",
  "debtorName": "محمد إبراهيم الراشدي",
  "debtorIdNumber": "1012345678",
  "issuerName": "International Medical Center",
  "amount": 5770,
  "currency": "SAR",
  "dueDate": "2026-06-25",
  "documentVersion": "1.0",
  "metadata": { "source": "wathiqnote-enterprise-workflow", ... }
}
```

**Response — HTTP 201**

```json
{
  "id": "44737b59-01c0-4800-8c84-36e0ae1888b0",
  "tenantId": "4549ed4b-b777-4364-9235-1841c7f5cb6d",
  "caseId": "f7ca657b-88ac-4c45-8fc6-306cbe3b0fb9",
  "noteNumber": "PN-20260625-2A88AC",
  "status": "ACTIVE",
  ...
}
```

#### 2. Start Debtor Signing

```http
POST https://wathiqcare.online/api/modules/promissory-notes/44737b59-01c0-4800-8c84-36e0ae1888b0/debtor-signing/start HTTP/1.1
Content-Type: application/json
Cookie: wathiqcare_access_token=<tenant_admin_jwt>
```

```json
{
  "debtorMobile": "+966 50 234 5678",
  "locale": "ar"
}
```

**Response — HTTP 200**

```json
{
  "id": "44737b59-01c0-4800-8c84-36e0ae1888b0",
  "noteNumber": "PN-20260625-2A88AC",
  "signingUrl": "https://wathiqcare.online/public-signing/promissory-note/<token>?lang=ar",
  "otp": "213557",
  "status": "PENDING_OTP",
  "linkSmsStatus": "sent",
  "otpSmsStatus": "sent",
  "expiresAt": "2026-06-25T01:30:54.692Z"
}
```

### SMS Gateway Production Configuration

Production environment variables are configured in Vercel:

- `TAQNYAT_API_KEY`
- `TAQNYAT_BEARER_TOKEN`
- `TAQNYAT_SENDER_NAME`
- `TAQNYAT_API_URL`
- `SMS_GATEWAY_URL`
- `SMS_GATEWAY_SECRET`
- `TAQNYAT_SMS_ENABLED`

The production test confirmed both the signing-link SMS and the OTP SMS returned status `sent` with Taqnyat provider message IDs recorded in the SMS audit log.

### Production Screenshots

- `production-send-signature-before.png` — Final "Issue & Send" step before clicking the button on wathiqcare.online.
- `production-issued-success.png` — UI after successful issuance showing note number, `PENDING_OTP` status, signing URL beginning with `https://wathiqcare.online/public-signing/promissory-note/`, and lifecycle actions.
- `production-network-log.png` — Styled network screenshot of the two API calls and their responses.

### Cleanup

The production test note (`44737b59-01c0-4800-8c84-36e0ae1888b0`) was deleted from the production database immediately after assertion.

---

## Local/Dev Run (for development validation)

**Date:** 2026-06-24  
**Environment:** Local Next.js dev server (`http://localhost:3003`) connected to preview Neon PostgreSQL  

| Metric | Value |
|--------|-------|
| Result | 1 passed (23.5s) |
| Created note ID | `bbfef5b5-7ee8-4054-bdab-b7132b614e24` |
| Signing URL | `http://localhost:3003/public-signing/promissory-note/...` |
| SMS statuses | `failed` (expected — no local SMS gateway) |

See `09-issued-success.png` and earlier screenshots for local UI proof.

---

## Validation

- `npm run lint` — 0 errors, pre-existing warnings only
- `npm run build` — exit code 0
- Production Playwright e2e test — **passed**
