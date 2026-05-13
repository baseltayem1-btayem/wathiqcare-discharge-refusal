/**
 * Signature Orchestration Service
 *
 * High-level orchestration layer for external signature workflows.
 * Uses signature-core types + prisma for session persistence.
 * Provider adapters are injected — no provider-specific code here.
 */

import { getPrisma } from "@/lib/server/prisma";
import {
  type SigningSessionInput,
  type SigningSession,
  type SignerRole,
  type ISignatureProvider,
  type SigningWebhookPayload,
  generateSecureSigningToken,
  buildSigningUrl,
  computeSigningExpiry,
  verifyWebhookSignature,
  SignatureProviderError,
  SignatureExpiredError,
} from "@/lib/core/signature-core";
import { assertSignaturesEnabled } from "@/lib/core/signature-core";
import { SIGNATURE_CONFIG } from "@/lib/config/platform-config";

const prisma = getPrisma();

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------

const _providers = new Map<string, ISignatureProvider>();

/**
 * Register a signature provider. Call at app startup.
 * E.g. registerSignatureProvider(new PdfFillerAdapter())
 */
export function registerSignatureProvider(provider: ISignatureProvider): void {
  _providers.set(provider.providerKey, provider);
}

function getProvider(key: string): ISignatureProvider {
  const p = _providers.get(key);
  if (!p) {
    throw new SignatureProviderError(
      `Signature provider not registered: ${key}. Register via registerSignatureProvider().`
    );
  }
  return p;
}

function defaultProviderKey(): string {
  return _providers.keys().next().value ?? "pdf_filler";
}

// ---------------------------------------------------------------------------
// Create Signing Session
// ---------------------------------------------------------------------------

export async function createSigningSession(
  input: SigningSessionInput
): Promise<SigningSession> {
  assertSignaturesEnabled();

  const providerKey = defaultProviderKey();
  const expiresAt = computeSigningExpiry(input.expiryHours);

  // Generate secure tokens + links for each signer
  const signerLinks: Record<string, string> = {};
  const tokenRows: Array<{
    signerRole: string;
    token: string;
    expiresAt: Date;
  }> = [];

  for (const signer of input.signers) {
    const token = generateSecureSigningToken();
    const link = buildSigningUrl(token);
    signerLinks[signer.role] = link;
    tokenRows.push({ signerRole: signer.role, token, expiresAt });
  }

  // Persist session
  await prisma.$executeRawUnsafe(
    `INSERT INTO signing_sessions
       (tenant_id, document_id, module_type, provider_key, status,
        required_signers, completed_signers, signer_links, expires_at, initiated_by_id)
     VALUES ($1, $2, $3, $4, 'PENDING', $5::jsonb, '[]'::jsonb, $6::jsonb, $7, $8)
     RETURNING id`,
    input.tenantId,
    input.documentId,
    input.moduleType,
    providerKey,
    JSON.stringify(input.signers.map((s) => s.role)),
    JSON.stringify(signerLinks),
    expiresAt.toISOString(),
    input.initiatedBy
  );

  // Get the created session ID
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM signing_sessions
     WHERE tenant_id = $1 AND document_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    input.tenantId,
    input.documentId
  );

  const sessionId = rows[0]?.id;
  if (!sessionId) throw new SignatureProviderError("Failed to create signing session.");

  // Persist secure tokens
  for (const t of tokenRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO signing_secure_tokens (session_id, tenant_id, signer_role, token, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      sessionId,
      input.tenantId,
      t.signerRole,
      t.token,
      t.expiresAt.toISOString()
    );
  }

  // Submit to provider
  const provider = getProvider(providerKey);
  let providerSessionId: string | undefined;

  try {
    const result = await provider.submitForSigning(input, signerLinks as Record<SignerRole, string>);
    providerSessionId = result.providerSessionId;

    await prisma.$executeRawUnsafe(
      `UPDATE signing_sessions SET provider_session_id = $1, status = 'SENT', updated_at = NOW()
       WHERE id = $2`,
      providerSessionId,
      sessionId
    );
  } catch (err) {
    // Log failure but don't throw — session is created, can retry send
    await logSigningEvent(sessionId, input.tenantId, providerKey, "session.submit_failed", undefined, {
      error: String(err),
    });
  }

  return {
    sessionId,
    providerSessionId,
    signerLinks: signerLinks as Record<SignerRole, string>,
    expiresAt: expiresAt.toISOString(),
    status: "SENT",
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Validate Signing Token
// ---------------------------------------------------------------------------

export async function validateSigningToken(
  token: string
): Promise<{
  sessionId: string;
  documentId: string;
  moduleType: string;
  signerRole: string;
  tenantId: string;
}> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      session_id: string;
      signer_role: string;
      expires_at: Date;
      used_at: Date | null;
      revoked_at: Date | null;
      document_id: string;
      module_type: string;
      tenant_id: string;
    }>
  >(
    `SELECT t.id, t.session_id, t.signer_role, t.expires_at, t.used_at, t.revoked_at,
            s.document_id, s.module_type, s.tenant_id
     FROM signing_secure_tokens t
     JOIN signing_sessions s ON s.id = t.session_id
     WHERE t.token = $1
     LIMIT 1`,
    token
  );

  const row = rows[0];
  if (!row) throw new SignatureExpiredError("Invalid signing token.");
  if (row.used_at) throw new SignatureExpiredError("Signing token already used.");
  if (row.revoked_at) throw new SignatureExpiredError("Signing token has been revoked.");
  if (new Date(row.expires_at) < new Date()) {
    throw new SignatureExpiredError("Signing token has expired.");
  }

  return {
    sessionId: row.session_id,
    documentId: row.document_id,
    moduleType: row.module_type,
    signerRole: row.signer_role,
    tenantId: row.tenant_id,
  };
}

