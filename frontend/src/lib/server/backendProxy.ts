import { NextRequest, NextResponse } from "next/server";
import {
    type BackendApiBaseUrlSource,
    getConfiguredBackendApiBaseUrlConfig,
} from "@/lib/server/backend";

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

function shouldRejectHost(hostname: string, source: BackendApiBaseUrlSource): boolean {
    if (process.env.NODE_ENV !== "production") {
        return false;
    }

    // Allow internal Docker service DNS only when using the dedicated server-side internal variable.
    if (source === "BACKEND_NEST_API_BASE_URL") {
        return false;
    }

    return isPrivateHost(hostname) || isSingleLabelHostname(hostname);
}

export function buildBackendUrl(pathname: string): BackendUrlResult {
    const baseUrlConfig = getConfiguredBackendApiBaseUrlConfig();
    if (!baseUrlConfig) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    detail: "الخدمة الخلفية الخارجية غير متاحة حالياً. يرجى التحقق من إعداد BACKEND_NEST_API_BASE_URL أو BACKEND_API_BASE_URL.",
                },
                { status: 503 },
            ),
        };
    }

    let base: URL;
    try {
        base = new URL(baseUrlConfig.url);
    } catch {
        return {
            ok: false,
            response: NextResponse.json(
                { detail: "تعذر الاتصال بخدمة الواجهة الخلفية." },
                { status: 500 },
            ),
        };
    }

    if (shouldRejectHost(base.hostname, baseUrlConfig.source)) {
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

    const targetHost = built.url.host.toLowerCase();
    const requestHost = (request.headers.get("host") || "").toLowerCase();
    if (targetHost && requestHost && targetHost === requestHost) {
        return NextResponse.json(
            {
                detail: "خدمة الواجهة الخلفية غير متاحة حالياً.",
            },
            { status: 503 },
        );
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
