import { NextRequest, NextResponse } from "next/server";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";
import { jsonError, logApiFailure } from "@/lib/server/http";
import { getSessionCookieName } from "@/lib/server/sessionCookie";

const LEGACY_SESSION_COOKIE_NAMES = ["wathiqcare_access_token", "token"] as const;

const TRANSIENT_BACKEND_STATUSES = new Set([429, 502, 503, 504]);

type BackendUrlResult =
    | { ok: true; url: URL }
    | { ok: false; response: NextResponse };

const PRIVATE_HOST_PATTERNS = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[0-1])\./,
    /^169\.254\./,
    /\.internal$/i,
    /\.local$/i,
    /\.svc$/i,
    /\.cluster\.local$/i,
];

function isSingleLabelHostname(hostname: string): boolean {
    return !hostname.includes(".") && hostname.toLowerCase() !== "localhost";
}

function isPrivateHost(hostname: string): boolean {
    return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function shouldRejectHost(hostname: string): boolean {
    if (process.env.NODE_ENV !== "production") {
        return false;
    }

    return isPrivateHost(hostname) || isSingleLabelHostname(hostname);
}

export function buildBackendUrl(pathname: string): BackendUrlResult {
    const baseUrl = getConfiguredBackendApiBaseUrl();
    if (!baseUrl) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    detail: "الخدمة الخلفية الخارجية غير متاحة حالياً. إذا استمرت المشكلة على هذا المسار، يرجى التحقق من إعداد BACKEND_API_BASE_URL.",
                },
                { status: 503 },
            ),
        };
    }

    let base: URL;
    try {
        base = new URL(baseUrl);
    } catch {
        return {
            ok: false,
            response: NextResponse.json(
                { detail: "تعذر الاتصال بخدمة الواجهة الخلفية." },
                { status: 500 },
            ),
        };
    }

    if (shouldRejectHost(base.hostname)) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    detail: "الخدمة الخلفية الخارجية غير متاحة حالياً. تم رفض عنوان خاص في بيئة الإنتاج.",
                },
                { status: 503 },
            ),
        };
    }

    const baseWithPath = new URL(base.toString());
    const normalizedBasePath = baseWithPath.pathname.endsWith("/")
        ? baseWithPath.pathname
        : `${baseWithPath.pathname}/`;
    baseWithPath.pathname = normalizedBasePath;

    const normalizedPath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    return { ok: true, url: new URL(normalizedPath, baseWithPath) };
}

