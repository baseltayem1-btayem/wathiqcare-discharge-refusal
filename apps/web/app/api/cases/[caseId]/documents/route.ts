import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

type RouteContext = {
    params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
    const { caseId } = await context.params;
    return forwardToBackend(request, `/api/cases/${encodeURIComponent(caseId)}/documents`);
}
