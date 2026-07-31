/**
 * Deterministic, server-signed signing tokens.
 *
 * Tokens are never persisted in raw form. Only a SHA-256 hash is stored.
 * The same inputs always produce the same token, so a link can be rebuilt
 * in-memory at dispatch time without storing the URL or plaintext token.
 */

import crypto from "node:crypto";
import { resolveTrustedSigningBaseUrl } from "@/lib/server/signing-url-config";

const TOKEN_VERSION = "v1";

export type SigningTokenClaims = {
  tenantId: string;
  sessionId: string;
  signerRole: string;
  expiresAt: string;
  tokenVersion: string;
};

function getSecret(): string {
  const secret = process.env.SIGNING_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SIGNING_TOKEN_SECRET is required and must be at least 32 characters",
    );
  }
  return secret;
}

export function generateSigningToken(options: {
  tenantId: string;
  sessionId: string;
  signerRole: string;
  expiresAt: Date | string;
  tokenVersion?: string;
}): string {
  const secret = getSecret();
  const expiresAt =
    options.expiresAt instanceof Date
      ? options.expiresAt.toISOString()
      : options.expiresAt;

  const payload: SigningTokenClaims = {
    tenantId: options.tenantId,
    sessionId: options.sessionId,
    signerRole: options.signerRole,
    expiresAt,
    tokenVersion: options.tokenVersion || TOKEN_VERSION,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`${TOKEN_VERSION}:${payloadB64}`)
    .digest("base64url");

  return `${TOKEN_VERSION}:${payloadB64}:${hmac}`;
}

export function verifySigningToken(token: string): SigningTokenClaims {
  const secret = getSecret();
  const parts = token.split(":");

  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    throw new Error("INVALID_TOKEN_FORMAT");
  }

  const [, payloadB64, hmac] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${TOKEN_VERSION}:${payloadB64}`)
    .digest("base64url");

  const a = Buffer.from(expected);
  const b = Buffer.from(hmac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("INVALID_TOKEN_SIGNATURE");
  }

  let payload: SigningTokenClaims;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as SigningTokenClaims;
  } catch {
    throw new Error("INVALID_TOKEN_PAYLOAD");
  }

  if (!payload.tokenVersion || payload.tokenVersion !== TOKEN_VERSION) {
    throw new Error("INVALID_TOKEN_VERSION");
  }

  if (
    !payload.tenantId
    || typeof payload.tenantId !== "string"
    || !payload.sessionId
    || typeof payload.sessionId !== "string"
    || !payload.signerRole
    || typeof payload.signerRole !== "string"
  ) {
    throw new Error("INVALID_TOKEN_CLAIMS");
  }

  const expiresAt = new Date(payload.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error("INVALID_TOKEN_EXPIRY");
  }
  if (expiresAt.getTime() <= Date.now()) {
    throw new Error("TOKEN_EXPIRED");
  }

  return payload;
}

export function computeTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildSigningUrl(token: string, baseUrl?: string): string {
  const base = resolveTrustedSigningBaseUrl(baseUrl);
  return `${base}/sign/${encodeURIComponent(token)}`;
}
