import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import {
  ENABLE_CLINICAL_CONTENT_PLATFORM_V2,
  ENABLE_APPROVED_FORMS_V2,
  ENABLE_DOCTOR_WORKSPACE_V2,
  ENABLE_CLINICAL_CONTENT_ENGINE,
  ENABLE_PROCEDURE_MAPPING_ENGINE_V2,
  ENABLE_PATIENT_EDUCATION_ENGINE,
  ENABLE_DYNAMIC_CONSENT_GENERATOR,
  ENABLE_CLINICAL_DECISION_SUPPORT,
} from "@/lib/config/feature-flags";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FLAG_KEYS = [
  "ENABLE_CLINICAL_CONTENT_PLATFORM_V2",
  "ENABLE_APPROVED_FORMS_V2",
  "ENABLE_DOCTOR_WORKSPACE_V2",
  "ENABLE_CLINICAL_CONTENT_ENGINE",
  "ENABLE_PROCEDURE_MAPPING_ENGINE_V2",
  "ENABLE_PATIENT_EDUCATION_ENGINE",
  "ENABLE_DYNAMIC_CONSENT_GENERATOR",
  "ENABLE_CLINICAL_DECISION_SUPPORT",
] as const;

function getTenantId(auth: { tenant_id?: string | null }, queryTenantId: string | null): string | null {
  if (queryTenantId) return queryTenantId;
  return auth.tenant_id ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const { searchParams } = new URL(request.url);
  const tenantId = getTenantId(auth, searchParams.get("tenantId"));

  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "Missing tenant context" },
      { status: 400 },
    );
  }

  const flags = await Promise.all(
    FLAG_KEYS.map(async (key) => {
      const resolved = await resolveFeatureFlag(key, tenantId, "informed-consents");
      return {
        key,
        resolvedValue: resolved.resolvedValue,
        envDefault: resolved.envDefault,
      };
    }),
  );

  const globalMaster =
    ENABLE_CLINICAL_CONTENT_PLATFORM_V2 ||
    flags.find((f) => f.key === "ENABLE_CLINICAL_CONTENT_PLATFORM_V2")?.resolvedValue === true;

  return NextResponse.json({
    ok: true,
    enabled: globalMaster,
    flags,
    envDefaults: {
      ENABLE_CLINICAL_CONTENT_PLATFORM_V2,
      ENABLE_APPROVED_FORMS_V2,
      ENABLE_DOCTOR_WORKSPACE_V2,
      ENABLE_CLINICAL_CONTENT_ENGINE,
      ENABLE_PROCEDURE_MAPPING_ENGINE_V2,
      ENABLE_PATIENT_EDUCATION_ENGINE,
      ENABLE_DYNAMIC_CONSENT_GENERATOR,
      ENABLE_CLINICAL_DECISION_SUPPORT,
    },
  });
}
