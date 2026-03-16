import { NextRequest, NextResponse } from "next/server";
import {
    type BackendApiBaseUrlSource,
    getConfiguredBackendApiBaseUrlConfig,
} from "@/lib/server/backend";

type BackendUrlResult =
    | { ok: true; url: URL }
    | { ok: false; response: NextResponse };

const BACKEND_UNAVAILABLE_DETAIL = "الخدمة الخلفية غير متاحة حالياً. يرجى المحاولة لاحقاً.";

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

function buildBackendErrorResponse(code: string, detail = BACKEND_UNAVAILABLE_DETAIL, status = 503) {
    return NextResponse.json({ code, detail }, { status });
}

function isHtmlContentType(contentType: string | null): boolean {
    return (contentType || "").toLowerCase().includes("text/html");
}

function isInfrastructureHtmlError(payload: string): boolean {
    const normalized = payload.toLowerCase();
    return (
        normalized.includes("web app is stopped") ||
        normalized.includes("site disabled") ||
        normalized.includes("application error")
    );
}

function shouldRejectHost(hostname: string, source: BackendApiBaseUrlSource): boolean {
    if (process.env.NODE_ENV !== "production") {
        return false;
    }

    // Allow internal Docker service DNS and localhost preview fallback only for server-side calls.
    if (source === "BACKEND_NEST_API_BASE_URL" || source === "localhost-preview-fallback") {
        return false;
    }

    return isPrivateHost(hostname) || isSingleLabelHostname(hostname);
}

export function buildBackendUrl(pathname: string, requestHost?: string): BackendUrlResult {
    const baseUrlConfig = getConfiguredBackendApiBaseUrlConfig(requestHost);
    if (!baseUrlConfig) {
        console.error("[backendProxy] Missing backend base URL configuration", {
            pathname,
            requestHost: requestHost || null,
            nodeEnv: process.env.NODE_ENV,
            hasBackendNestApiBaseUrl: Boolean(process.env.BACKEND_NEST_API_BASE_URL),
            hasBackendApiBaseUrl: Boolean(process.env.BACKEND_API_BASE_URL),
            hasBackendUrl: Boolean(process.env.BACKEND_URL),
            hasNextPublicApiBaseUrl: Boolean(process.env.NEXT_PUBLIC_API_BASE_URL),
        });
        return {
            ok: false,
            response: buildBackendErrorResponse("backend_unavailable"),
        };
    }

    let base: URL;
    try {
        base = new URL(baseUrlConfig.url);
    } catch {
        return {
            ok: false,
            response: buildBackendErrorResponse("backend_invalid_target", "تعذر الاتصال بخدمة الواجهة الخلفية.", 500),
        };
    }

    if (shouldRejectHost(base.hostname, baseUrlConfig.source)) {
        console.error("[backendProxy] Rejected backend target host", {
            pathname,
            requestHost: requestHost || null,
            targetHost: base.hostname,
            source: baseUrlConfig.source,
        });
        return {
            ok: false,
            response: buildBackendErrorResponse("backend_target_rejected"),
        };
    }

    return { ok: true, url: new URL(pathname, `${base.origin}/`) };
}

function buildForwardHeaders(request: NextRequest): Headers {
    const headers = new Headers();
    const authHeader = request.headers.get("authorization");
    const token = request.cookies.get("wathiqcare_access_token")?.value;

    if (authHeader) {
        headers.set("authorization", authHeader);
    } else if (token) {
        headers.set("authorization", `Bearer ${token}`);
    }

    const contentType = request.headers.get("content-type");
    if (contentType) {
        headers.set("content-type", contentType);
    }

    const accept = request.headers.get("accept");
    if (accept) {
        headers.set("accept", accept);
    }

    return headers;
}

export async function forwardToBackend(
    request: NextRequest,
    backendPath: string,
): Promise<NextResponse> {
    const requestHost = request.headers.get("host") || undefined;
    const built = buildBackendUrl(backendPath, requestHost);
    if (!built.ok) {
        return built.response;
    }

    const targetHost = built.url.host.toLowerCase();
    const normalizedRequestHost = (requestHost || "").toLowerCase();
    if (targetHost && normalizedRequestHost && targetHost === normalizedRequestHost) {
        return buildBackendErrorResponse("backend_loop");
    }

    const method = request.method.toUpperCase();
    const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

    try {
        const backendResponse = await fetch(built.url, {
            method,
            headers: buildForwardHeaders(request),
            body,
            redirect: "manual",
        });

        const proxyHeaders = new Headers();
        const contentType = backendResponse.headers.get("content-type");
        const contentDisposition = backendResponse.headers.get("content-disposition");

        if (contentType) {
            proxyHeaders.set("content-type", contentType);
        }
        if (contentDisposition) {
            proxyHeaders.set("content-disposition", contentDisposition);
        }

        if (backendResponse.status >= 400 && isHtmlContentType(contentType)) {
            const htmlBody = await backendResponse.text().catch(() => "");

            // Infrastructure error pages (e.g., stopped Azure app) should not leak raw HTML to UI.
            if (backendResponse.status >= 500 || backendResponse.status === 403 || isInfrastructureHtmlError(htmlBody)) {
                console.error("[backendProxy] Backend returned infrastructure HTML error page", {
                    backendPath,
                    status: backendResponse.status,
                    targetOrigin: built.url.origin,
                });
                return buildBackendErrorResponse("backend_unreachable");
            }

            return new NextResponse(htmlBody, {
                status: backendResponse.status,
                headers: proxyHeaders,
            });
        }

        return new NextResponse(backendResponse.body, {
            status: backendResponse.status,
            headers: proxyHeaders,
        });
    } catch {
        return buildBackendErrorResponse("backend_unreachable");
    }
}
