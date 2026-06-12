import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { listRuntimeConsentTemplates } from "@/lib/server/informed-consents-template-catalog";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/modules/informed-consents/templates
 * Get available consent templates filtered by type and specialty
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const { searchParams } = new URL(request.url);
    let templates;

    try {
      templates = await listRuntimeConsentTemplates(auth, {
        consentType: searchParams.get("type") || undefined,
        specialty: searchParams.get("specialty") || undefined,
        department: searchParams.get("department") || undefined,
      });
    } catch (error) {
      const prismaCode =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code || "")
          : "";

      if (prismaCode === "P2021" || prismaCode === "P2022") {
        return NextResponse.json(
          {
            error:
              "Informed-consent template catalog schema is not ready in Preview. Required migrations are 0017_medical_consent_library_engine.sql, 0018_phase2_medico_legal_consent_intelligence.sql, and 0024_enterprise_consent_templates.sql. Missing objects are likely one or more of: consent_categories, consent_templates, consent_template_versions, consent_template_sections, or consent_template_localizations.",
          },
          { status: 503 },
        );
      }

      throw error;
    }

    return NextResponse.json(toJsonSafe(templates));
  } catch (error) {
    return handleApiError(error);
  }
}
