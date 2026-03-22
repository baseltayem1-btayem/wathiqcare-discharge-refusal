import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

function buildForwardHeaders(request: NextRequest): Headers {
    const headers = new Headers();
    const cookie = request.headers.get("cookie");
    const contentType = request.headers.get("content-type");

    if (cookie) {
        headers.set("cookie", cookie);
    }
    if (contentType) {
        headers.set("content-type", contentType);
    }

    return headers;
}

export async function GET(request: NextRequest) {
    try {
        await requirePlatformAccess(request);
        const url = new URL(request.url);
        const upstream = `${url.origin}/api/tenants${url.search}`;

        const response = await fetch(upstream, {
            method: "GET",
            headers: buildForwardHeaders(request),
            cache: "no-store",
        });

        const body = await response.text();
        return new NextResponse(body, {
            status: response.status,
            headers: {
                "content-type": response.headers.get("content-type") ?? "application/json",
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        await requirePlatformAccess(request);
        const url = new URL(request.url);
        const upstream = `${url.origin}/api/tenants`;
        const body = await request.text();

        const response = await fetch(upstream, {
            method: "POST",
            headers: buildForwardHeaders(request),
            body,
            cache: "no-store",
        });

        const responseBody = await response.text();
        return new NextResponse(responseBody, {
            status: response.status,
            headers: {
                "content-type": response.headers.get("content-type") ?? "application/json",
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
