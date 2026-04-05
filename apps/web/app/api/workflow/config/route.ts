import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { forwardToBackend } from "@/lib/server/backendProxy";

/**
 * GET /api/workflow/config
 *
 * Returns the canonical workflow stage configuration from the backend.
 * Frontend sidebar and workflow tree consume this to stay in sync with
 * backend WORKFLOW_STAGES.
 */
export async function GET(request: NextRequest) {
    try {
        await requireAuth(request);
        return forwardToBackend(request, "/api/workflow/config");
    } catch (error) {
        return handleApiError(error);
    }
}
