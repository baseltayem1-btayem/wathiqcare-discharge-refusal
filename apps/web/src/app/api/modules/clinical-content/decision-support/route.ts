import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import {
  evaluateDecisionSupport,
  resolveProcedureMapping,
} from "@/lib/server/clinical-content";
import type { PatientContext } from "@/lib/clinical-content/types";

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
    "ENABLE_CLINICAL_DECISION_SUPPORT",
    tenantId,
    "informed-consents",
  );

  if (!flag.resolvedValue) {
    return NextResponse.json(
      { ok: false, error: "Clinical Decision Support is not enabled" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    procedureName?: string;
    patientContext?: PatientContext;
    disclosedRiskIds?: string[];
    disclosedAlternativeIds?: string[];
    includeEducation?: boolean;
  };

  if (!body.procedureName) {
    return NextResponse.json(
      { ok: false, error: "Missing procedureName" },
      { status: 400 },
    );
  }

  const mapping = resolveProcedureMapping({ procedure: body.procedureName });

  const result = evaluateDecisionSupport({
    procedure: mapping.procedure,
    disclosedRiskIds: body.disclosedRiskIds ?? mapping.risks.map((r) => r.id),
    disclosedAlternativeIds: body.disclosedAlternativeIds ?? mapping.alternatives.map((a) => a.id),
    patientContext: body.patientContext || {
      capacityStatus: "competent",
      languagePreference: "bilingual",
    },
    includeEducation: body.includeEducation ?? true,
  });

  return NextResponse.json({
    ok: true,
    featureFlagEnabled: true,
    result,
    mappingFound: mapping.found,
  });
}
