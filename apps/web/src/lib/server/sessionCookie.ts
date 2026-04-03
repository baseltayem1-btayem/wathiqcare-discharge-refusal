type CookieSameSite = "lax" | "strict" | "none";

const DEFAULT_COOKIE_NAME = "wathiqcare_access_token";
const PRIMARY_PUBLIC_DOMAIN = "wathiqcare.online";

function parseSameSite(value: string | undefined): CookieSameSite {
    const normalized = (value || "").trim().toLowerCase();
    if (normalized === "strict" || normalized === "none") {
        return normalized;
    }
    return "lax";
}

function normalizeDomain(domain: string): string {
    const trimmed = domain.trim().toLowerCase();
    if (!trimmed) {
        return trimmed;
    }
    return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function normalizeHost(host: string | null | undefined): string {
    const value = (host || "").trim().toLowerCase();
    if (!value) {
        return "";
    }
    const withoutPort = value.includes(":") ? value.split(":")[0] : value;
    return withoutPort;
}

function getCookieDomain(request?: Request): string | undefined {
    const configuredDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
    if (configuredDomain) {
        return normalizeDomain(configuredDomain);
    }

    // Fallback hardening for production when env is missing:
    // if the request host is wathiqcare.online or any subdomain, share cookie across all subdomains.
    if (process.env.NODE_ENV === "production" && request) {
        const host = normalizeHost(
            request.headers.get("x-forwarded-host") || request.headers.get("host"),
        );

        if (host === PRIMARY_PUBLIC_DOMAIN || host.endsWith(`.${PRIMARY_PUBLIC_DOMAIN}`)) {
            return `.${PRIMARY_PUBLIC_DOMAIN}`;
        }
    }

    // Undefined keeps it host-only (useful for localhost/custom dev domains).
    return undefined;
}

export function getSessionCookieName(): string {
    return process.env.AUTH_COOKIE_NAME?.trim() || DEFAULT_COOKIE_NAME;
}

export function buildSessionCookieOptions(maxAgeSeconds: number, request?: Request) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: parseSameSite(process.env.AUTH_COOKIE_SAME_SITE),
        path: "/",
        maxAge: maxAgeSeconds,
        domain: getCookieDomain(request),
    } as const;
}

export function buildSessionCookieClearOptions(request?: Request) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: parseSameSite(process.env.AUTH_COOKIE_SAME_SITE),
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        domain: getCookieDomain(request),
    } as const;
}
