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

function buildForwardHeaders(request: NextRequest): Headers {
    const headers = new Headers();
    const authHeader = request.headers.get("authorization");
    const token = request.cookies.get("wathiqcare_access_token")?.value;
    const userAgent = request.headers.get("user-agent");
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");

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
    const targetPath = built.url.pathname;
    const sourcePath = request.nextUrl.pathname;

    // Prevent recursive self-calls when backend base URL points to the same host+path.
    if (targetHost && requestHost && targetHost === requestHost && targetPath === sourcePath) {
        return NextResponse.json(
            {
                detail: "خدمة الواجهة الخلفية غير متاحة حالياً. يرجى ضبط BACKEND_API_BASE_URL على خدمة backend الحقيقية.",
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
            // Propagate the incoming request's abort signal so that when the
            // client navigates away (Next.js fires request.signal), the outgoing
            // backend fetch is cancelled immediately instead of hanging.
            signal: request.signal,
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
    } catch (err) {
        // Re-throw abort errors: the client already disconnected, so there is
        // nothing to respond to.  Letting Next.js handle these prevents the
        // "signal is aborted without reason" noise in server logs.
        if (err instanceof Error && err.name === "AbortError") {
            throw err;
        }
        return NextResponse.json(
            {
                detail:
                    "Backend workflow service is temporarily unavailable. Please retry shortly or contact support.",
            },
            { status: 503 },
        );
    }
}
