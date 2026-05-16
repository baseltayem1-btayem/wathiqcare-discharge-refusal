import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ caseId: string; formType: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
    const { caseId, formType } = await context.params;
    return forwardToBackend(
        request,
        `/api/cases/${encodeURIComponent(caseId)}/forms/${encodeURIComponent(formType)}/generate`,
    );
}
