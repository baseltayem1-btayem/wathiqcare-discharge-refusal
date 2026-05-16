import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/saas-services";
import { handleApiError } from "@/lib/server/http";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { buildTrakCareRequestContext } from "@/lib/server/trakcare/request-context";
import {

  getEncounterAllergies,
  getEncounterConditions,
  getEncounterMedications,
  getEncounterObservations,
  getEncountersByMrn,
  getPatientByMrn,
} from "@/lib/server/trakcare/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/modules/informed-consents/patients/[patientId]/encounters/[encounterId]/sync-trakcare
 * Live sync only. No fake fallback is allowed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; encounterId: string }> }
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:create");

    const { patientId, encounterId } = await params;

    if (!patientId || !encounterId) {
      return NextResponse.json(
        { error: "Patient ID and Encounter ID required" },
        { status: 400 }
      );
    }

    const context = buildTrakCareRequestContext(request, auth);

    const patientResult = await getPatientByMrn(context, patientId);
    const encountersResult = await getEncountersByMrn(context, patientId);
    const encounter = encountersResult.data.find(
      (item) => item.id === encounterId || item.encounterId === encounterId,
    );

    if (!encounter) {
      return NextResponse.json(
        {
          status: "FAILED",
          sourceSystem: "InterSystems TrakCare",
          error: "Encounter not found in TrakCare",
          importedFields: [],
          failedFields: ["Encounter Number"],
          manualOverride: false,
        },
        { status: 404 },
      );
    }

    const [allergiesResult, conditionsResult, medicationsResult, observationsResult] =
      await Promise.all([
        getEncounterAllergies(context, encounter.id || encounter.encounterId),
        getEncounterConditions(context, encounter.id || encounter.encounterId),
        getEncounterMedications(context, encounter.id || encounter.encounterId),
        getEncounterObservations(context, encounter.id || encounter.encounterId),
      ]);

    const importedFields = [
      "Patient Name",
      "MRN",
      "DOB",
      "Gender",
      "Encounter Number",
      "Admission Date",
      "Department",
      "Treating Physician",
      "Physician License",
      "Diagnosis",
      "Procedure Order",
      "Allergies",
      "Current Medications",
      "Clinical Conditions",
      "Observations",
    ];

    const sourceTransactionId =
      observationsResult.sourceTransactionId ||
      medicationsResult.sourceTransactionId ||
      conditionsResult.sourceTransactionId ||
      allergiesResult.sourceTransactionId ||
      encountersResult.sourceTransactionId ||
      patientResult.sourceTransactionId ||
      null;

    await writeAuditLog({
      tenantId: auth.tenant_id || "",
      userId: auth.sub,
      entityType: "informed_consent_encounter_sync",
      entityId: `${patientId}:${encounterId}`,
      action: "encounter_synced_from_trakcare_live",
      details: `TrakCare sync SYNCED for MRN ${patientId}`,
      moduleKey: "informed-consents",
      correlationId: context.correlationId,
      metadataJson: {
        sourceSystem: "InterSystems TrakCare",
        syncStatus: "SYNCED",
        importedFields,
        failedFields: [],
        sourceTransactionId,
      },
      request,
    });

    return NextResponse.json({
      status: "SYNCED",
      sourceSystem: "InterSystems TrakCare",
      importedFields,
      failedFields: [],
      manualOverride: false,
      correlationId: context.correlationId,
      syncTime: new Date().toISOString(),
      payload: {
        patient: patientResult.data,
        encounter,
        allergies: allergiesResult.data,
        conditions: conditionsResult.data,
        medications: medicationsResult.data,
        observations: observationsResult.data,
        sourceTransactionId,
      },
      error: null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
