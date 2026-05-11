import type { EmrAdapter, EmrSyncContext, EmrSyncResult } from "@/lib/integrations/emr/emr-adapter";

export class MockEmrAdapter implements EmrAdapter {
  readonly adapterKey = "mock-emr";
  readonly sourceSystem = "MockEMR";

  async syncEncounterContext(context: EmrSyncContext): Promise<EmrSyncResult> {
    const importedFields = [
      "Patient Name",
      "MRN",
      "DOB",
      "Gender",
      "National ID / Iqama",
      "Mobile Number",
      "Encounter Number",
      "Visit Type",
      "Admission Date",
      "Department",
      "Treating Physician",
      "Physician License",
      "Diagnosis",
      "ICD-10 Code",
      "Procedure Order",
      "Procedure Code",
      "Allergies",
      "Current Medications",
      "Risk Flags",
      "Interpreter Required",
      "Guardian Required",
    ];

    return {
      status: "SYNCED",
      sourceSystem: this.sourceSystem,
      syncedAt: new Date().toISOString(),
      importedFields,
      failedFields: [],
      manualOverride: false,
      correlationId: context.correlationId,
      payload: {
        patientName: "Ahmed Mohammed Al-Rashid",
        mrn: "MR-2024-001",
        dob: "1985-03-15",
        gender: "M",
        nationalIdOrIqama: "1234567890",
        mobileNumber: "+966501234567",
        encounterNumber: context.encounterId,
        visitType: "INPATIENT",
        admissionDate: "2024-05-08T14:30:00Z",
        department: "General Surgery",
        treatingPhysician: "Dr. Sarah Al-Mazrouei",
        physicianLicense: "LIC-2024-0542",
        diagnosis: "Appendicitis",
        icd10Code: "K35.80",
        procedureOrder: "Appendectomy",
        procedureCode: "44950",
        allergies: "Penicillin",
        currentMedications: "Paracetamol, Ibuprofen",
        riskFlags: ["HIGH_RISK_ANESTHESIA"],
        interpreterRequired: false,
        guardianRequired: false,
      },
    };
  }
}
