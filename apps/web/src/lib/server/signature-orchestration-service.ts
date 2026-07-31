/**
 * Signature Orchestration Service
 *
 * High-level orchestration layer for external signature workflows.
 * Uses signature-core types + prisma for session persistence.
 * Provider adapters are injected — no provider-specific code here.
 */

import crypto from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
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
} from "@/lib/core/signature-core";
import { assertSignaturesEnabled } from "@/lib/core/signature-core";
import { buildTimelineEntry } from "@/lib/core/audit-core";
import { SIGNATURE_CONFIG } from "@/lib/config/platform-config";
import { ApiError } from "@/lib/server/http";

const prisma = () => getPrisma();

const SIGNING_SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS signing_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      document_id UUID NOT NULL,
      module_type TEXT NOT NULL
        CHECK (module_type IN ('informed_consent','discharge_refusal','promissory_note')),
      provider_key TEXT NOT NULL,
      provider_session_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','SENT','PARTIALLY_SIGNED','COMPLETED','EXPIRED','REVOKED')),
      required_signers JSONB NOT NULL DEFAULT '[]',
      completed_signers JSONB NOT NULL DEFAULT '[]',
      signer_links JSONB NOT NULL DEFAULT '{}',
      expires_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      revoked_reason TEXT,
      signed_pdf_key TEXT,
      initiated_by_id UUID NOT NULL,
      resend_count INT NOT NULL DEFAULT 0,
      last_resent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS signing_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES signing_sessions(id) ON DELETE CASCADE,
      tenant_id UUID NOT NULL,
      event_type TEXT NOT NULL,
      signer_role TEXT,
      provider_key TEXT NOT NULL,
      provider_event_id TEXT,
      payload JSONB NOT NULL DEFAULT '{}',
      ip_address TEXT,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS signing_secure_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES signing_sessions(id) ON DELETE CASCADE,
      tenant_id UUID NOT NULL,
      signer_role TEXT NOT NULL,
      token TEXT UNIQUE,
      token_hash TEXT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      ip_on_use TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    ALTER TABLE signing_secure_tokens
      ADD COLUMN IF NOT EXISTS token_hash TEXT NULL
  `,
  `
    ALTER TABLE signing_secure_tokens
      ALTER COLUMN token DROP NOT NULL
  `,
  `
    CREATE TABLE IF NOT EXISTS webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID,
      provider_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      raw_payload JSONB NOT NULL,
      hmac_verified BOOLEAN NOT NULL DEFAULT FALSE,
      processed BOOLEAN NOT NULL DEFAULT FALSE,
      processed_at TIMESTAMPTZ,
      processing_error TEXT,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_ss_tenant_document
      ON signing_sessions (tenant_id, document_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_ss_provider_session
      ON signing_sessions (provider_session_id)
      WHERE provider_session_id IS NOT NULL
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_ss_status
      ON signing_sessions (status)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_se_session
      ON signing_events (session_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_se_tenant_event
      ON signing_events (tenant_id, event_type)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_sst_token
      ON signing_secure_tokens (token)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_sst_session
      ON signing_secure_tokens (session_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_sst_expires
      ON signing_secure_tokens (expires_at)
      WHERE used_at IS NULL AND revoked_at IS NULL
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_sst_token_hash
      ON signing_secure_tokens (token_hash)
      WHERE revoked_at IS NULL AND used_at IS NULL
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_we_provider_event
      ON webhook_events (provider_key, event_type)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_we_unprocessed
      ON webhook_events (processed, received_at)
      WHERE processed = FALSE
  `,
];

let signingSchemaBootstrapPromise: Promise<void> | null = null;

async function ensureSigningSchema() {
  if (!signingSchemaBootstrapPromise) {
    signingSchemaBootstrapPromise = (async () => {
      for (const statement of SIGNING_SCHEMA_STATEMENTS) {
        await prisma().$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      signingSchemaBootstrapPromise = null;
      throw error;
    });
  }

  return signingSchemaBootstrapPromise;
}

function computeSigningTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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
  await ensureSigningSchema();

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
  const session = await prisma().$executeRawUnsafe(
    `INSERT INTO signing_sessions
       (tenant_id, document_id, module_type, provider_key, status,
        required_signers, completed_signers, signer_links, expires_at, initiated_by_id)
      VALUES ($1::uuid, $2::uuid, $3, $4, 'PENDING', $5::jsonb, '[]'::jsonb, $6::jsonb, $7::timestamptz, $8::uuid)
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
  const rows = await prisma().$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM signing_sessions
     WHERE tenant_id = $1::uuid AND document_id = $2::uuid
     ORDER BY created_at DESC LIMIT 1`,
    input.tenantId,
    input.documentId
  );

  const sessionId = rows[0]?.id;
  if (!sessionId) throw new SignatureProviderError("Failed to create signing session.");

  // Persist secure token hashes (P0-003: never store raw tokens)
  for (const t of tokenRows) {
    const tokenHash = computeSigningTokenHash(t.token);
    await prisma().$executeRawUnsafe(
            `INSERT INTO signing_secure_tokens (session_id, tenant_id, signer_role, token_hash, token, expires_at)
        VALUES ($1::uuid, $2::uuid, $3, $4, NULL, $5::timestamptz)`,
      sessionId,
      input.tenantId,
      t.signerRole,
      tokenHash,
      t.expiresAt.toISOString()
    );
  }

  // Submit to provider
  let providerSessionId: string | undefined;

  try {
    const provider = getProvider(providerKey);
    const result = await provider.submitForSigning(input, signerLinks as Record<SignerRole, string>);
    providerSessionId = result.providerSessionId;

    await prisma().$executeRawUnsafe(
      `UPDATE signing_sessions SET provider_session_id = $1, status = 'SENT', updated_at = NOW()
       WHERE id = $2::uuid`,
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
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    throw new ApiError(400, "Invalid or expired signing token");
  }

  const tokenHash = computeSigningTokenHash(normalizedToken);

  const rows = await prisma().$queryRawUnsafe<
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
     WHERE t.token_hash = $1
     LIMIT 1`,
    tokenHash
  );

  const row = rows[0];
  if (row && row.session_id && row.document_id && row.module_type && row.tenant_id && row.signer_role) {
    if (row.used_at) throw new ApiError(404, "Invalid or expired signing token");
    if (row.revoked_at) throw new ApiError(404, "Invalid or expired signing token");
    if (new Date(row.expires_at) < new Date()) {
      throw new ApiError(404, "Invalid or expired signing token");
    }
    return {
      sessionId: row.session_id,
      documentId: row.document_id,
      moduleType: row.module_type,
      signerRole: row.signer_role,
      tenantId: row.tenant_id,
    };
  }

  // Fallback to Prisma-managed signing secure tokens (Package 1 outbox model).
  const prismaToken = await prisma().signingSecureToken.findFirst({
    where: { tokenHash },
    include: { session: true },
    orderBy: { createdAt: "desc" },
  });

  if (
    !prismaToken
    || !prismaToken.session
    || prismaToken.usedAt
    || prismaToken.revokedAt
    || new Date(prismaToken.expiresAt) < new Date()
  ) {
    throw new ApiError(404, "Invalid or expired signing token");
  }

  return {
    sessionId: prismaToken.session.id,
    documentId: prismaToken.session.documentId,
    moduleType: prismaToken.session.moduleType,
    signerRole: prismaToken.signerRole,
    tenantId: prismaToken.session.tenantId,
  };
}

// ---------------------------------------------------------------------------
// Mark Token Used
// ---------------------------------------------------------------------------

export async function markTokenUsed(
  token: string,
  ipAddress?: string,
  client?: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  const db = client ?? prisma();
  const tokenHash = computeSigningTokenHash(token.trim());
  const now = new Date();

  const result = await db.signingSecureToken.updateMany({
    where: {
      tokenHash,
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now, ipOnUse: ipAddress ?? null },
  });

  if (result.count !== 1) {
    throw new ApiError(409, "Token already used, revoked, or expired");
  }
}

// ---------------------------------------------------------------------------
// Process Webhook Event
// ---------------------------------------------------------------------------

export async function processSigningWebhook(
  rawBody: string,
  receivedHmac: string,
  providerKey: string
): Promise<void> {
  await ensureSigningSchema();
  // Verify HMAC
  const valid = verifyWebhookSignature(rawBody, receivedHmac);
  if (!valid) {
    throw new SignatureProviderError("Webhook HMAC verification failed.");
  }

  const payload = JSON.parse(rawBody) as SigningWebhookPayload;

  // Log raw event
  await prisma().$executeRawUnsafe(
    `INSERT INTO webhook_events (provider_key, event_type, raw_payload, hmac_verified)
     VALUES ($1, $2, $3::jsonb, TRUE)`,
    providerKey,
    payload.event,
    rawBody
  );

  // Find session
  const sessions = await prisma().$queryRawUnsafe<Array<{ id: string; tenant_id: string; document_id: string }>>(
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
    await prisma().$executeRawUnsafe(
      `UPDATE signing_sessions SET status = $1, updated_at = NOW(),
        completed_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE completed_at END
       WHERE id = $2`,
      newStatus,
      sess.id
    );
  }

  // Track signer completion
  if (payload.event === "signer.signed" && payload.signerRole) {
    await prisma().$executeRawUnsafe(
      `UPDATE signing_sessions
       SET completed_signers = completed_signers || $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      JSON.stringify([payload.signerRole]),
      sess.id
    );
  }

  await logSigningEvent(sess.id, sess.tenant_id, providerKey, payload.event, payload.signerRole, payload.metadata);

  // Mark webhook as processed
  await prisma().$executeRawUnsafe(
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
  await ensureSigningSchema();

  const sessions = await prisma().$queryRawUnsafe<
    Array<{ provider_session_id: string; provider_key: string; resend_count: number }>
  >(
    `SELECT provider_session_id, provider_key, resend_count FROM signing_sessions
     WHERE id = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
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

  await prisma().$executeRawUnsafe(
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
  await ensureSigningSchema();

  const sessions = await prisma().$queryRawUnsafe<
    Array<{ provider_session_id: string; provider_key: string }>
  >(
    `SELECT provider_session_id, provider_key FROM signing_sessions
     WHERE id = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
    sessionId,
    tenantId
  );

  const sess = sessions[0];
  if (!sess) throw new SignatureProviderError("Session not found.");

  const provider = getProvider(sess.provider_key);
  await provider.revokeSession(sess.provider_session_id);

  await prisma().$executeRawUnsafe(
    `UPDATE signing_sessions
     SET status = 'REVOKED', revoked_at = NOW(), revoked_reason = $1, updated_at = NOW()
     WHERE id = $2`,
    reason,
    sessionId
  );

  // Revoke all pending tokens
  await prisma().$executeRawUnsafe(
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
  await ensureSigningSchema();

  const sessions = await prisma().$queryRawUnsafe<
    Array<{ provider_session_id: string; provider_key: string; status: string }>
  >(
    `SELECT provider_session_id, provider_key, status FROM signing_sessions
     WHERE id = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
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
  await ensureSigningSchema();
  await prisma().$executeRawUnsafe(
    `INSERT INTO signing_events (session_id, tenant_id, event_type, signer_role, provider_key, payload)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb)`,
    sessionId,
    tenantId,
    eventType,
    signerRole ?? null,
    providerKey,
    JSON.stringify(metadata ?? {})
  );
}
