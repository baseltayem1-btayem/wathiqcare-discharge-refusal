import { NextRequest, NextResponse } from "next/server";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";

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
                    detail:
                        "Backend service endpoint is not configured. Set BACKEND_API_BASE_URL for production deployment.",
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
                { detail: "BACKEND_API_BASE_URL is invalid." },
                { status: 500 },
            ),
        };
    }

    if (shouldRejectHost(base.hostname)) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    detail:
                        "Backend service host is private/internal and unavailable to public clients. Configure a public API host.",
                },
                { status: 503 },
            ),
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
    const built = buildBackendUrl(backendPath);
    if (!built.ok) {
        return built.response;
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

        return new NextResponse(backendResponse.body, {
            status: backendResponse.status,
            headers: proxyHeaders,
        });
    } catch {
        return NextResponse.json(
            {
                detail:
                    "Backend workflow service is temporarily unavailable. Please retry shortly or contact support.",
            },
            { status: 503 },
        );
    }
}
