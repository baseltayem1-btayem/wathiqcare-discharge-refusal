import { NextRequest, NextResponse } from "next/server";

import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { buildConsentAiDraft, isClinicalAiAssistantEnabled } from "@/lib/server/informed-consent-clinical-ai-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!isClinicalAiAssistantEnabled()) {
      return new NextResponse(null, { status: 404 });
    }

    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:create");

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const procedure = typeof payload?.procedure === "string" ? payload.procedure.trim() : "";
    if (!procedure) {
      throw new ApiError(400, "Procedure is required for AI draft generation.");
    }

    const result = await buildConsentAiDraft({
      actorId: auth.sub,
      physicianUserId: auth.sub,
      promptVersion: "clinical-ai-consent-drafting-v1",
      tenantId: auth.tenant_id,
      context: {
        clinicalContext: Array.isArray(payload?.clinicalContext)
          ? payload?.clinicalContext.filter((item): item is string => typeof item === "string")
          : [],
        consentType: typeof payload?.consentType === "string" ? payload.consentType : undefined,
        diagnosisLabel: typeof payload?.diagnosisLabel === "string" ? payload.diagnosisLabel : undefined,
        language: payload?.language === "ar" || payload?.language === "bilingual" ? payload.language : "en",
        procedure,
        specialty: typeof payload?.specialty === "string" ? payload.specialty : undefined,
      },
    });

    return NextResponse.json(toJsonSafe(result));
  } catch (error) {
    return handleApiError(error);
  }
}