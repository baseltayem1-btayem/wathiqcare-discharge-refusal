const SESSION_KEY = "wathiqcare_auth_session";
const LEGACY_TOKEN_KEY = "wathiqcare_access_token";
export const AUTH_SESSION_UPDATED_EVENT = "wathiqcare:auth-session-updated";

export type AuthSessionTokens = {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: string;
    issuedAt: number;
};

function parseDurationToMs(raw: string | undefined): number | null {
    if (!raw) {
        return null;
    }

    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric * 1000;
    }

    const match = trimmed.match(/^(\d+)([smhd])$/);
    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const factor: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return amount * factor[unit];
}

function hasWindow() {
    return typeof window !== "undefined";
}

function emitSessionUpdated() {
    if (!hasWindow()) {
        return;
    }

    window.dispatchEvent(new Event(AUTH_SESSION_UPDATED_EVENT));
}

export function getStoredSessionTokens(): AuthSessionTokens | null {
    if (!hasWindow()) {
        return null;
    }

    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) {
        const legacy = window.localStorage.getItem(LEGACY_TOKEN_KEY);
        if (!legacy) {
            return null;
        }
        return {
            accessToken: legacy,
            issuedAt: Date.now(),
        };
    }

    try {
        const parsed = JSON.parse(raw) as Partial<AuthSessionTokens>;
        if (!parsed.accessToken || typeof parsed.accessToken !== "string") {
            return null;
        }

        return {
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken,
            expiresIn: parsed.expiresIn,
            issuedAt: typeof parsed.issuedAt === "number" ? parsed.issuedAt : Date.now(),
        };
    } catch {
        return null;
    }
}

export function getAccessToken(): string | null {
    return getStoredSessionTokens()?.accessToken || null;
}

export function getSessionExpiryEpochMs(session: AuthSessionTokens | null): number | null {
    if (!session?.expiresIn) {
        return null;
    }

    const durationMs = parseDurationToMs(session.expiresIn);
    if (!durationMs) {
        return null;
    }

    return session.issuedAt + durationMs;
}

export function isSessionExpired(session: AuthSessionTokens | null, skewMs = 0): boolean {
    const expiry = getSessionExpiryEpochMs(session);
    if (!expiry) {
        return false;
    }
    return Date.now() + skewMs >= expiry;
}

export function isSessionNearExpiry(session: AuthSessionTokens | null, thresholdMs = 60_000): boolean {
    return isSessionExpired(session, thresholdMs);
}

export function setStoredSessionTokens(next: Omit<AuthSessionTokens, "issuedAt">) {
    if (!hasWindow()) {
        return;
    }

    const payload: AuthSessionTokens = {
        ...next,
        issuedAt: Date.now(),
    };

    window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    window.localStorage.setItem(LEGACY_TOKEN_KEY, payload.accessToken);
    emitSessionUpdated();
}

export function clearStoredSessionTokens() {
    if (!hasWindow()) {
        return;
    }

    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    emitSessionUpdated();
}
