import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { buildAcknowledgmentMethods } from "../method-availability";

type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        requireAuth(request);
        await params; // caseId not needed – methods are tenant-wide config
        const methods = await buildAcknowledgmentMethods(request);

        return NextResponse.json({
            methods,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
