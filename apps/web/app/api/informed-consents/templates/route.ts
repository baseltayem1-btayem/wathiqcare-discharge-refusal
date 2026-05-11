import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";
import { toJsonSafe } from "@/lib/server/json";
import { listRuntimeConsentTemplates } from "@/lib/server/informed-consents-template-catalog";

export async function GET(request: NextRequest) {
  try {
    if (!isInformedConsentsEnabled()) {
      return NextResponse.json({ ok: false, error: "Informed Consents module is disabled." }, { status: 503 });
    }

    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const { searchParams } = new URL(request.url);
    const templates = await listRuntimeConsentTemplates(auth, {
      consentType: searchParams.get("type") || undefined,
      specialty: searchParams.get("specialty") || undefined,
      department: searchParams.get("department") || undefined,
    });

    return NextResponse.json(toJsonSafe(templates));
  } catch (error) {
    return handleApiError(error);
  }
}
