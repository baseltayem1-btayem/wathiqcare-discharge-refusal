import type { EmrAdapter, EmrSyncContext, EmrSyncResult } from "@/lib/integrations/emr/emr-adapter";
import {
  getEncounterAllergies,
  getEncounterConditions,
  getEncounterMedications,
  getEncounterObservations,
  getEncountersByMrn,
  getIntegrationStatus,
  getPatientByMrn,
} from "@/lib/server/trakcare/service";

export class TrakCareAdapter implements EmrAdapter {
  readonly adapterKey = "trakcare";
  readonly sourceSystem = "InterSystems TrakCare";

  async syncEncounterContext(context: EmrSyncContext): Promise<EmrSyncResult> {
    const status = getIntegrationStatus();
    if (status.state !== "READY") {
      return {
        status: "FAILED",
        sourceSystem: this.sourceSystem,
        syncedAt: new Date().toISOString(),
        importedFields: [],
        failedFields: ["TRAKCARE_CREDENTIALS"],
        manualOverride: false,
        correlationId: context.correlationId,
        payload: {
          mrn: context.patientId,
          encounterNumber: context.encounterId,
        },
        error: status.message,
      };
    }

    const requestContext = {
      tenantId: context.tenantId,
      userId: "system",
      requestId: `emr-${context.correlationId}`,
      correlationId: context.correlationId,
    };

    const patientResult = await getPatientByMrn(requestContext, context.patientId);
    const encountersResult = await getEncountersByMrn(requestContext, context.patientId);
    const encounter = encountersResult.data.find(
      (item) => item.id === context.encounterId || item.encounterId === context.encounterId,
    );

    if (!encounter) {
      return {
        status: "FAILED",
        sourceSystem: this.sourceSystem,
        syncedAt: new Date().toISOString(),
        importedFields: [],
        failedFields: ["Encounter Number"],
        manualOverride: false,
        correlationId: context.correlationId,
        payload: {
          patientName: patientResult.data.name,
          mrn: patientResult.data.mrn,
          encounterNumber: context.encounterId,
        },
        error: "Encounter not found in TrakCare",
      };
    }

    const [allergiesResult, conditionsResult, medicationsResult, observationsResult] =
      await Promise.all([
        getEncounterAllergies(requestContext, encounter.id || encounter.encounterId),
        getEncounterConditions(requestContext, encounter.id || encounter.encounterId),
        getEncounterMedications(requestContext, encounter.id || encounter.encounterId),
        getEncounterObservations(requestContext, encounter.id || encounter.encounterId),
      ]);

    return {
      status: "SYNCED",
      sourceSystem: this.sourceSystem,
      syncedAt: new Date().toISOString(),
      importedFields: [
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
      ],
      failedFields: [],
      manualOverride: false,
      correlationId: context.correlationId,
      payload: {
        patientName: patientResult.data.name,
        mrn: patientResult.data.mrn,
        dob: patientResult.data.dateOfBirth || undefined,
        gender: patientResult.data.gender || undefined,
        nationalIdOrIqama: patientResult.data.nationalId || patientResult.data.iqamaNumber || undefined,
        mobileNumber: patientResult.data.mobileNumber || undefined,
        encounterNumber: encounter.encounterId,
        admissionDate: encounter.admissionDate || undefined,
        department: encounter.department || undefined,
        treatingPhysician: encounter.physician || undefined,
        physicianLicense: encounter.physicianLicense || undefined,
        diagnosis: encounter.diagnosis || undefined,
        procedureOrder: encounter.procedure || undefined,
        allergies: allergiesResult.data.map((item) => item.label).join(", ") || encounter.allergies || undefined,
        currentMedications:
          medicationsResult.data.map((item) => item.label).join(", ") || encounter.currentMedications || undefined,
        riskFlags: [
          ...conditionsResult.data.map((item) => item.label),
          ...observationsResult.data.map((item) => item.label),
        ],
        interpreterRequired: false,
        guardianRequired: false,
      },
    };
  }
}
