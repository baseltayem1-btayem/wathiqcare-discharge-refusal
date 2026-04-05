type CookieSameSite = "lax" | "strict" | "none";

const DEFAULT_COOKIE_NAME = "wathiqcare_access_token";
const PRIMARY_PUBLIC_DOMAIN = "wathiqcare.online";

function parseSameSite(value: string | undefined): CookieSameSite {
  const normalized = (value || "").trim().toLowerCase();

  if (normalized === "strict") return "strict";
  if (normalized === "none") return "none";

  return "lax";
}

function normalizeHost(host: string | null | undefined): string {
  const value = (host || "").trim().toLowerCase();
  if (!value) return "";
  return value.includes(":") ? value.split(":")[0] : value;
}

function normalizeDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function shouldUseSharedCookieDomain(host: string): boolean {
  return host === PRIMARY_PUBLIC_DOMAIN || host.endsWith(`.${PRIMARY_PUBLIC_DOMAIN}`);
}

function getCookieDomain(request?: Request): string | undefined {
  const configuredDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (configuredDomain) {
    return normalizeDomain(configuredDomain);
  }

  // الأفضل افتراضيًا: host-only cookie
  // لا نستخدم shared domain إلا إذا كنا فعلاً على الدومين الرسمي
  if (!request || process.env.NODE_ENV !== "production") {
    return undefined;
  }

  const host = normalizeHost(
    request.headers.get("x-forwarded-host") || request.headers.get("host"),
  );

  if (!host) {
    return undefined;
  }

  if (shouldUseSharedCookieDomain(host)) {
    return `.${PRIMARY_PUBLIC_DOMAIN}`;
  }

  // أي domain آخر مثل vercel preview أو vercel.app
  // يبقى host-only لتفادي رفض الكوكي
  return undefined;
}

export function getSessionCookieName(): string {
  return process.env.AUTH_COOKIE_NAME?.trim() || DEFAULT_COOKIE_NAME;
}

export function buildSessionCookieOptions(maxAgeSeconds: number, request?: Request) {
  const sameSite = parseSameSite(process.env.AUTH_COOKIE_SAME_SITE);
  const secure = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: maxAgeSeconds,
    domain: getCookieDomain(request),
  } as const;
}

export function buildSessionCookieClearOptions(request?: Request) {
  const sameSite = parseSameSite(process.env.AUTH_COOKIE_SAME_SITE);
  const secure = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    domain: getCookieDomain(request),
  } as const;
}