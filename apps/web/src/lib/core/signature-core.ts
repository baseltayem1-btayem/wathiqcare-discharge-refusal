/**
 * Signature Core — Enterprise External Signature Orchestration
 *
 * Provider-agnostic signature workflow engine for:
 *   - informed consents
 *   - discharge refusal documents
 *   - promissory notes
 *
 * Adapters (PDF Filler, Taqniat, DocuSign) implement the
 * ISignatureProvider interface. Never call providers directly
 * from module services.
 */

import crypto from "crypto";
import { SIGNATURE_CONFIG } from "@/lib/config/platform-config";
import { ENABLE_EXTERNAL_SIGNATURES, ENABLE_SECURE_SIGNING_LINKS } from "@/lib/config/feature-flags";

// ---------------------------------------------------------------------------
// Signer Types
// ---------------------------------------------------------------------------

export type SignerRole =
  | "PATIENT"
  | "GUARDIAN"
  | "PHYSICIAN"
  | "WITNESS"
  | "INTERPRETER";

export interface SignerDefinition {
  role: SignerRole;
  name: string;
  nameAr?: string;
  mobile?: string;
  email?: string;
  nationalId?: string;
}

// ---------------------------------------------------------------------------
// Signing Session
// ---------------------------------------------------------------------------

export interface SigningSessionInput {
  /** Platform document ID */
  documentId: string;
  /** Module type */
  moduleType: "informed_consent" | "discharge_refusal" | "promissory_note";
  /** Tenant ID */
  tenantId: string;
  /** Original PDF bytes to send for signing */
  pdfBytes: Buffer;
  /** Signers required */
  signers: SignerDefinition[];
  /** Expiry in hours (defaults to SIGNATURE_CONFIG.linkExpiryHours) */
  expiryHours?: number;
  /** Actor who initiated */
  initiatedBy: string;
}

export interface SigningSession {
  /** Internal session ID */
  sessionId: string;
  /** External provider session/envelope ID */
  providerSessionId?: string;
  /** Map of role → secure link */
  signerLinks: Record<SignerRole, string>;
  /** Session expiry timestamp */
  expiresAt: string;
  /** Current status */
  status: SigningSessionStatus;
  createdAt: string;
}

export type SigningSessionStatus =
  | "PENDING"
  | "SENT"
  | "PARTIALLY_SIGNED"
  | "COMPLETED"
  | "EXPIRED"
  | "REVOKED";

// ---------------------------------------------------------------------------
// Secure Link Generator
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure signing link.
 * Token is URL-safe base64, 32 bytes entropy.
 */
export function generateSecureSigningToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Build a complete signing URL from a token.
 * Route must be registered in the Next.js app under /sign/[token].
 */
export function buildSigningUrl(token: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.NEXTAUTH_URL ?? "https://wathiqcare.online";
  return `${base}/sign/${encodeURIComponent(token)}`;
}

/**
 * Compute expiry date from now.
 */
export function computeSigningExpiry(hours?: number): Date {
  const h = hours ?? SIGNATURE_CONFIG.linkExpiryHours;
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Provider Interface
// ---------------------------------------------------------------------------

export interface SignatureProviderResult {
  providerSessionId: string;
  /** Provider-specific status after submission */
  status: "submitted" | "failed";
  error?: string;
}

export interface SignedDocumentResult {
  /** Signed PDF bytes */
  pdfBytes: Buffer;
  /** Signature metadata from provider */
  signatureMetadata: Record<string, unknown>;
  /** Signed at timestamp */
  signedAt: string;
}

/**
 * All external signature providers must implement this interface.
 * Never depend on a concrete provider class — always use this interface.
 */
export interface ISignatureProvider {
  readonly providerKey: string;

  /**
   * Submit a document for signing.
   * Returns provider session ID and initial status.
   */
  submitForSigning(
    input: SigningSessionInput,
    signerLinks: Record<SignerRole, string>
  ): Promise<SignatureProviderResult>;

  /**
   * Retrieve the signed PDF after all parties have signed.
   */
  retrieveSignedDocument(providerSessionId: string): Promise<SignedDocumentResult>;

  /**
   * Revoke an active signing session.
   */
  revokeSession(providerSessionId: string): Promise<void>;

  /**
   * Resend signing link to a specific signer.
   */
  resendToSigner(
    providerSessionId: string,
    signerRole: SignerRole
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

export function assertSignaturesEnabled(): void {
  if (!ENABLE_EXTERNAL_SIGNATURES) {
    throw new SignatureDisabledError(
      "External signatures are disabled by feature flag FF_ENABLE_EXTERNAL_SIGNATURES."
    );
  }
}

export function assertSecureLinksEnabled(): void {
  if (!ENABLE_SECURE_SIGNING_LINKS) {
    throw new SignatureDisabledError(
      "Secure signing links are disabled by feature flag FF_ENABLE_SECURE_SIGNING_LINKS."
    );
  }
}

// ---------------------------------------------------------------------------
// Webhook Event
// ---------------------------------------------------------------------------

export type SigningWebhookEvent =
  | "signer.viewed"
  | "signer.signed"
  | "session.completed"
  | "session.expired"
  | "session.declined";

export interface SigningWebhookPayload {
  providerKey: string;
  event: SigningWebhookEvent;
  providerSessionId: string;
  signerRole?: SignerRole;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Verify a webhook HMAC signature.
 * Secret must be stored in env var defined by SIGNATURE_CONFIG.webhookSecretEnv.
 */
export function verifyWebhookSignature(
  rawBody: string,
  receivedHmac: string
): boolean {
  const secret = process.env[SIGNATURE_CONFIG.webhookSecretEnv];
  if (!secret) {
    throw new Error(`Webhook secret not configured: ${SIGNATURE_CONFIG.webhookSecretEnv}`);
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  // Constant-time comparison
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(receivedHmac.replace(/^sha256=/, ""), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class SignatureDisabledError extends Error {
  readonly code = "SIGNATURE_DISABLED" as const;
  constructor(message: string) {
    super(message);
    this.name = "SignatureDisabledError";
  }
}

export class SignatureProviderError extends Error {
  readonly code = "SIGNATURE_PROVIDER_FAILED" as const;
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SignatureProviderError";
  }
}

export class SignatureExpiredError extends Error {
  readonly code = "SIGNATURE_EXPIRED" as const;
  constructor(message: string) {
    super(message);
    this.name = "SignatureExpiredError";
  }
}