// ---------------------------------------------------------------------------
// Mark Token Used
// ---------------------------------------------------------------------------

export async function markTokenUsed(token: string, ipAddress?: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE signing_secure_tokens SET used_at = NOW(), ip_on_use = $1 WHERE token = $2`,
    ipAddress ?? null,
    token
  );
}

// ---------------------------------------------------------------------------
// Process Webhook Event
// ---------------------------------------------------------------------------

export async function processSigningWebhook(
  rawBody: string,
  receivedHmac: string,
  providerKey: string
): Promise<void> {
  // Verify HMAC
  const valid = verifyWebhookSignature(rawBody, receivedHmac);
  if (!valid) {
    throw new SignatureProviderError("Webhook HMAC verification failed.");
  }

  const payload = JSON.parse(rawBody) as SigningWebhookPayload;

  // Log raw event
  await prisma.$executeRawUnsafe(
    `INSERT INTO webhook_events (provider_key, event_type, raw_payload, hmac_verified)
     VALUES ($1, $2, $3::jsonb, TRUE)`,
    providerKey,
    payload.event,
    rawBody
  );

  // Find session
  const sessions = await prisma.$queryRawUnsafe<Array<{ id: string; tenant_id: string; document_id: string }>>(
    `SELECT id, tenant_id, document_id FROM signing_sessions WHERE provider_session_id = $1 LIMIT 1`,
    payload.providerSessionId
  );

  const sess = sessions[0];
  if (!sess) return; // Unknown session — log but don't fail

  // Update status based on event
  let newStatus: string | null = null;
  if (payload.event === "session.completed") newStatus = "COMPLETED";
  else if (payload.event === "session.expired") newStatus = "EXPIRED";

  if (newStatus) {
    await prisma.$executeRawUnsafe(
      `UPDATE signing_sessions SET status = $1, updated_at = NOW(),
        completed_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE completed_at END
       WHERE id = $2`,
      newStatus,
      sess.id
    );
  }

  // Track signer completion
  if (payload.event === "signer.signed" && payload.signerRole) {
    await prisma.$executeRawUnsafe(
      `UPDATE signing_sessions
       SET completed_signers = completed_signers || $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      JSON.stringify([payload.signerRole]),
      sess.id
    );
  }

  await logSigningEvent(sess.id, sess.tenant_id, providerKey, payload.event, payload.signerRole, payload.metadata);

  // Mark webhook as processed
  await prisma.$executeRawUnsafe(
    `UPDATE webhook_events SET processed = TRUE, processed_at = NOW()
     WHERE provider_key = $1 AND event_type = $2 AND raw_payload::text = $3
     AND processed = FALSE`,
    providerKey,
    payload.event,
    rawBody
  );
}

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

