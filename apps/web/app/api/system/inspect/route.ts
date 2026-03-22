import { NextRequest } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { forwardToBackend } from "@/lib/server/backendProxy";
import { handleApiError } from "@/lib/server/http";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAccess(request);
    return await forwardToBackend(request, "/api/system/inspect");
  } catch (error) {
    return handleApiError(error);
  }
}
