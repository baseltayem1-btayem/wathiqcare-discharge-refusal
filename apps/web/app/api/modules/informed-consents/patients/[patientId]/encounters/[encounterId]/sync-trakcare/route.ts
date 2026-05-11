import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { syncEncounterFromEmr } from "@/lib/integrations/emr/emr-mapping-service";
import { writeAuditLog } from "@/lib/server/saas-services";

/**
 * POST /api/modules/informed-consents/patients/[patientId]/encounters/[encounterId]/sync-trakcare
 * Sync patient and encounter data from TrakCare/EHR
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; encounterId: string }> }
) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");

  const { patientId, encounterId } = await params;

  if (!patientId || !encounterId) {
    return NextResponse.json(
      { error: "Patient ID and Encounter ID required" },
      { status: 400 }
    );
  }

  try {
    const result = await syncEncounterFromEmr({
      tenantId: auth.tenant_id || "",
      patientId,
      encounterId,
      adapterKey: "trakcare",
    });

    await writeAuditLog({
      tenantId: auth.tenant_id || "",
      userId: auth.sub,
      entityType: "informed_consent_encounter_sync",
      entityId: `${patientId}:${encounterId}`,
      action: "encounter_synced_from_emr",
      details: `EMR sync ${result.status} via ${result.sourceSystem}`,
      moduleKey: "informed-consents",
      correlationId: result.correlationId,
      metadataJson: {
        adapterKey: result.adapterKey,
        sourceSystem: result.sourceSystem,
        syncStatus: result.status,
        importedFields: result.importedFields,
        failedFields: result.failedFields,
        manualOverride: result.manualOverride,
      },
      request,
    });

    return NextResponse.json({
      status: result.status,
      sourceSystem: result.sourceSystem,
      importedFields: result.importedFields,
      failedFields: result.failedFields,
      manualOverride: result.manualOverride,
      correlationId: result.correlationId,
      syncTime: result.syncedAt,
      payload: result.payload,
      error: result.error || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "FAILED",
        sourceSystem: "InterSystems TrakCare",
        error: error instanceof Error ? error.message : "Sync failed",
        importedFields: [],
        failedFields: [
          "Patient Name",
          "MRN",
          "Encounter Number",
          "Diagnosis",
          "Procedure Order",
        ],
      },
      { status: 500 }
    );
  }
}
