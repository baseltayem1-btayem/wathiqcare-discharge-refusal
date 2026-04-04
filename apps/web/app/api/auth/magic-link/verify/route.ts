import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import {
    handleMagicLinkVerifyFlow,
} from "@/lib/server/magic-link-route-flow";
import { createMagicLinkVerifyDeps } from "../deps";
import { buildSessionCookieOptions } from "@/lib/server/sessionCookie";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token") || "";

    try {
        const result = await handleMagicLinkVerifyFlow({
            request,
            token,
            deps: createMagicLinkVerifyDeps(request),
        });

        if (result.status !== 200) {
            return NextResponse.json(result.body, { status: result.status });
        }

        const response = NextResponse.json(result.body);

        response.cookies.set(
            result.cookie.name,
            result.cookie.value,
            buildSessionCookieOptions(
                result.cookie.maxAgeSeconds,
                request,
            ),
        );

        return response;
    } catch (error) {
        return handleApiError(error);
    }
}
