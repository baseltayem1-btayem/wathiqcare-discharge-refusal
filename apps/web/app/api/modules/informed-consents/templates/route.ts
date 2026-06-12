import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import {
  isConsentCatalogCapable,
  listRuntimeConsentTemplates,
} from "@/lib/server/informed-consents-template-catalog";


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
        const capability = await isConsentCatalogCapable(auth.tenant_id || "");

        if (!capability.capable) {
          return NextResponse.json(
            {
              error: capability.reason,
            },
            { status: 503 },
          );
        }

        return NextResponse.json(
          {
            error:
              "The informed-consent catalog is already present and ICU critical-care templates are active, but the application query path still failed after bypassing default seeding.",
          },
          { status: 500 },
        );
      }

      throw error;
    }

    return NextResponse.json(toJsonSafe(templates));
  } catch (error) {
    return handleApiError(error);
  }
}
