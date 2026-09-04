export type EdgeSessionClaims = {
  sub?: string;
  user_type?: "platform_admin" | "tenant_admin" | "tenant_user";
  exp?: number;
  iss?: string;
};

const DEFAULT_ISSUER = "wathiqcare";
const DEFAULT_CLOCK_SKEW_SECONDS = 30;

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

function clockSkewSeconds(): number {
  const parsed = Number(process.env.JWT_CLOCK_SKEW_SECONDS || DEFAULT_CLOCK_SKEW_SECONDS);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : DEFAULT_CLOCK_SKEW_SECONDS;
}

/** Edge-safe routing check. APIs still perform database-backed authorization. */
export async function verifyEdgeSession(token: string | undefined): Promise<EdgeSessionClaims | null> {
  if (!token) return null;
  const secret = process.env.JWT_SECRET_KEY?.trim();
  if (!secret || secret === "change-me") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = decodeJson<{ alg?: string; typ?: string }>(encodedHeader);
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    if (!valid) return null;
    const claims = decodeJson<EdgeSessionClaims>(encodedPayload);
    const issuer = (process.env.JWT_ISSUER || DEFAULT_ISSUER).trim() || DEFAULT_ISSUER;
    const now = Math.floor(Date.now() / 1000);
    if (!claims.sub || claims.iss !== issuer) return null;
    if (typeof claims.exp !== "number" || claims.exp + clockSkewSeconds() < now) return null;
    return claims;
  } catch {
    return null;
  }
}
