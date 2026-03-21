type CookieSameSite = "lax" | "strict" | "none";

const DEFAULT_COOKIE_NAME = "wathiqcare_access_token";

function parseSameSite(value: string | undefined): CookieSameSite {
    const normalized = (value || "").trim().toLowerCase();
    if (normalized === "strict" || normalized === "none") {
        return normalized;
    }
    return "lax";
}

function getCookieDomain(): string | undefined {
    const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
    return domain ? domain : undefined;
}

export function getSessionCookieName(): string {
    return process.env.AUTH_COOKIE_NAME?.trim() || DEFAULT_COOKIE_NAME;
}

export function buildSessionCookieOptions(maxAgeSeconds: number) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: parseSameSite(process.env.AUTH_COOKIE_SAME_SITE),
        path: "/",
        maxAge: maxAgeSeconds,
        domain: getCookieDomain(),
    } as const;
}

export function buildSessionCookieClearOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: parseSameSite(process.env.AUTH_COOKIE_SAME_SITE),
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        domain: getCookieDomain(),
    } as const;
}