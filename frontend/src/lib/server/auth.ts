import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";

const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";

function authDebugLog(event: string, details: Record<string, unknown> = {}): void {
  if (!AUTH_DEBUG) {
    return;
  }

  console.info("[auth-debug]", event, details);
}

export type AuthContext = {
  sub: string;
  email?: string;
  role?: string;
  tenant_id: string;
  tenant_code?: string;
  exp?: number;
};

const ROLE_ALIASES: Record<string, string> = {
  tenant_admin: "ADMIN",
  legal_admin: "ADMIN",
  admin: "ADMIN",
  owner: "OWNER",
  doctor: "MANAGER",
  nurse: "MEMBER",
  legal_officer: "MANAGER",
  viewer: "VIEWER",
};

function normalizeRole(role: string): string {
  const cleaned = role.trim();
  if (!cleaned) {
    return "";
  }

  const alias = ROLE_ALIASES[cleaned.toLowerCase()];
  if (alias) {
    return alias;
  }

  return cleaned.toUpperCase();
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function readToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    authDebugLog("token_source", { source: "authorization_header" });
    return authorization.slice(7).trim();
  }

  const cookieToken = request.cookies.get("wathiqcare_access_token")?.value ?? null;
  authDebugLog("token_source", {
    source: cookieToken ? "cookie" : "none",
    hasCookie: Boolean(cookieToken),
  });
  return cookieToken;
}

function verifyHs256(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [header, payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret || secret === "change-me") {
    throw new ApiError(500, "Server auth is not configured");
  }

  return secret;
}

export function requireAuth(request: NextRequest): AuthContext {
  const token = readToken(request);
  if (!token) {
    authDebugLog("auth_failure", { reason: "missing_access_token" });
    throw new ApiError(401, "Missing access token");
  }

  const secret = getJwtSecret();
  if (!verifyHs256(token, secret)) {
    authDebugLog("auth_failure", { reason: "invalid_signature" });
    throw new ApiError(401, "Invalid access token signature");
  }

  const [, payload] = token.split(".");
  let parsedPayload: AuthContext;

  try {
    parsedPayload = JSON.parse(decodeBase64Url(payload)) as AuthContext;
  } catch {
    authDebugLog("auth_failure", { reason: "malformed_token" });
    throw new ApiError(401, "Malformed access token");
  }

  if (!parsedPayload.sub || !parsedPayload.tenant_id) {
    authDebugLog("auth_failure", { reason: "invalid_claims" });
    throw new ApiError(401, "Invalid access token claims");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof parsedPayload.exp === "number" && parsedPayload.exp < now) {
    authDebugLog("auth_failure", { reason: "token_expired", exp: parsedPayload.exp, now });
    throw new ApiError(401, "Access token expired");
  }

  authDebugLog("auth_success", {
    userId: parsedPayload.sub,
    tenantId: parsedPayload.tenant_id,
    role: parsedPayload.role || null,
  });

  return parsedPayload;
}

export function requireTenantAccess(request: NextRequest, tenantId: string): AuthContext {
  const auth = requireAuth(request);

  if (auth.tenant_id !== tenantId) {
    throw new ApiError(403, "Tenant access denied");
  }

  return auth;
}

export function requireRole(auth: AuthContext, allowedRoles: string[]): void {
  const role = normalizeRole(auth.role ?? "");
  const normalizedAllowedRoles = allowedRoles.map((item) => normalizeRole(item));

  if (!normalizedAllowedRoles.includes(role)) {
    throw new ApiError(403, "Insufficient role permissions");
  }
}