function buildRequestTraceId(request: NextRequest): string {
    const fromHeader =
        request.headers.get("x-trace-id")?.trim() ||
        request.headers.get("x-request-id")?.trim();

    if (fromHeader) {
        return fromHeader;
    }

    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `proxy-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function shouldRetryBackendResponse(status: number, method: string): boolean {
    if (!(method === "GET" || method === "HEAD")) {
        return false;
    }

    return TRANSIENT_BACKEND_STATUSES.has(status);
}

function shouldRetryBackendError(method: string, error: unknown): boolean {
    if (!(method === "GET" || method === "HEAD")) {
        return false;
    }

    if (!(error instanceof Error)) {
        return false;
    }

    return error.name !== "AbortError";
}

function backoffDelayMs(attempt: number): number {
    return 150 * Math.pow(2, Math.max(0, attempt - 1));
}

async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildForwardHeaders(request: NextRequest, traceId: string): Headers {
    const headers = new Headers();
    const incomingAuthorization = request.headers.get("authorization")?.trim();
    const token = request.cookies.get(getSessionCookieName())?.value
        ?? LEGACY_SESSION_COOKIE_NAMES.map((name) => request.cookies.get(name)?.value).find(Boolean);
    const userAgent = request.headers.get("user-agent");
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const cookieHeader = request.headers.get("cookie");
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");

    if (incomingAuthorization) {
        headers.set("authorization", incomingAuthorization);
    } else if (token) {
        headers.set("authorization", `Bearer ${token}`);
    }

    // Some backend stacks also inspect cookies directly even when Bearer auth is present.
    if (cookieHeader) {
        headers.set("cookie", cookieHeader);
    }

    if (forwardedHost) {
        headers.set("x-forwarded-host", forwardedHost);
    }
    if (forwardedProto) {
        headers.set("x-forwarded-proto", forwardedProto);
    }

    const contentType = request.headers.get("content-type");
    if (contentType) {
        headers.set("content-type", contentType);
    }

    const accept = request.headers.get("accept");
    if (accept) {
        headers.set("accept", accept);
    }

    if (userAgent) {
        headers.set("user-agent", userAgent);
        headers.set("x-wathiqcare-user-agent", userAgent);
    }
    if (forwardedFor) {
        headers.set("x-forwarded-for", forwardedFor);
        headers.set("x-wathiqcare-forwarded-for", forwardedFor);
    }
    if (realIp) {
        headers.set("x-real-ip", realIp);
        headers.set("x-wathiqcare-real-ip", realIp);
    }

    headers.set("x-trace-id", traceId);

    return headers;
}

export async function forwardToBackend(
    request: NextRequest,
    backendPath: string,
): Promise<NextResponse> {
    const traceId = buildRequestTraceId(request);
    const built = buildBackendUrl(backendPath);
    if (!built.ok) {
        return built.response;
    }

    const targetHost = built.url.host.toLowerCase();
    const requestHost = (request.headers.get("host") || "").toLowerCase();
    const targetPath = built.url.pathname;
    const sourcePath = request.nextUrl.pathname;

    // Prevent recursive self-calls when backend base URL points to the same host+path.
    if (targetHost && requestHost && targetHost === requestHost && targetPath === sourcePath) {
        const message = "خدمة الواجهة الخلفية غير متاحة حالياً. يرجى ضبط متغير البيئة على خدمة حقيقية.";
        logApiFailure({
            traceId,
            status: 503,
            message,
            error: new Error("backend proxy recursion detected"),
            code: "BACKEND_PROXY_RECURSION",
        });
        return jsonError(503, message, { traceId });
    }

    const method = request.method.toUpperCase();
    const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
    const maxAttempts = method === "GET" || method === "HEAD" ? 3 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const backendResponse = await fetch(built.url, {
                method,
                headers: buildForwardHeaders(request, traceId),
                body,
                credentials: "include",
                redirect: "manual",
                // Propagate the incoming request's abort signal so that when the
                // client navigates away (Next.js fires request.signal), the outgoing
                // backend fetch is cancelled immediately instead of hanging.
                signal: request.signal,
            });

            if (attempt < maxAttempts && shouldRetryBackendResponse(backendResponse.status, method)) {
                await sleep(backoffDelayMs(attempt));
                continue;
            }

            const proxyHeaders = new Headers();
            const contentType = backendResponse.headers.get("content-type");
            const contentDisposition = backendResponse.headers.get("content-disposition");

            if (contentType) {
                proxyHeaders.set("content-type", contentType);
            }
            if (contentDisposition) {
                proxyHeaders.set("content-disposition", contentDisposition);
            }
            proxyHeaders.set("x-trace-id", traceId);

            if (backendResponse.status >= 400) {
                logApiFailure({
                    traceId,
                    status: backendResponse.status,
                    message: `Backend proxy returned ${backendResponse.status}`,
                    error: new Error("backend-proxy-response-failure"),
                    code: "BACKEND_PROXY_RESPONSE",
                });
            }

            return new NextResponse(backendResponse.body, {
                status: backendResponse.status,
                headers: proxyHeaders,
            });
        } catch (err) {
            // Re-throw abort errors: the client already disconnected, so there is
            // nothing to respond to. Letting Next.js handle these prevents the
            // "signal is aborted without reason" noise in server logs.
            if (err instanceof Error && err.name === "AbortError") {
                throw err;
            }

            if (attempt < maxAttempts && shouldRetryBackendError(method, err)) {
                await sleep(backoffDelayMs(attempt));
                continue;
            }

            logApiFailure({
                traceId,
                status: 503,
                message: "Backend workflow service temporarily unavailable",
                error: err,
                code: "BACKEND_PROXY_FETCH_FAILED",
            });

            return jsonError(
                503,
                "Backend workflow service is temporarily unavailable. Please retry shortly or contact support.",
                { traceId },
            );
        }
    }

    logApiFailure({
        traceId,
        status: 503,
        message: "Backend workflow service temporarily unavailable",
        error: new Error("backend-proxy-unreachable"),
        code: "BACKEND_PROXY_UNREACHABLE",
    });

    return jsonError(
        503,
        "Backend workflow service is temporarily unavailable. Please retry shortly or contact support.",
        { traceId },
    );
}
