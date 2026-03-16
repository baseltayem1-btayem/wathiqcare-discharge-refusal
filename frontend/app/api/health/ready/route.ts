import { headers } from "next/headers";
import { buildFrontendHealthResponse } from "@/lib/server/frontendHealth";

export async function GET() {
    const requestHeaders = await headers();
    return buildFrontendHealthResponse(requestHeaders.get("host") || undefined);
}