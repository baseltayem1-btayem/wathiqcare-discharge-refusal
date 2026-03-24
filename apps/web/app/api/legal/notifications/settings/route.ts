import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

export async function GET(request: NextRequest) {
    return forwardToBackend(request, "/api/legal/notifications/settings");
}

export async function PUT(request: NextRequest) {
    return forwardToBackend(request, "/api/legal/notifications/settings");
}
