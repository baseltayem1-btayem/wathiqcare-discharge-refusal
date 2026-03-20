import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

type RouteContext = {
    params: Promise<{ formType: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
    const { formType } = await context.params;
    return forwardToBackend(request, `/api/forms/templates/${encodeURIComponent(formType)}`);
}
