import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { assembleConsent } from "@/lib/server/clinical-content";
import type { ConsentAssemblyRequest } from "@/lib/clinical-content/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTenantId(auth: { tenant_id?: string | null }, queryTenantId: string | null): string | null {
  if (queryTenantId) return queryTenantId;
  return auth.tenant_id ?? null;
}

export async function POST(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const { searchParams } = new URL(request.url);
  const tenantId = getTenantId(auth, searchParams.get("tenantId"));

  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "Missing tenant context" },
      { status: 400 },
    );
  }

  const flag = await resolveFeatureFlag(
    "ENABLE_DYNAMIC_CONSENT_GENERATOR",
    tenantId,
    "informed-consents",
  );

  if (!flag.resolvedValue) {
    return NextResponse.json(
      { ok: false, error: "Dynamic Consent Generator is not enabled" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Partial<ConsentAssemblyRequest>;

  if (!body.procedureName) {
    return NextResponse.json(
      { ok: false, error: "Missing procedureName" },
      { status: 400 },
    );
  }

  const assembly = assembleConsent({
    tenantId,
    procedureName: body.procedureName,
    patientContext: body.patientContext || {
      capacityStatus: "competent",
      languagePreference: "bilingual",
    },
    physicianContext: body.physicianContext || {
      physicianId: auth.sub || "unknown",
      name: auth.email || "Unknown Physician",
      licenseNumber: "",
      specialty: "",
      department: "",
    },
    preferredLanguage: body.preferredLanguage || "bilingual",
    includeEducation: body.includeEducation ?? true,
    includeDecisionSupport: body.includeDecisionSupport ?? true,
  });

  return NextResponse.json({
    ok: true,
    featureFlagEnabled: true,
    assembly,
  });
}
