import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { generateAIAssistDraft } from "@/lib/server/consent-library-service";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:review");
    const { id } = await params;

    const aiFlag = await resolveFeatureFlag(
      "ENABLE_AI_ASSIST",
      auth.tenant_id,
      "informed-consents",
    );
    if (!aiFlag.resolvedValue) {
      throw new ApiError(403, "AI assist is disabled for this tenant/module");
    }

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const updated = await generateAIAssistDraft(auth, id, (payload || {}) as Record<string, unknown>, request);
    return NextResponse.json(toJsonSafe(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
