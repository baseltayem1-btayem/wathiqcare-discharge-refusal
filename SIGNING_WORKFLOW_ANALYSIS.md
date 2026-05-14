# Signing Workflow Analysis - WathiqCare

Complete document signing process including OTP verification, PDF generation, audit trails, and token management.

---

## 1. SIGNING SESSION CREATION

### 1.1 Entry Points

- **`createSigningSession(input: SigningSessionInput)`** - [signature-orchestration-service.ts](apps/web/src/lib/server/signature-orchestration-service.ts#L57)
- **`requestSecureSigningLink()`** - [module-secure-signing-service.ts](apps/web/src/lib/server/module-secure-signing-service.ts)

### 1.2 Key Function Signature

```typescript
export async function createSigningSession(
  input: SigningSessionInput
): Promise<SigningSession>
```

**Input Parameters:**

```typescript
interface SigningSessionInput {
  documentId: string;              // Platform document ID
  moduleType: "informed_consent" | "discharge_refusal" | "promissory_note";
  tenantId: string;
  pdfBytes: Buffer;               // Original PDF to sign
  signers: SignerDefinition[];    // Array of signer roles
  expiryHours?: number;           // Default: SIGNATURE_CONFIG.linkExpiryHours
  initiatedBy: string;            // Actor ID
}

interface SignerDefinition {
  role: "PATIENT" | "GUARDIAN" | "PHYSICIAN" | "WITNESS" | "INTERPRETER";
  name: string;
  nameAr?: string;
  mobile?: string;
  email?: string;
  nationalId?: string;
}
```

### 1.3 Database Operations (Workflow)

#### Step 1: Compute Expiry

```typescript
const expiresAt = computeSigningExpiry(input.expiryHours);
// Adds (hours * 60 * 60 * 1000) milliseconds to Date.now()
```

#### Step 2: Generate Secure Tokens & Links

```typescript
for (const signer of input.signers) {
  const token = generateSecureSigningToken();  // 32 bytes of entropy, base64url encoded
  const link = buildSigningUrl(token);         // `/sign/[token]` at configured base URL
  signerLinks[signer.role] = link;
  tokenRows.push({ signerRole: signer.role, token, expiresAt });
}
```

#### Step 3: Persist Session

```sql
INSERT INTO signing_sessions
  (tenant_id, document_id, module_type, provider_key, status,
   required_signers, completed_signers, signer_links, expires_at, initiated_by_id)
VALUES
  ($1, $2, $3, 'pdf_filler', 'PENDING', $5::jsonb, '[]'::jsonb, $6::jsonb, $7, $8)
RETURNING id
```

#### Step 4: Persist Secure Tokens

```sql
INSERT INTO signing_secure_tokens
  (session_id, tenant_id, signer_role, token, expires_at)
VALUES
  ($1, $2, $3, $4, $5)
```

#### Step 5: Submit to Provider (PDFfiller)

- Calls provider adapter's `submitForSigning()` method
- Updates session status to 'SENT'
- Stores `provider_session_id`

### 1.4 Return Value

```typescript
interface SigningSession {
  sessionId: string;                    // Internal session ID
  providerSessionId?: string;           // External provider session ID
  signerLinks: Record<SignerRole, string>;  // Role → signing URL map
  expiresAt: string;                   // ISO 8601 timestamp
  status: "PENDING" | "SENT" | ... ;
  createdAt: string;                   // ISO 8601 timestamp
}
```

---

## 2. OTP GENERATION & VERIFICATION

### 2.1 OTP Request Flow

#### Endpoint

- **POST** `/api/sign/[token]/request-otp`
- Route: [apps/web/app/api/sign/[token]/request-otp/route.ts](apps/web/app/api/sign/[token]/request-otp/route.ts)

#### Handler Function

```typescript
export async function requestSigningOtp(args: {
  token: string;
  mobileNumber: string;
  locale?: "ar" | "en";
  request?: NextRequest;
}): Promise<{
  challengeId: string;
  expiresAt: string;
  deliveryStatus: "sent" | "failed";
  fallbackMode: boolean;
  maskedPhone: string;
}>
```

#### Workflow Steps

1. **Validate Token & Get Context**

   ```typescript
   const context = await getSigningTokenContext(token);
   // Returns: tenantId, sessionId, documentId, moduleType, redirectPath
   ```

2. **Normalize Phone Number**

   ```typescript
   function normalizePhoneNumber(value: string): string
   // Converts: "05XX" → "+966XX", "00966XX" → "+966XX", "+966XX" → "+966XX"
   ```

3. **Generate OTP Challenge**

   ```typescript
   const challengeId = crypto.randomUUID();
   const code = generateOtpCode();  // 6-digit code: `crypto.randomInt(0, 1000000).padStart(6)`
   const expiresAt = new Date(Date.now() + 10 * 60 * 1000);  // 10 minutes
   ```

4. **Compute Hashes**

   ```typescript
   function tokenHash(token: string): string {
     return crypto.createHash("sha256").update(token).digest("hex");
   }
   
   function otpHash(otpCode: string): string {
     const pepper = process.env.PUBLIC_SIGNING_OTP_PEPPER || "wathiqcare-signing-otp-pepper";
     return crypto.createHmac("sha256", pepper).update(otpCode).digest("hex");
   }
   ```

5. **Build OTP Payload**

   ```typescript
   type OtpChallengePayload = {
     challengeId: string;
     tokenHash: string;              // SHA-256 hash of signing token
     otpHash: string;                // HMAC-SHA256(pepper, otpCode)
     phoneNumber: string;            // Full normalized number
     maskedPhone: string;            // Last 4 digits, rest masked
     expiresAt: string;              // ISO 8601 timestamp
     sessionId: string;
     documentId: string;
     moduleType: string;
   };
   ```

6. **Send SMS via Taqnyat**

   ```typescript
   if (isTaqnyatReady()) {
     const message = buildSigningOtpSms({
       otpCode: code,
       linkUrl: `${getBaseUrl()}/sign/${encodeURIComponent(token)}`,
       expiresMinutes: 10,
       locale: "ar" | "en"
     });
     const result = await sendTaqnyatMessage({ recipient: mobile, message });
     deliveryStatus = result.ok ? "sent" : "failed";
   }
   ```

7. **Record OTP Event**

   ```sql
   INSERT INTO webhook_events
     (provider_key, event_type, raw_payload, hmac_verified, processed)
   VALUES
     ('public_signing_otp', 'OTP_REQUESTED', $payload::jsonb, TRUE, FALSE)
   ```

8. **Log Audit**

   ```typescript
   await appendAuditChainEvent({
     tenantId, eventType: "PUBLIC_SIGNING_OTP_REQUESTED",
     actorId: "public_signer", actorRole: "patient",
     payloadSummary: `OTP requested for signing session ${sessionId}`,
     metadataJson: { challengeId, tokenHash, maskedPhone, moduleType, deliveryStatus }
   });
   ```

### 2.2 OTP Verification Flow

#### Endpoint

- **POST** `/api/sign/[token]/verify-otp`
- Route: [apps/web/app/api/sign/[token]/verify-otp/route.ts](apps/web/app/api/sign/[token]/verify-otp/route.ts)

#### Handler Function

```typescript
export async function verifySigningOtp(args: {
  token: string;
  otpCode: string;
  request?: NextRequest;
}): Promise<{
  verified: boolean;
  redirectPath: string;
  moduleType: string;
  documentId: string;
  attemptsRemaining: number;
}>
```

#### Workflow Steps

1. **Retrieve Active OTP Challenge**

   ```sql
   SELECT id, raw_payload, created_at
   FROM webhook_events
   WHERE provider_key = 'public_signing_otp'
     AND event_type = 'OTP_REQUESTED'
     AND processed = FALSE
     AND raw_payload ->> 'tokenHash' = $tokenHash
   ORDER BY created_at DESC
   LIMIT 1
   ```

2. **Validate Challenge Expiry**

   ```typescript
   if (new Date(active.payload.expiresAt).getTime() <= Date.now()) {
     throw new ApiError(410, "OTP challenge has expired");
   }
   ```

3. **Check Attempt Count**

   ```sql
   SELECT COUNT(*)::int AS count
   FROM webhook_events
   WHERE provider_key = 'public_signing_otp'
     AND event_type = 'OTP_VERIFY_FAILED'
     AND raw_payload ->> 'challengeId' = $challengeId
   ```

   - Max attempts: 3 (OTP_MAX_ATTEMPTS)
   - If exceeded: `throw new ApiError(429, "OTP attempts exceeded")`

4. **Verify OTP Code (Timing-Safe Comparison)**

   ```typescript
   const expected = active.payload.otpHash;
   const actual = otpHash(submittedCode);
   const expectedBuffer = Buffer.from(expected, "hex");
   const actualBuffer = Buffer.from(actual, "hex");
   const verified = crypto.timingSafeEqual(expectedBuffer, actualBuffer);
   ```

5. **On Failure: Record Failed Attempt**

   ```sql
   INSERT INTO webhook_events
     (provider_key, event_type, raw_payload, hmac_verified, processed)
   VALUES
     ('public_signing_otp', 'OTP_VERIFY_FAILED', $payload::jsonb, TRUE, TRUE)
   ```

   - Returns `attemptsRemaining = MAX - latestAttempts`

6. **On Success: Mark Challenge Processed**

   ```sql
   UPDATE webhook_events
   SET processed = TRUE, processed_at = NOW()
   WHERE id = $rowId
   ```

7. **Record Success Event**

   ```sql
   INSERT INTO webhook_events
     (provider_key, event_type, raw_payload, hmac_verified, processed)
   VALUES
     ('public_signing_otp', 'OTP_VERIFIED', $payload::jsonb, TRUE, TRUE)
   ```

8. **Audit Log**

   ```typescript
   await appendAuditChainEvent({
     tenantId, eventType: "PUBLIC_SIGNING_OTP_VERIFIED",
     actorId: "public_signer", actorRole: "patient",
     payloadSummary: `OTP verified for signing session ${sessionId}`,
     metadataJson: { challengeId, tokenHash, moduleType, documentId }
   });
   ```

### 2.3 OTP Configuration

- **OTP Validity**: 10 minutes (`OTP_EXPIRY_MINUTES`)
- **Max Attempts**: 3 (`OTP_MAX_ATTEMPTS`)
- **Pepper**: `process.env.PUBLIC_SIGNING_OTP_PEPPER` (default: "wathiqcare-signing-otp-pepper")
- **SMS Provider**: Taqnyat

---

## 3. SIGNING TOKEN VALIDATION & USAGE

### 3.1 Token Context Retrieval

#### Endpoint

- **GET** `/api/sign/[token]/context`
- Route: [apps/web/app/api/sign/[token]/context/route.ts](apps/web/app/api/sign/[token]/context/route.ts)

#### Function

```typescript
export async function getSigningTokenContext(token: string): Promise<SigningTokenContext> {
  const normalizedToken = String(token || "").trim();
  
  const validated = await validateSigningToken(normalizedToken);
  // Returns: sessionId, documentId, moduleType, tenantId, signerRole
  
  return {
    tenantId: validated.tenantId,
    sessionId: validated.sessionId,
    documentId: validated.documentId,
    moduleType: validated.moduleType,
    redirectPath: buildRedirectPath(moduleType, documentId, token)
  };
}
```

### 3.2 Token Validation

#### Function

```typescript
export async function validateSigningToken(token: string): Promise<{
  sessionId: string;
  documentId: string;
  moduleType: string;
  signerRole: string;
  tenantId: string;
}>
```

#### Query

```sql
SELECT t.id, t.session_id, t.signer_role, t.expires_at, t.used_at, t.revoked_at,
       s.document_id, s.module_type, s.tenant_id
FROM signing_secure_tokens t
JOIN signing_sessions s ON s.id = t.session_id
WHERE t.token = $1
LIMIT 1
```

#### Validations

```typescript
if (!row || !row.session_id || !row.document_id) 
  → throw ApiError(404, "Invalid or expired signing token")

if (row.used_at) 
  → throw ApiError(404, "Invalid or expired signing token")

if (row.revoked_at) 
  → throw ApiError(404, "Invalid or expired signing token")

if (new Date(row.expires_at) < new Date()) 
  → throw ApiError(404, "Invalid or expired signing token")
```

### 3.3 Mark Token as Used

#### Function

```typescript
export async function markTokenUsed(token: string, ipAddress?: string): Promise<void>
```

#### Query

```sql
UPDATE signing_secure_tokens 
SET used_at = NOW(), ip_on_use = $1 
WHERE token = $2
```

---

## 4. DOCUMENT SIGNING COMPLETION

### 4.1 Consent Signature Submission

#### Endpoint

- **POST** `/api/modules/informed-consents/documents/[id]/sign`
- Route: [apps/web/app/api/modules/informed-consents/documents/[id]/sign/route.ts](apps/web/app/api/modules/informed-consents/documents/[id]/sign/route.ts)

#### Handler Function

```typescript
export async function addConsentSignature(
  auth: AuthContext,
  id: string,
  payload: {
    role?: string;
    signerName?: string;
    signerIdNumber?: string;
    signerLicense?: string;
    signatureMethod?: string;
  },
  request?: NextRequest
)
```

#### Workflow

1. Fetch consent document with existing signatures
2. Normalize signature role (PATIENT | PHYSICIAN | WITNESS | etc.)
3. Create `ConsentDocumentSignature` record
4. Update document status:
   - If all required signers present → `SIGNED`
   - Otherwise → `READY_FOR_SIGNATURE`
5. Generate QR payload for verification
6. Audit the signing event

### 4.2 Signature Record Structure

```typescript
interface ConsentDocumentSignature {
  id: string;
  tenantId: string;
  consentDocumentId: string;
  role: ConsentSignatureRole;
  signerName: string;
  signerIdNumber?: string;
  signerLicense?: string;
  signatureMethod: ConsentMethod;
  signedAt: Date;
  ipAddress?: string;
  deviceInfo?: string;
  signatureData?: {
    qrPayload?: string;
    verificationUrl?: string;
  };
}
```

### 4.3 Database Operations

```sql
INSERT INTO consent_document_signatures
  (tenant_id, consent_document_id, role, signer_name, signer_id_number,
   signer_license, signature_method, signed_at, ip_address, device_info)
VALUES
  ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
RETURNING id

UPDATE consent_documents
SET status = CASE 
      WHEN (all signers present) THEN 'SIGNED'
      ELSE 'READY_FOR_SIGNATURE'
    END,
    updated_at = NOW()
WHERE id = $1
```

---

## 5. PDF GENERATION & SEALING

### 5.1 PDF Generation Service

#### Location

- [apps/web/src/lib/server/legal-case-pdf-service.ts](apps/web/src/lib/server/legal-case-pdf-service.ts)

#### Key Functions

```typescript
// Generate QR code for verification
async function generateQrCode(validationPath: string): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(validationPath, {
    errorCorrectionLevel: "H",
    type: "image/png",
    width: 300,
    margin: 2
  });
  return qrDataUrl;  // Data URL for embedding in PDF
}

// Generate complete case PDF
export async function generateCasePdf(
  caseId: string,
  tenantId: string,
  language: "ar" | "en",
  triggerReason: GenerateTrigger
): Promise<CasePdfVersionSummary>
```

### 5.2 PDF Content Generation (Puppeteer)

#### Browser Setup

```typescript
async function getPdfBrowser(): Promise<Browser> {
  const isLocal = detectPdfRuntimeTarget() !== "production";
  const launchOptions: LaunchOptions = {
    headless: true,
    args: isLocal ? [] : chromium.args,
    executablePath: isLocal ? configuredPath : await chromium.executablePath()
  };
  return puppeteer.launch(launchOptions);
}
```

#### HTML Template Structure (Simplified)

```html
<html>
  <head>
    <style>/* Print-optimized CSS */</style>
  </head>
  <body>
    <!-- Case Header -->
    <h1>Case #{caseNumber}</h1>
    <p>Patient: {patientName}</p>
    
    <!-- Legal Sections -->
    <section id="legal-package">
      {documentContent}
    </section>
    
    <!-- Signatures Section -->
    <section id="signatures">
      {signatureBlocks}
    </section>
    
    <!-- QR Code & Audit Trail -->
    <section id="verification">
      <h3>Verification & Audit Trail</h3>
      <img src="{qrDataUrl}" alt="validation-qr" />
      <p>Scan QR to verify document authenticity</p>
      <p>Hash: {sha256Hash}</p>
      <p>Generated: {generatedAt}</p>
    </section>
  </body>
</html>
```

#### Render & Convert to PDF

```typescript
const page = await browser.newPage();
await page.setContent(htmlContent, { waitUntil: "networkidle2" });
const pdfBuffer = await page.pdf({
  format: "A4",
  printBackground: true,
  margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" }
});
await page.close();
```

### 5.3 PDF Metadata & Hash

#### Computation

```typescript
const sha256Hash = crypto
  .createHash("sha256")
  .update(pdfBuffer)
  .digest("hex");

const pdfMetadata = {
  fileName: `case-${caseId}-${language}-${timestamp}.pdf`,
  version: nextVersion,
  language,
  mimeType: "application/pdf",
  fileSize: pdfBuffer.length,
  sha256Hash,
  generatedAt: new Date().toISOString(),
  generatedBy: userId,
  templateVersion: "1.0.0"
};
```

### 5.4 PDF Storage

#### Database Record

```sql
INSERT INTO document_versions
  (tenant_id, case_id, document_type, version, file_name,
   status, language, mime_type, file_size, sha256_hash,
   generated_at, generated_by_id)
VALUES
  ($1, $2, 'legal_case_pdf', $3, $4, 'final', $5, 'application/pdf', $6, $7, NOW(), $8)
RETURNING id
```

#### Binary Storage

```typescript
// Store binary in dedicated table or cloud storage
await storePdfBinary(documentVersionId, pdfBuffer);
```

---

## 6. AUDIT TRAIL RECORDING

### 6.1 Audit Events Tables

#### `audit_logs` (Legacy)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  details TEXT,
  case_id UUID,
  metadata_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `audit_chain_events` (Immutable Chain)

```sql
CREATE TABLE audit_chain_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  case_id UUID,
  event_type VARCHAR NOT NULL,
  actor_id VARCHAR NOT NULL,
  actor_role VARCHAR,
  payload_summary TEXT NOT NULL,
  document_version VARCHAR,
  metadata_json JSONB,
  chain_hash VARCHAR(64),
  previous_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `consent_audit_events` (Consent-Specific)

```sql
CREATE TABLE consent_audit_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  consent_document_id UUID,
  template_id UUID,
  template_version_id UUID,
  action VARCHAR NOT NULL,
  source VARCHAR,
  actor_user_id VARCHAR NOT NULL,
  actor_role VARCHAR,
  summary TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 6.2 Recording Functions

#### Function

```typescript
export async function appendAuditChainEvent(args: {
  tenantId: string;
  caseId?: string | null;
  eventType: string;                    // e.g., "PUBLIC_SIGNING_OTP_VERIFIED"
  actorId: string;                      // User ID or "public_signer"
  actorRole?: string | null;            // "patient", "physician", etc.
  payloadSummary: string;               // Human-readable description
  documentVersion?: string;
  metadataJson?: Record<string, unknown>;
  request?: NextRequest;
}): Promise<void>
```

### 6.3 Audit Events During Signing

1. **Session Creation**

   ```
   event_type: "SIGNING_SESSION_CREATED"
   metadata: { documentId, moduleType, signerCount, expiresAt }
   ```

2. **OTP Requested**

   ```
   event_type: "PUBLIC_SIGNING_OTP_REQUESTED"
   actor_id: "public_signer"
   metadata: { challengeId, maskedPhone, deliveryStatus }
   ```

3. **OTP Verified**

   ```
   event_type: "PUBLIC_SIGNING_OTP_VERIFIED"
   metadata: { challengeId, tokenHash, moduleType }
   ```

4. **Document Signed**

   ```
   event_type: "CONSENT_DOCUMENT_SIGNED" | "DISCHARGE_REFUSAL_SIGNED"
   metadata: { documentId, signerRole, signatureMethod }
   ```

5. **PDF Generated**

   ```
   event_type: "LEGAL_CASE_PDF_GENERATED"
   metadata: { caseId, version, sha256Hash, fileSize }
   ```

---

## 7. QR CODE GENERATION FOR SIGNATURES

### 7.1 QR Payload Structure

#### For Consent Documents

```typescript
const qrPayload = {
  documentId: consentDocument.id,
  documentType: "consent",
  signerRole: normalizeSignatureRole(payload.role),
  signedAt: new Date().toISOString(),
  tenantId: auth.tenant_id,
  verificationUrl: buildVerificationUrl(auth.tenant_id, consentDocument.id)
};

// Stringified for QR encoding
const qrString = JSON.stringify(qrPayload);
```

#### For Legal Case PDFs

```typescript
const validationPath = `${baseUrl}/api/documents/${caseId}/verify-signature?hash=${sha256Hash}`;

const qrDataUrl = await QRCode.toDataURL(validationPath, {
  errorCorrectionLevel: "H",
  type: "image/png",
  width: 300,
  margin: 2
});
```

### 7.2 QR Verification Endpoint

#### Endpoint

- **GET** `/api/documents/[documentId]/verify-signature?hash=[sha256Hash]`

#### Response

```typescript
{
  documentId: string;
  documentType: string;
  signerRole: string;
  signedAt: string;
  verificationUrl: string;
  pdfHash: string;
  isValid: boolean;
  verifiedAt: string;
}
```

---

## 8. TOKEN INVALIDATION & REVOCATION

### 8.1 Token Revocation Function

#### Function

```typescript
export async function revokeSigningSession(
  sessionId: string,
  tenantId: string,
  reason: string
): Promise<void>
```

#### Steps

1. **Fetch Session & Provider Info**

   ```sql
   SELECT provider_session_id, provider_key
   FROM signing_sessions
   WHERE id = $1 AND tenant_id = $2
   LIMIT 1
   ```

2. **Revoke at Provider** (PDFfiller)

   ```typescript
   const provider = getProvider(providerKey);
   await provider.revokeSession(providerSessionId);
   ```

3. **Update Session Status**

   ```sql
   UPDATE signing_sessions
   SET status = 'REVOKED', revoked_at = NOW(), revoked_reason = $1, updated_at = NOW()
   WHERE id = $2
   ```

4. **Revoke All Pending Tokens**

   ```sql
   UPDATE signing_secure_tokens
   SET revoked_at = NOW()
   WHERE session_id = $1 AND used_at IS NULL AND revoked_at IS NULL
   ```

### 8.2 Token Expiry Handling

#### Automatic on Validation

```typescript
if (new Date(row.expires_at) < new Date()) {
  throw new ApiError(404, "Invalid or expired signing token");
}
```

#### Cleanup (Background Job)

```sql
DELETE FROM signing_secure_tokens
WHERE expires_at < NOW() - INTERVAL '30 days'
  AND used_at IS NULL
  AND revoked_at IS NULL;

UPDATE signing_sessions
SET status = 'EXPIRED'
WHERE expires_at < NOW()
  AND status = 'PENDING'
```

---

## 9. COMPLETE SIGNING WORKFLOW SEQUENCE

### User Journey (Discharge Refusal Document)

```
1. [Backend] Create Signing Session
   └─ createSigningSession({
        documentId: "doc-123",
        moduleType: "discharge_refusal",
        signers: [{ role: "PATIENT", mobile: "0505551234" }]
      })
   └─ Result: sessionId, signerLinks[PATIENT] = "https://wathiqcare.online/sign/ABC123..."

2. [SMS] Send Signing Link
   └─ Message: "Sign your document: [link] OTP: Request here"

3. [User] Opens `/sign/[token]`
   └─ Frontend calls GET /api/sign/ABC123/context
   └─ Returns: sessionId, documentId, moduleType, redirectPath

4. [User] Requests OTP
   └─ Frontend calls POST /api/sign/ABC123/request-otp
   └─ Backend:
      - Validates token
      - Generates 6-digit OTP code
      - Sends SMS via Taqnyat
      - Records OTP_REQUESTED event
   └─ Returns: challengeId, maskedPhone, deliveryStatus

5. [User] Enters OTP Code
   └─ Frontend calls POST /api/sign/ABC123/verify-otp with { otpCode: "123456" }
   └─ Backend:
      - Validates token
      - Fetches latest OTP challenge
      - Timing-safe comparison of OTP hashes
      - Marks token as used
      - Records OTP_VERIFIED event
   └─ Returns: verified=true, redirectPath, documentId

6. [User] Redirected to `/secure/[token]`
   └─ Frontend calls POST /api/documents/[documentId]/sign
   └─ Backend (forwarded to API):
      - Saves signature record
      - Updates document status to SIGNED
      - Records DOCUMENT_SIGNED audit event

7. [Backend] Generate Final PDF
   └─ generateCasePdf(caseId, tenantId, "en", "manual_generate")
   └─ Process:
      - Render HTML with Puppeteer
      - Generate QR code with verification URL
      - Convert to PDF
      - Compute SHA-256 hash
      - Store binary version
      - Create audit record

8. [System] Seal Document
   └─ Signature status: COMPLETED
   └─ PDF hash recorded in audit chain
   └─ Immutable chain hash computed

9. [User] Access Signed Document
   └─ GET /api/documents/[documentId]/download
   └─ Returns PDF with embedded QR code
   └─ Audit log created for download
```

---

## 10. KEY SECURITY FEATURES

### 10.1 Token Security

- **32 bytes of entropy** per token (256 bits)
- **Base64-URL encoded** for safe transmission
- **Single-use** (marked as `used_at` after verification)
- **Time-bounded** (expires after configurable hours)
- **Revocable** (can be explicitly revoked)
- **Stored as plain text** (validated, not hashed, for lookup)

### 10.2 OTP Security

- **HMAC-SHA256** hashing with pepper
- **Timing-safe comparison** using `crypto.timingSafeEqual()`
- **3 attempt limit** per OTP challenge
- **10-minute expiry** per challenge
- **One-time use** (challenge marked as processed)

### 10.3 Audit Trail

- **Immutable chain** with hash linking
- **Actor identification** (user ID or "public_signer")
- **IP address** and device info capture
- **Metadata** for forensic analysis
- **Separate tables** for different audit contexts

### 10.4 PDF Integrity

- **SHA-256 hashing** of final PDF
- **QR code** with verification URL
- **Puppeteer rendering** for consistent output
- **Version tracking** with metadata

---

## 11. DATABASE SCHEMA SUMMARY

### Signing Tables

```
signing_sessions
├─ id (UUID, PK)
├─ tenant_id (UUID, FK)
├─ document_id (VARCHAR)
├─ module_type (VARCHAR) → "discharge_refusal" | "informed_consent" | ...
├─ provider_key (VARCHAR) → "pdf_filler"
├─ status (VARCHAR) → "PENDING" | "SENT" | "PARTIALLY_SIGNED" | "COMPLETED" | "EXPIRED" | "REVOKED"
├─ required_signers (JSONB) → ["PATIENT", "WITNESS"]
├─ completed_signers (JSONB) → ["PATIENT"]
├─ signer_links (JSONB) → { "PATIENT": "https://...", "WITNESS": "https://..." }
├─ provider_session_id (VARCHAR)
├─ expires_at (TIMESTAMP)
├─ initiated_by_id (VARCHAR)
├─ revoked_at (TIMESTAMP)
├─ revoked_reason (VARCHAR)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

signing_secure_tokens
├─ id (UUID, PK)
├─ session_id (UUID, FK) → signing_sessions.id
├─ tenant_id (UUID, FK)
├─ signer_role (VARCHAR) → "PATIENT" | "PHYSICIAN" | ...
├─ token (VARCHAR, UNIQUE) → 32-byte entropy, base64url
├─ expires_at (TIMESTAMP)
├─ used_at (TIMESTAMP)
├─ ip_on_use (INET)
├─ revoked_at (TIMESTAMP)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

webhook_events
├─ id (UUID, PK)
├─ provider_key (VARCHAR) → "public_signing_otp" | "pdf_filler" | ...
├─ event_type (VARCHAR) → "OTP_REQUESTED" | "OTP_VERIFIED" | "OTP_VERIFY_FAILED"
├─ raw_payload (JSONB)
├─ hmac_verified (BOOLEAN)
├─ processed (BOOLEAN)
├─ processed_at (TIMESTAMP)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

### Audit Tables

```
audit_chain_events
├─ id (UUID, PK)
├─ tenant_id (UUID, FK)
├─ case_id (UUID)
├─ event_type (VARCHAR) → "PUBLIC_SIGNING_OTP_REQUESTED" | "CONSENT_DOCUMENT_SIGNED" | ...
├─ actor_id (VARCHAR)
├─ actor_role (VARCHAR)
├─ payload_summary (TEXT)
├─ document_version (VARCHAR)
├─ metadata_json (JSONB)
├─ chain_hash (VARCHAR(64)) → SHA-256 linking
├─ previous_hash (VARCHAR(64))
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

---

## 12. CONFIGURATION & ENV VARIABLES

```bash
# Signing Configuration
PUBLIC_SIGNING_OTP_PEPPER=wathiqcare-signing-otp-pepper
PUBLIC_SIGNING_LINK_EXPIRY_HOURS=72
NEXTAUTH_URL=https://wathiqcare.online

# PDF Generation
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome  # Optional
VERCEL_ENV=production  # Detected for runtime target

# SMS Provider
TAQNYAT_API_KEY=...
TAQNYAT_SENDER_ID=...

# Feature Flags
ENABLE_EXTERNAL_SIGNATURES=true
ENABLE_SECURE_SIGNING_LINKS=true
```

---

## 13. API ENDPOINTS SUMMARY

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/discharge/cases/[caseId]/secure-signing-link` | Create signing session |
| GET | `/api/sign/[token]/context` | Get signing context |
| POST | `/api/sign/[token]/request-otp` | Request OTP |
| POST | `/api/sign/[token]/verify-otp` | Verify OTP |
| POST | `/api/documents/[documentId]/sign` | Submit signature |
| POST | `/api/modules/informed-consents/documents/[id]/sign` | Submit consent signature |
| GET | `/api/documents/[documentId]/download` | Download signed PDF |
| GET | `/api/documents/[documentId]/verify-signature?hash=...` | Verify QR code |

---

## References

- [Signature Core Types](apps/web/src/lib/core/signature-core.ts)
- [Signature Orchestration Service](apps/web/src/lib/server/signature-orchestration-service.ts)
- [Public Signing Service](apps/web/src/lib/server/public-signing-service.ts)
- [Consent Library Service](apps/web/src/lib/server/consent-library-service.ts)
- [Legal Case PDF Service](apps/web/src/lib/server/legal-case-pdf-service.ts)
- [Audit Chain Service](apps/web/src/lib/server/audit-chain-service.ts)
