import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ alertId: string }> },
) {
    const { alertId } = await params;
    const backendPath = `/api/legal/alerts/${encodeURIComponent(alertId)}/acknowledge`;
    return forwardToBackend(request, backendPath);
}
