import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/http";
import {
    handleMagicLinkRequestFlow,
    type MagicLinkRequestPayload,
} from "@/lib/server/magic-link-route-flow";
import { createMagicLinkRequestDeps } from "../deps";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const payload = (await request.json().catch(() => null)) as MagicLinkRequestPayload | null;
        const responseBody = await handleMagicLinkRequestFlow({
            request,
            payload,
            deps: createMagicLinkRequestDeps(request),
        });

        return NextResponse.json(responseBody);
    } catch (error) {
        return handleApiError(error);
    }
}
