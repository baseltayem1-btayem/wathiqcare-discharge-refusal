import { NextRequest } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError, jsonSuccess } from "@/lib/server/http";
import { getSetupStatus } from "@/lib/server/admin-bootstrap";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAccess(request);
    const status = await getSetupStatus();
    return jsonSuccess(status);
  } catch (error) {
    return handleApiError(error);
  }
}
