import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { getJwtSecret } from "@/lib/server/jwt";
import { buildSessionCookieClearOptions, buildSessionCookieOptions } from "@/lib/server/sessionCookie";

const PUBLIC_SIGNING_SESSION_COOKIE_NAME = "wathiqcare_public_signing_session";

export type PublicSigningSessionPayload = {
  documentId: string;
  token?: string;
  tokenHash: string;
  signerRole: string;
  tenantId: string;
  moduleType: string;
  challengeId: string;
  verifiedAt: string;
  expiresAt: string;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string): string {
  return crypto.createHmac("sha256", getJwtSecret()).update(encodedPayload).digest("base64url");
}

export function getPublicSigningSessionCookieName(): string {
  return process.env.PUBLIC_SIGNING_SESSION_COOKIE_NAME?.trim() || PUBLIC_SIGNING_SESSION_COOKIE_NAME;
}

export function createPublicSigningSessionCookieValue(payload: PublicSigningSessionPayload): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parsePublicSigningSessionCookieValue(value: string): PublicSigningSessionPayload {
  const parts = String(value || "").split(".");
  if (parts.length !== 2) {
    throw new ApiError(401, "Invalid public signing session");
  }

  const [encodedPayload, encodedSignature] = parts;
  const expectedSignature = signPayload(encodedPayload);
  const providedBuffer = Buffer.from(encodedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new ApiError(401, "Invalid public signing session");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new ApiError(401, "Invalid public signing session");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiError(401, "Invalid public signing session");
  }

  const payload = parsed as Partial<PublicSigningSessionPayload>;
  if (
    !payload.documentId
    || !payload.tokenHash
    || !payload.signerRole
    || !payload.tenantId
    || !payload.moduleType
    || !payload.challengeId
    || !payload.verifiedAt
    || !payload.expiresAt
  ) {
    throw new ApiError(401, "Invalid public signing session");
  }

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    throw new ApiError(401, "Public signing session expired");
  }

  return {
    documentId: String(payload.documentId),
    tokenHash: String(payload.tokenHash),
    signerRole: String(payload.signerRole),
    tenantId: String(payload.tenantId),
    moduleType: String(payload.moduleType),
    challengeId: String(payload.challengeId),
    verifiedAt: String(payload.verifiedAt),
    expiresAt: String(payload.expiresAt),
  };
}

export function readPublicSigningSession(request: NextRequest): PublicSigningSessionPayload {
  const value = request.cookies.get(getPublicSigningSessionCookieName())?.value;
  if (!value) {
    throw new ApiError(401, "Missing public signing session");
  }
  return parsePublicSigningSessionCookieValue(value);
}

export function buildPublicSigningSessionCookieOptions(expiresAt: string, request?: Request) {
  const maxAgeSeconds = Math.max(1, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  return buildSessionCookieOptions(maxAgeSeconds, request);
}

export function buildPublicSigningSessionClearOptions(request?: Request) {
  return buildSessionCookieClearOptions(request);
}