import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

type RouteContext = {
    params: Promise<{ connector: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
    const { connector } = await context.params;
    const backendPath = `/api/integrations/${encodeURIComponent(connector)}/health${request.nextUrl.search}`;
    return forwardToBackend(request, backendPath);
}
