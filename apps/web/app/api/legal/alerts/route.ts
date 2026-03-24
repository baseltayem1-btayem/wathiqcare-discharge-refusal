import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

export async function GET(request: NextRequest) {
    const backendPath = `/api/legal/alerts${request.nextUrl.search}`;
    return forwardToBackend(request, backendPath);
}