export async function resendSigningLink(
  sessionId: string,
  signerRole: SignerRole,
  tenantId: string
): Promise<void> {
  assertSignaturesEnabled();

  const sessions = await prisma.$queryRawUnsafe<
    Array<{ provider_session_id: string; provider_key: string; resend_count: number }>
  >(
    `SELECT provider_session_id, provider_key, resend_count FROM signing_sessions
     WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    sessionId,
    tenantId
  );

  const sess = sessions[0];
  if (!sess) throw new SignatureProviderError("Session not found.");
  if (sess.resend_count >= SIGNATURE_CONFIG.maxResendAttempts) {
    throw new SignatureProviderError(`Max resend attempts (${SIGNATURE_CONFIG.maxResendAttempts}) reached.`);
  }

  const provider = getProvider(sess.provider_key);
  await provider.resendToSigner(sess.provider_session_id, signerRole);

  await prisma.$executeRawUnsafe(
    `UPDATE signing_sessions SET resend_count = resend_count + 1, last_resent_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    sessionId
  );
}

// ---------------------------------------------------------------------------
// Revoke Session
// ---------------------------------------------------------------------------

export async function revokeSigningSession(
  sessionId: string,
  tenantId: string,
  reason: string
): Promise<void> {
  assertSignaturesEnabled();

  const sessions = await prisma.$queryRawUnsafe<
    Array<{ provider_session_id: string; provider_key: string }>
  >(
    `SELECT provider_session_id, provider_key FROM signing_sessions
     WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    sessionId,
    tenantId
  );

  const sess = sessions[0];
  if (!sess) throw new SignatureProviderError("Session not found.");

  const provider = getProvider(sess.provider_key);
  await provider.revokeSession(sess.provider_session_id);

  await prisma.$executeRawUnsafe(
    `UPDATE signing_sessions
     SET status = 'REVOKED', revoked_at = NOW(), revoked_reason = $1, updated_at = NOW()
     WHERE id = $2`,
    reason,
    sessionId
  );

  // Revoke all pending tokens
  await prisma.$executeRawUnsafe(
    `UPDATE signing_secure_tokens SET revoked_at = NOW()
     WHERE session_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    sessionId
  );
}

// ---------------------------------------------------------------------------
// Retrieve Signed PDF
// ---------------------------------------------------------------------------

export async function retrieveSignedPdf(
  sessionId: string,
  tenantId: string
): Promise<Buffer> {
  assertSignaturesEnabled();

  const sessions = await prisma.$queryRawUnsafe<
    Array<{ provider_session_id: string; provider_key: string; status: string }>
  >(
    `SELECT provider_session_id, provider_key, status FROM signing_sessions
     WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    sessionId,
    tenantId
  );

  const sess = sessions[0];
  if (!sess) throw new SignatureProviderError("Session not found.");
  if (sess.status !== "COMPLETED") {
    throw new SignatureProviderError(`Session is not completed. Status: ${sess.status}`);
  }

  const provider = getProvider(sess.provider_key);
  const result = await provider.retrieveSignedDocument(sess.provider_session_id);
  return result.pdfBytes;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

async function logSigningEvent(
  sessionId: string,
  tenantId: string,
  providerKey: string,
  eventType: string,
  signerRole?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO signing_events (session_id, tenant_id, event_type, signer_role, provider_key, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    sessionId,
    tenantId,
    eventType,
    signerRole ?? null,
    providerKey,
    JSON.stringify(metadata ?? {})
  );
}
