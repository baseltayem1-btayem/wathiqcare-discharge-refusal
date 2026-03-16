import { runtimeConfig } from "@/lib/config/runtime";
import {
    clearStoredSessionTokens,
    getAccessToken,
    getStoredSessionTokens,
    isSessionNearExpiry,
    setStoredSessionTokens,
} from "@/lib/api/token-store";

type ApiSuccessEnvelope<T> = {
    success: true;
    data: T;
};

type ApiFailureEnvelope = {
    success: false;
    error?: {
        code?: number;
        message?: string;
    };
    detail?: string;
    message?: string;
};

type ApiOptions = {
    signal?: AbortSignal;
};

type RefreshResult = {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: string;
};

let refreshPromise: Promise<string | null> | null = null;
const BACKEND_UNAVAILABLE_DETAIL = "الخدمة الخلفية غير متاحة حالياً. يرجى المحاولة لاحقاً.";
const BACKEND_UNAVAILABLE_CODES = new Set([
    "backend_unavailable",
    "backend_target_rejected",
    "backend_loop",
    "backend_unreachable",
]);

function isLikelyHtmlPayload(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return false;
    }

    return (
        normalized.startsWith("<!doctype html") ||
        normalized.startsWith("<html") ||
        (normalized.includes("<html") && normalized.includes("</html>"))
    );
}

function isInfrastructureErrorPayload(value: string): boolean {
    const normalized = value.toLowerCase();
    return (
        normalized.includes("web app is stopped") ||
        normalized.includes("site disabled") ||
        normalized.includes("application error")
    );
}

function shouldHideRawServerPayload(value: string): boolean {
    return isLikelyHtmlPayload(value) || isInfrastructureErrorPayload(value);
}

function emitApiError(message: string, status: number) {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(
        new CustomEvent("wathiqcare:api-error", {
            detail: {
                message,
                status,
            },
        }),
    );
}

function buildUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${runtimeConfig.apiProxyPrefix}${normalized}`;
}

function isAuthPath(path: string): boolean {
    const normalized = path.split("?")[0];
    return (
        normalized.endsWith("/auth/login") ||
        normalized.endsWith("/auth/refresh") ||
        normalized.endsWith("/auth/logout")
    );
}

function parseRefreshBody(body: unknown): RefreshResult | null {
    if (!body || typeof body !== "object") {
        return null;
    }

    const envelope = body as Record<string, unknown>;
    if (envelope.success === true && envelope.data && typeof envelope.data === "object") {
        const payload = envelope.data as Record<string, unknown>;
        const accessToken = typeof payload.accessToken === "string" ? payload.accessToken : null;
        if (!accessToken) {
            return null;
        }
        return {
            accessToken,
            refreshToken:
                typeof payload.refreshToken === "string" ? payload.refreshToken : undefined,
            expiresIn: typeof payload.expiresIn === "string" ? payload.expiresIn : undefined,
        };
    }

    const accessToken = typeof envelope.accessToken === "string" ? envelope.accessToken : null;
    if (!accessToken) {
        return null;
    }
    return {
        accessToken,
        refreshToken:
            typeof envelope.refreshToken === "string" ? envelope.refreshToken : undefined,
        expiresIn: typeof envelope.expiresIn === "string" ? envelope.expiresIn : undefined,
    };
}

async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) {
        return refreshPromise;
    }

    const session = getStoredSessionTokens();
    if (!session?.refreshToken) {
        return null;
    }

    refreshPromise = (async () => {
        try {
            const response = await fetch(buildUrl("/auth/refresh"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ refreshToken: session.refreshToken }),
                signal: AbortSignal.timeout(Math.min(runtimeConfig.apiTimeoutMs, 10_000)),
            });

            const body = await parseResponseBody(response);
            if (!response.ok) {
                return null;
            }

            const refreshResult = parseRefreshBody(body);
            if (!refreshResult?.accessToken) {
                return null;
            }

            setStoredSessionTokens({
                accessToken: refreshResult.accessToken,
                refreshToken: refreshResult.refreshToken || session.refreshToken,
                expiresIn: refreshResult.expiresIn,
            });

            return refreshResult.accessToken;
        } catch {
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

function messageFromBody(status: number, body: unknown): string {
    if (body && typeof body === "object") {
        const record = body as Record<string, unknown>;

        const code = typeof record.code === "string" ? record.code : null;
        const detail = typeof record.detail === "string" ? record.detail.trim() : "";
        if (code && BACKEND_UNAVAILABLE_CODES.has(code)) {
            return detail || BACKEND_UNAVAILABLE_DETAIL;
        }

        const errorValue = record.error;
        if (errorValue && typeof errorValue === "object") {
            const nestedRecord = errorValue as Record<string, unknown>;
            const nestedCode = typeof nestedRecord.code === "string" ? nestedRecord.code : null;
            const nestedMessage = nestedRecord.message;
            if (nestedCode && BACKEND_UNAVAILABLE_CODES.has(nestedCode)) {
                return typeof nestedMessage === "string" && nestedMessage.trim()
                    ? nestedMessage.trim()
                    : detail || BACKEND_UNAVAILABLE_DETAIL;
            }
            if (typeof nestedMessage === "string" && nestedMessage.trim()) {
                if (shouldHideRawServerPayload(nestedMessage)) {
                    return BACKEND_UNAVAILABLE_DETAIL;
                }
                return `${status}: ${nestedMessage}`;
            }
        }

        if (detail) {
            if (shouldHideRawServerPayload(detail)) {
                return BACKEND_UNAVAILABLE_DETAIL;
            }
            return `${status}: ${detail}`;
        }

        const message = record.message;
        if (typeof message === "string" && message.trim()) {
            if (shouldHideRawServerPayload(message)) {
                return BACKEND_UNAVAILABLE_DETAIL;
            }
            return `${status}: ${message}`;
        }
    }

    if (typeof body === "string" && body.trim()) {
        if (shouldHideRawServerPayload(body)) {
            return BACKEND_UNAVAILABLE_DETAIL;
        }
        return `${status}: ${body}`;
    }

    return `Request failed with status ${status}`;
}

export class ApiClientError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

async function parseResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return response.json().catch(() => null);
    }

    return response.text().catch(() => "");
}

export async function apiRequest<T>(
    path: string,
    init: RequestInit = {},
    options: ApiOptions = {},
): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), runtimeConfig.apiTimeoutMs);

    const headers = new Headers(init.headers || {});
    let token = getAccessToken();
    const hasBody = init.body !== undefined && init.body !== null;

    if (!isAuthPath(path)) {
        const session = getStoredSessionTokens();
        if (session?.refreshToken && isSessionNearExpiry(session, 45_000)) {
            const refreshedToken = await refreshAccessToken();
            if (refreshedToken) {
                token = refreshedToken;
            }
        }
    }

    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    if (hasBody && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    try {
        const url = buildUrl(path);

        const send = async (requestHeaders: Headers) => {
            const response = await fetch(url, {
                ...init,
                headers: requestHeaders,
                signal: options.signal || controller.signal,
            });

            const body = await parseResponseBody(response);
            return { response, body };
        };

        let { response, body } = await send(headers);

        if (
            response.status === 401 &&
            !isAuthPath(path) &&
            headers.get("x-wathiqcare-refresh-retry") !== "1"
        ) {
            const refreshedToken = await refreshAccessToken();
            if (refreshedToken) {
                const retryHeaders = new Headers(headers);
                retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
                retryHeaders.set("x-wathiqcare-refresh-retry", "1");
                ({ response, body } = await send(retryHeaders));
            }
        }

        if (!response.ok) {
            if (response.status === 401) {
                clearStoredSessionTokens();
            }

            const message = messageFromBody(response.status, body);
            if (response.status >= 500) {
                emitApiError(message, response.status);
            }
            throw new ApiClientError(response.status, message);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        if (body && typeof body === "object" && "success" in (body as Record<string, unknown>)) {
            const envelope = body as ApiSuccessEnvelope<T> | ApiFailureEnvelope;
            if (envelope.success === false) {
                const message = messageFromBody(response.status, envelope);
                throw new ApiClientError(response.status || 500, message);
            }
            return (envelope as ApiSuccessEnvelope<T>).data;
        }

        return body as T;
    } catch (error) {
        if (error instanceof ApiClientError) {
            throw error;
        }

        const message = error instanceof Error ? error.message : "Network request failed";
        emitApiError(message, 0);
        throw new ApiClientError(0, message);
    } finally {
        clearTimeout(timeout);
    }
}

function withQuery(
    path: string,
    query?: Record<string, string | number | boolean | null | undefined>,
) {
    if (!query) {
        return path;
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") {
            continue;
        }
        params.set(key, String(value));
    }

    const queryString = params.toString();
    if (!queryString) {
        return path;
    }

    return `${path}${path.includes("?") ? "&" : "?"}${queryString}`;
}

export const apiClient = {
    get: <T>(path: string, query?: Record<string, string | number | boolean | null | undefined>) =>
        apiRequest<T>(withQuery(path, query), { method: "GET" }),

    post: <T, B = unknown>(path: string, body?: B) =>
        apiRequest<T>(path, {
            method: "POST",
            body: body === undefined ? undefined : JSON.stringify(body),
        }),

    patch: <T, B = unknown>(path: string, body?: B) =>
        apiRequest<T>(path, {
            method: "PATCH",
            body: body === undefined ? undefined : JSON.stringify(body),
        }),

    put: <T, B = unknown>(path: string, body?: B) =>
        apiRequest<T>(path, {
            method: "PUT",
            body: body === undefined ? undefined : JSON.stringify(body),
        }),

    delete: <T>(path: string) =>
        apiRequest<T>(path, { method: "DELETE" }),
};
