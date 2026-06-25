# WathiqNote End-to-End Issuance Proof

**Date:** 2026-06-24  
**Environment:** Local Next.js dev server (`http://localhost:3003`) connected to preview Neon PostgreSQL  
**Branch:** `feature/wathiqnote-route-activation`  

## Summary

Clicking the button **"إصدار السند وإرسال رابط التوقيع"** in the WathiqNote enterprise workflow now successfully executes the full issuance chain:

1. `POST /api/modules/promissory-notes` → **HTTP 201 Created**
2. `POST /api/modules/promissory-notes/{id}/debtor-signing/start` → **HTTP 200 OK**

## Test Run Result

| Metric | Value |
|--------|-------|
| Test file | `apps/web/tests/e2e-issuance-screenshot.spec.ts` |
| Result | **1 passed (23.5s)** |
| Created note ID | `bbfef5b5-7ee8-4054-bdab-b7132b614e24` |
| Note number | `PN-20260624-15D2B7` |
| Create API status | **201** |
| Signing start API status | **200** |
| Signing URL | `http://localhost:3003/public-signing/promissory-note/w7Ky1hXeyYzuLqR58nIUdtvOCMdWS8osxKW8vy6qfqM?lang=ar` |
| OTP | `999811` |
| Note status after issuance | `PENDING_OTP` |

## Network Log

### 1. Create Promissory Note

**Request**

```http
POST /api/modules/promissory-notes HTTP/1.1
Host: localhost:3003
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
  "dueDate": "2026-06-24",
  "documentVersion": "1.0",
  "metadata": { ... }
}
```

**Response — HTTP 201**

```json
{
  "id": "bbfef5b5-7ee8-4054-bdab-b7132b614e24",
  "tenantId": "4549ed4b-b777-4364-9235-1841c7f5cb6d",
  "caseId": "f7ca657b-88ac-4c45-8fc6-306cbe3b0fb9",
  "noteNumber": "PN-20260624-15D2B7",
  "debtorName": "محمد إبراهيم الراشدي",
  "debtorIdNumber": "1012345678",
  "issuerName": "International Medical Center",
  "amount": "5770",
  "currency": "SAR",
  "dueDate": "2026-06-24T00:00:00.000Z",
  "status": "ACTIVE",
  "signedAt": null,
  "documentVersion": "1.0",
  "documentHash": "...",
  "metadata": { "source": "wathiqnote-enterprise-workflow", ... },
  "createdAt": "2026-06-24T23:50:35.552Z",
  "updatedAt": "2026-06-24T23:50:35.552Z",
  "case": {
    "id": "f7ca657b-88ac-4c45-8fc6-306cbe3b0fb9",
    "caseNumber": "TEST-LP-1777084653940",
    "patientName": "Test Patient Legal Package",
    "patientIdNumber": "1000000001",
    "medicalRecordNo": "TEST-LP-0001"
  }
}
```

### 2. Start Debtor Signing

**Request**

```http
POST /api/modules/promissory-notes/bbfef5b5-7ee8-4054-bdab-b7132b614e24/debtor-signing/start HTTP/1.1
Host: localhost:3003
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
  "id": "bbfef5b5-7ee8-4054-bdab-b7132b614e24",
  "noteNumber": "PN-20260624-15D2B7",
  "signingUrl": "http://localhost:3003/public-signing/promissory-note/w7Ky1hXeyYzuLqR58nIUdtvOCMdWS8osxKW8vy6qfqM?lang=ar",
  "otp": "999811",
  "status": "PENDING_OTP",
  "linkSmsStatus": "failed",
  "otpSmsStatus": "failed",
  "expiresAt": "2026-06-25T00:20:42.555Z"
}
```

> SMS statuses show `failed` because the local/dev environment has no live Taqnyat/SMS gateway configured. This is expected; the issuance and signing-token generation are the critical success criteria.

## Screenshots

- `04-note-details.png` — Note details step with Case ID populated.
- `08-send-signature-before.png` — Final "Issue & Send" step before clicking the button.
- `09-issued-success.png` — UI after successful issuance showing note number, `PENDING_OTP` status, signing URL, and lifecycle actions.

## Cleanup

The test note (`bbfef5b5-7ee8-4054-bdab-b7132b614e24`) was deleted from the preview database immediately after assertion to avoid leaving test data.

## Validation

- `npm run lint` — 0 errors, 143 pre-existing warnings
- `npm run build` — exit code 0
- End-to-end Playwright test — **passed**
