# Phase 44 Live Secure Link Email Send Proof Report

Date: 2026-06-02
Environment: Production
Host: https://wathiqcare.online
Classification: SECURE LINK EMAIL SENT SUCCESSFULLY

## Scope

Objective was to prove real informed-consent secure-link email delivery end-to-end on production using a tenant-scoped sender account, without code changes, deployment, migrations, mock delivery, or SMS sending.

## Sender Account

- Email: DR.AHMED@WATHIQCARE.MED.SA
- Authentication result: SUCCESS
- Authenticated identity returned by production `/api/auth/me`:
  - email: `dr.ahmed@wathiqcare.med.sa`
  - role: `doctor`
  - user_type: `tenant_user`
  - tenant_id: `efe052b7-a8ac-4962-a021-8c01931514a7`
  - tenant_code: `pilot-imc`

## Tenant Document Check

Request:

```http
GET /api/modules/informed-consents/documents?limit=1
```

Result: `200 OK`

Resolved tenant-owned informed-consent document:

- documentId: `9987682b-4bee-4a69-a2bc-0578ffdae9a4`
- consentReference: `IC-20260601163134-A3D6C7`
- tenantId: `efe052b7-a8ac-4962-a021-8c01931514a7`
- status: `DRAFT`

This satisfied the tenant-document prerequisite and ruled out `STOP – NO TENANT DOCUMENT FOUND`.

## UI Route Used

Opened production physician journey with the resolved document id:

```text
/modules/informed-consents?documentId=9987682b-4bee-4a69-a2bc-0578ffdae9a4
```

Observed production route loaded successfully and rendered the informed-consents physician journey.

## Patient Contact Used For Send Proof

Target patient contact for the live send proof:

- Email: `Basel@linagroups.com`
- Mobile: `0543587771`

Browser automation confirmed the Step 1 contact input fields were populated with:

- Patient mobile number: `0543587771`
- Patient email address: `Basel@linagroups.com`

## Real Secure-Signing API Proof

Authoritative production proof was captured by executing the real secure-signing API from the authenticated browser session.

Request:

```http
POST /api/modules/informed-consents/documents/9987682b-4bee-4a69-a2bc-0578ffdae9a4/secure-signing
Content-Type: application/json
```

Request payload used:

```json
{
  "deliveryChannel": "email",
  "recipientEmail": "Basel@linagroups.com",
  "recipientMobile": "0543587771",
  "email": "Basel@linagroups.com",
  "mobile": "0543587771"
}
```

Response status: `200 OK`

Response body excerpt:

```json
{
  "workflow": {
    "sessionId": "e951a4d1-070f-4d61-90c3-00274855e0a5",
    "moduleKey": "informed_consent",
    "documentId": "9987682b-4bee-4a69-a2bc-0578ffdae9a4",
    "signingUrl": "https://wathiqcare.online/sign/cBhQLcEkO6vl_GSMZ6EQi0Nk0pz2KdXmYfxPg8coP_0/workflow",
    "recipientMobile": "",
    "recipientEmail": "basel@linagroups.com",
    "smsDeliveryStatus": "failed",
    "smsFailureReason": "MOBILE_NOT_AVAILABLE",
    "emailDeliveryStatus": "sent",
    "emailFailureReason": null,
    "status": {
      "linkCreated": true,
      "smsSent": false,
      "opened": false,
      "otpRequested": false,
      "otpVerified": false,
      "signed": false,
      "expired": false,
      "failed": true,
      "failedAttempts": 0
    }
  }
}
```

## Interpretation

The production API confirmed all of the following:

- real secure-signing session was created
- real signing URL was minted on production
- recipient email was set to `basel@linagroups.com`
- `emailDeliveryStatus` returned `sent`
- no SMS was sent: `smsSent = false`
- `recipientMobile` in the persisted workflow was empty

This rules out:

- `STOP – ACCOUNT MISSING consent:send_signature`
- `STOP – NO TENANT DOCUMENT FOUND`
- `STOP – EMAIL DELIVERY FAILED`

## SMS Verification

No evidence of successful SMS delivery was observed.

Authoritative API fields:

- `smsSent: false`
- `recipientMobile: ""`
- `smsDeliveryStatus: "failed"`
- `smsFailureReason: "MOBILE_NOT_AVAILABLE"`

Conclusion: no SMS was sent during this proof run.

## Screenshots

Two production screenshots were captured during this session:

- before-send UI capture from the authenticated informed-consents physician journey
- after-send UI capture from the same production session after secure-signing API success

Note: stepper navigation in the final-ui physician surface was not stable enough under browser automation to reliably hold the visible viewport on Step 8 for screenshot capture, so the authoritative proof for delivery status is the real authenticated API request/response above.

## Final Result

`SECURE LINK EMAIL SENT SUCCESSFULLY`
