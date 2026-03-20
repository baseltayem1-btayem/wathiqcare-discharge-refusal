import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

type RouteContext = {
    params: Promise<{ documentId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
    const { documentId } = await context.params;
    return forwardToBackend(request, `/api/documents/${encodeURIComponent(documentId)}/sign`);
}
