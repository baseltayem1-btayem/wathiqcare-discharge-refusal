"use client";

import { isAssemblyApprovedPdfSourceVerified } from "../utils/approvedPdfSource";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ProductionPatient,
  ProductionEncounter,
  ProductionAssembly,
  ProductionProcedure,
  PhysicianContext,
  SecureSigningResult,
  TimelineEvent,
} from "../types";
import {
  searchPatients,
  getPatientEncounters,
  resolveContentMapping,
  dryRunSendSecureSigningLink,
  fetchTimeline,
  capturePhysicianSignatureForDocument,
  createConsentDocument,
  sendSecureSigningLinkForDocument,
  checkSendEligibility,
  fetchProcedures,
  fetchConsentFieldMappingReadiness,
  verifyConsentFieldMapping,
} from "../lib/api";
import type { ConsentFieldMappingReadiness } from "../lib/api";
import { analyzeDoctorReadiness, type DoctorReadinessReport } from "../doctorReadiness";

export type WorkspaceStep = "patient" | "encounter" | "procedure" | "review" | "sent";

export type ProductionWorkspaceState = {
  step: WorkspaceStep;
  patient?: ProductionPatient;
  encounter?: ProductionEncounter;
  procedureQuery: string;
  selectedProcedureId?: string;
  selectedProcedureTitle?: string;
  selectedProcedure?: ProductionProcedure;
  assembly?: ProductionAssembly;
  anesthesiaOverride?: "NONE" | "LOCAL" | "SEDATION" | "REGIONAL" | "GENERAL";
  educationIncluded: boolean;
  physicianNotes: string;
  draftApproved: boolean;
  reviewMode: boolean;
  previewReviewed: boolean;
  recipientMobile: string;
  recipientEmail: string;
  sendEligibility?: { pilotEnabled: boolean; allowlisted: boolean; reason: string };
  fieldMappingReadiness?: ConsentFieldMappingReadiness;
  doctorCompletionValues: Record<string, string>;
  physicianSignatureDataUrl: string;
  sentAt?: string;
  signingResult?: SecureSigningResult;
  dryRunSuccess?: boolean;
  dryRunMessage?: string;
  timeline: TimelineEvent[];
  acknowledgedBlockers: Set<string>;
  acknowledgedAlerts: Set<string>;
};

export type Readiness = {
  patientReady: boolean;
  encounterReady: boolean;
  procedureSelected: boolean;
  assemblyReady: boolean;
  blockersResolved: boolean;
  educationReady: boolean;
  previewReviewed: boolean;
  contactAvailable: boolean;
  allowlisted: boolean;
  draftApproved: boolean;
  fieldMappingVerified: boolean;
  doctorCompletionReady: boolean;
  doctorReadinessReport: DoctorReadinessReport;
  anesthesiaMappingReady: boolean;
  patientSignatureMapped: boolean;
  fieldMappingReadiness?: ConsentFieldMappingReadiness;
  sendReady: boolean;
  completedChecks: number;
  totalChecks: number;
  progressPercentage: number;
  blockers: ProductionAssembly["blockers"];
  unacknowledgedBlockers: ProductionAssembly["blockers"];
  missingItems: string[];
};

function normalizeMobile(value: string): string {
  const compact = value.replace(/[\s\-()]/g, "");
  if (!compact) return "";
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("966")) return `+${compact}`;
  if (compact.startsWith("05") && compact.length === 10) return `+966${compact.slice(1)}`;
  return compact;
}

function hasContact(mobile: string, email: string): boolean {
  return Boolean(normalizeMobile(mobile) || email.trim());
}

export function useProductionWorkspace(physician: PhysicianContext) {
  const [state, setState] = useState<ProductionWorkspaceState>({
    step: "patient",
    procedureQuery: "",
    educationIncluded: true,
    physicianNotes: "",
    draftApproved: false,
    reviewMode: false,
    previewReviewed: false,
    recipientMobile: "",
    recipientEmail: "",
    doctorCompletionValues: {},
    physicianSignatureDataUrl: "",
    timeline: [],
    acknowledgedBlockers: new Set(),
    acknowledgedAlerts: new Set(),
  });

  const [patients, setPatients] = useState<ProductionPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState<string>("");

  const [encounters, setEncounters] = useState<ProductionEncounter[]>([]);
  const [encountersLoading, setEncountersLoading] = useState(false);
  const [encountersError, setEncountersError] = useState<string>("");

  const [assemblyLoading, setAssemblyLoading] = useState(false);
  const [assemblyError, setAssemblyError] = useState<string>("");

  const [procedures, setProcedures] = useState<ProductionProcedure[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [proceduresError, setProceduresError] = useState<string>("");
  const [procedureSearchMessage, setProcedureSearchMessage] = useState<string>("");

  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchForPatients = useCallback(async (query: string) => {
    setPatientsError("");
    if (!query || query.length < 2) {
      setPatients([]);
      return;
    }
    setPatientsLoading(true);
    try {
      const results = await searchPatients(query);
      setPatients(results);
    } catch (error) {
      setPatients([]);
      setPatientsError(error instanceof Error ? error.message : "Patient search failed.");
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  const loadEncounters = useCallback(async (patient: ProductionPatient) => {
    setEncountersError("");
    setEncountersLoading(true);
    try {
      const results = await getPatientEncounters(patient.mrn);
      setEncounters(results);
      return results;
    } catch (error) {
      setEncounters([]);
      setEncountersError(error instanceof Error ? error.message : "Failed to load encounters.");
      return [];
    } finally {
      setEncountersLoading(false);
    }
  }, []);

  const loadProcedures = useCallback(async () => {
    setProceduresError("");
    setProceduresLoading(true);
    try {
      const results = await fetchProcedures(physician.tenantId);
      setProcedures(results);
    } catch (error) {
      setProcedures([]);
      setProceduresError(error instanceof Error ? error.message : "Failed to load procedures.");
    } finally {
      setProceduresLoading(false);
    }
  }, [physician.tenantId]);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time catalog initialization */
  useEffect(() => {
    void loadProcedures();
  }, [loadProcedures]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const refreshSendEligibility = useCallback(async (mobile: string, email: string) => {
    if (!hasContact(mobile, email)) {
      setState((s) => ({
        ...s,
        sendEligibility: { pilotEnabled: false, allowlisted: false, reason: "Patient contact is missing." },
      }));
      return;
    }
    try {
      const result = await checkSendEligibility({ mobileNumber: mobile, recipientEmail: email });
      setState((s) => ({ ...s, sendEligibility: result }));
    } catch {
      setState((s) => ({
        ...s,
        sendEligibility: { pilotEnabled: false, allowlisted: false, reason: "Unable to verify recipient eligibility." },
      }));
    }
  }, []);

  const selectPatient = useCallback(
    async (patient: ProductionPatient) => {
      const patientEncounters = await loadEncounters(patient);
      const defaultEncounter = patientEncounters[0];
      const mobile = patient.mobileNumber || "";
      const email = patient.email || "";
      setState((s) => ({
        ...s,
        step: defaultEncounter ? "procedure" : "encounter",
        patient,
        encounter: defaultEncounter,
        assembly: undefined,
        fieldMappingReadiness: undefined,
        doctorCompletionValues: {},
        physicianSignatureDataUrl: "",
        selectedProcedureId: undefined,
        selectedProcedureTitle: undefined,
        selectedProcedure: undefined,
        anesthesiaOverride: undefined,
        draftApproved: false,
        previewReviewed: false,
        sentAt: undefined,
        signingResult: undefined,
        recipientMobile: mobile,
        recipientEmail: email,
        timeline: [],
        acknowledgedBlockers: new Set(),
        acknowledgedAlerts: new Set(),
      }));
      void refreshSendEligibility(mobile, email);
    },
    [loadEncounters, refreshSendEligibility],
  );

  const selectEncounter = useCallback((encounter: ProductionEncounter) => {
    setState((s) => ({
      ...s,
      step: "procedure",
      encounter,
      assembly: undefined,
        fieldMappingReadiness: undefined,
        doctorCompletionValues: {},
        physicianSignatureDataUrl: "",
      selectedProcedureId: undefined,
      selectedProcedureTitle: undefined,
      selectedProcedure: undefined,
      procedureQuery: "",
      anesthesiaOverride: undefined,
      draftApproved: false,
      previewReviewed: false,
      sentAt: undefined,
      signingResult: undefined,
    }));
  }, []);

  const setProcedureQuery = useCallback((procedureQuery: string) => {
    setState((s) => ({ ...s, procedureQuery }));
  }, []);

  const selectProcedure = useCallback((procedureId: string) => {
    const selectedProcedure = procedures.find((procedure) => procedure.id === procedureId);
    setState((s) => ({
      ...s,
      selectedProcedureId: selectedProcedure?.id,
      selectedProcedureTitle: selectedProcedure?.titleEn,
      selectedProcedure,
      assembly: undefined,
        fieldMappingReadiness: undefined,
        doctorCompletionValues: {},
        physicianSignatureDataUrl: "",
      draftApproved: false,
      previewReviewed: false,
    }));
  }, [procedures]);

  const setRecipientMobile = useCallback((recipientMobile: string) => {
    setState((s) => ({ ...s, recipientMobile }));
  }, []);

  const setRecipientEmail = useCallback((recipientEmail: string) => {
    setState((s) => ({ ...s, recipientEmail }));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshSendEligibility(state.recipientMobile, state.recipientEmail);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [state.recipientMobile, state.recipientEmail, refreshSendEligibility]);

  const resolveAssembly = useCallback(async () => {
    if (!state.patient || !state.encounter) return;
    if (!state.selectedProcedure) {
      setAssemblyError("Select a procedure from the list first.");
      return;
    }
    const selectedProcedure = state.selectedProcedure;
    const procedureIdentifier = selectedProcedure.titleEn;
    setAssemblyError("");
    setAssemblyLoading(true);
    try {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("encounterId", state.encounter.encounterId || state.encounter.id);
      nextParams.set("procedureId", state.selectedProcedure.id);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });

      const result = await resolveContentMapping({
        procedure: procedureIdentifier,
        tenantId: physician.tenantId,
        procedureId: selectedProcedure.id,
        procedureCode: selectedProcedure.procedureCode,
        categoryCode: selectedProcedure.categoryCode,
        reviewMode: state.reviewMode,
        patientContext: {
          capacityStatus: state.patient.capacityStatus || "competent",
          languagePreference: state.patient.languagePreference || "bilingual",
        },
        physicianContext: {
          physicianId: physician.userId,
          name: physician.name,
          licenseNumber: physician.licenseNumber || "",
          specialty: physician.specialty || state.encounter.physicianSpecialty || "",
          department: physician.department || state.encounter.department || "",
        },
      });

      if (!result.ok || !result.found || !result.clinicalKnowledgeAssembly) {
        throw new Error(result.error || "Procedure could not be resolved to a clinical knowledge package.");
      }

      const mappingFormId = result.clinicalKnowledgeAssembly.consentForm?.id || selectedProcedure.id;
      let fieldMappingReadiness: ConsentFieldMappingReadiness;
      try {
        fieldMappingReadiness = await fetchConsentFieldMappingReadiness(mappingFormId);
      } catch (error) {
        fieldMappingReadiness = {
          formId: mappingFormId,
          hasMapping: false,
          verificationStatus: "MISSING",
          sendBlocked: true,
          blockers: [error instanceof Error ? error.message : "Consent field mapping readiness could not be loaded."],
          requiredDoctorFields: [],
          requiredAnesthesiaFields: [],
          requiredPatientFields: [],
        };
      }

      setState((s) => ({
        ...s,
        selectedProcedureId: selectedProcedure.id,
        selectedProcedureTitle: selectedProcedure.titleEn,
        assembly: result.clinicalKnowledgeAssembly,
        fieldMappingReadiness,
        doctorCompletionValues: {},
        physicianSignatureDataUrl: "",
        step: "review",
        draftApproved: false,
        previewReviewed: false,
      }));
    } catch (error) {
      setAssemblyError(error instanceof Error ? error.message : "Failed to resolve procedure.");
    } finally {
      setAssemblyLoading(false);
    }
  }, [pathname, physician, router, searchParams, state.patient, state.encounter, state.reviewMode, state.selectedProcedure]);

  const setAnesthesia = useCallback((decision: ProductionWorkspaceState["anesthesiaOverride"]) => {
    setState((s) => ({ ...s, anesthesiaOverride: decision }));
  }, []);

  const setEducationIncluded = useCallback((included: boolean) => {
    setState((s) => ({ ...s, educationIncluded: included }));
  }, []);

  const setPhysicianNotes = useCallback((notes: string) => {
    setState((s) => ({ ...s, physicianNotes: notes }));
  }, []);

  const setReviewMode = useCallback((reviewMode: boolean) => {
    setState((s) => ({ ...s, reviewMode }));
  }, []);

  const setPreviewReviewed = useCallback((previewReviewed: boolean) => {
    setState((s) => ({ ...s, previewReviewed }));
  }, []);

  const approveDraft = useCallback(() => {
    setState((s) => ({ ...s, draftApproved: true }));
  }, []);

  const verifyFieldMapping = useCallback(async () => {
    if (!state.fieldMappingReadiness?.formId) {
      setSendError("Consent field mapping must be loaded before verification.");
      return;
    }
    setSendError("");
    try {
      const readiness = await verifyConsentFieldMapping(state.fieldMappingReadiness.formId);
      setState((s) => ({
        ...s,
        fieldMappingReadiness: readiness,
        draftApproved: false,
        previewReviewed: false,
      }));
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Field mapping verification failed.");
    }
  }, [state.fieldMappingReadiness?.formId]);

  const acknowledgeBlocker = useCallback((key: string) => {
    setState((s) => {
      const next = new Set(s.acknowledgedBlockers);
      next.add(key);
      return { ...s, acknowledgedBlockers: next };
    });
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setState((s) => {
      const next = new Set(s.acknowledgedAlerts);
      next.add(id);
      return { ...s, acknowledgedAlerts: next };
    });
  }, []);

  const setDoctorCompletionValue = useCallback((key: string, value: string) => {
    setState((s) => ({
      ...s,
      doctorCompletionValues: {
        ...s.doctorCompletionValues,
        [key]: value,
      },
    }));
  }, []);

  const setPhysicianSignatureDataUrl = useCallback(
    (physicianSignatureDataUrl: string) => {
      setState((current) => ({
        ...current,
        physicianSignatureDataUrl,
        draftApproved: false,
        previewReviewed: false,
      }));
    },
    [],
  );

  const validateSendPrerequisites = useCallback((): string | undefined => {
    if (!state.patient) return "Select a patient first.";
    if (!state.encounter) return "Select an encounter first.";
    if (!state.selectedProcedureId) return "Select a specific procedure first.";
    if (!state.assembly) return "Resolve a clinical knowledge package first.";
    if (state.assembly.status !== "ready") return "The knowledge package is not ready.";
    if (!state.fieldMappingReadiness) return "Consent field mapping readiness must be loaded before sending.";
    if (!state.fieldMappingReadiness.hasMapping) return "Consent field mapping is required before sending.";

    const requiredDoctorFields =
      state.fieldMappingReadiness.requiredDoctorFields ?? [];

    const doctorReadinessReport =
      analyzeDoctorReadiness({
        fields: requiredDoctorFields,
        values:
          state.doctorCompletionValues,
        physicianSignatureDataUrl:
          state.physicianSignatureDataUrl,
      });

    const missingDoctorFields =
      doctorReadinessReport.missingFields;
    if (missingDoctorFields.length > 0) {
      return "Complete required physician field: " + missingDoctorFields[0].labelEn + ".";
    }

    const requiredAnesthesiaFields = state.fieldMappingReadiness.requiredAnesthesiaFields ?? [];
    const anesthesiaDecision = state.doctorCompletionValues.anesthesia_applies;
    if (requiredAnesthesiaFields.length > 0 && anesthesiaDecision === "true") {
      return "Anesthesia review must be completed before patient dispatch.";
    }

    if ((state.fieldMappingReadiness.requiredPatientFields?.length ?? 0) === 0) {
      return "Patient signature field is not mapped.";
    }

    if (state.fieldMappingReadiness.verificationStatus !== "VERIFIED") {
      return "Consent field mapping must be clinically and legally verified before patient dispatch.";
    }

    const mappingBlockers = state.fieldMappingReadiness.blockers.filter((blocker) => {
      if (blocker === "Physician completion fields must be completed before patient dispatch.") return missingDoctorFields.length > 0;
      if (blocker === "Consent field mapping is not verified.") return false;
      return true;
    });
    if (mappingBlockers.length > 0) {
      return mappingBlockers[0] || "Consent field mapping blockers must be resolved before sending.";
    }
    const blockers = state.assembly.blockers.filter((b) => !state.acknowledgedBlockers.has(b.key));
    if (blockers.length > 0) return "Resolve or acknowledge all blockers first.";
    if (!state.previewReviewed) return "Review the patient-facing preview first.";
    if (!hasContact(state.recipientMobile, state.recipientEmail)) {
      return "Patient mobile number or email is required before sending.";
    }
    if (!state.sendEligibility?.allowlisted) {
      return state.sendEligibility?.reason || "Recipient is not approved for pilot send.";
    }
    if (!state.draftApproved) return "Approve the draft before sending.";
    return undefined;
  }, [state]);

  const send = useCallback(async () => {
    const validationError = validateSendPrerequisites();
    if (validationError) {
      setSendError(validationError);
      return;
    }
    if (!state.patient || !state.encounter || !state.assembly) return;

    setSendError("");
    setSendLoading(true);
    try {
      const document = await createConsentDocument({
        caseId: state.patient.caseId || state.encounter.id,
        templateId: state.assembly.consentForm?.id,
        approvedConsentFormId: state.assembly.consentForm?.id,
        language: state.patient.languagePreference === "ar" ? "ar" : state.patient.languagePreference === "en" ? "en" : "bilingual",
        physicianName: physician.name,
        physicianSpecialty: physician.specialty || state.encounter.physicianSpecialty || undefined,
        department: physician.department || state.encounter.department || undefined,
        diagnosis: state.encounter.diagnosis || undefined,
        plannedProcedure: state.selectedProcedureTitle,
        initialStatus: "READY_FOR_SIGNATURE",
        metadata: {
          selectedProcedureId: state.selectedProcedureId,
          selectedProcedureTitle: state.selectedProcedureTitle,
          procedureId: state.assembly.procedureId,
          procedureCode: state.assembly.procedureCode,
          selectedProcedureCode: state.selectedProcedure?.procedureCode,
          selectedCategoryCode: state.selectedProcedure?.categoryCode,
          packageId: state.assembly.packageId,
          approvedConsentFormId: state.assembly.consentForm?.id,
          approvedConsentFormCode: state.assembly.consentForm?.code,
          approvedConsentFormTitleEn: state.assembly.consentForm?.titleEn,
          approvedConsentFormTitleAr: state.assembly.consentForm?.titleAr,
          approvedConsentFormVersion: state.assembly.consentForm?.version,
          pdfTemplateUrl: state.assembly.consentForm?.pdfTemplateUrl,
          patientLanguagePreference: state.patient.languagePreference,
          doctorCompletionValues: state.doctorCompletionValues,
          fieldMappingReadiness: state.fieldMappingReadiness
            ? {
                formId: state.fieldMappingReadiness.formId,
                hasMapping: state.fieldMappingReadiness.hasMapping,
                verificationStatus: state.fieldMappingReadiness.verificationStatus,
                sendBlocked: state.fieldMappingReadiness.sendBlocked,
                blockers: state.fieldMappingReadiness.blockers,
                requiredDoctorFields: state.fieldMappingReadiness.requiredDoctorFields,
                requiredAnesthesiaFields: state.fieldMappingReadiness.requiredAnesthesiaFields,
                requiredPatientFields: state.fieldMappingReadiness.requiredPatientFields,
              }
            : undefined,
        },
      });

      await capturePhysicianSignatureForDocument({
        documentId: document.id,

        signatureDataUrl: state.physicianSignatureDataUrl,
      });

      const result = await sendSecureSigningLinkForDocument({
        documentId: document.id,
        caseId: state.patient.caseId || state.encounter.id,
        patientName: state.patient.name,
        mobileNumber: normalizeMobile(state.recipientMobile) || "",
        recipientEmail: state.recipientEmail.trim().toLowerCase() || "no-patient-email@unavailable.wathiqcare.local",
        physicianName: physician.name,
        locale: state.patient.languagePreference === "en" ? "en" : "ar",
      });

      const timeline = await fetchTimeline({
        tenantId: physician.tenantId,
        caseId: state.patient.caseId,
        documentId: document.id,
      });

      setState((s) => ({
        ...s,
        step: "sent",
        sentAt: new Date().toISOString(),
        signingResult: result,
        timeline,
      }));
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Failed to send consent.");
    } finally {
      setSendLoading(false);
    }
  }, [physician, state, validateSendPrerequisites]);

  const sendDryRun = useCallback(async () => {
    if (!state.patient || !state.encounter || !state.assembly) return;
    setSendError("");
    setSendLoading(true);
    try {
      const result = await dryRunSendSecureSigningLink({
        tenantId: physician.tenantId,
        documentId: "dry-run",
        caseId: state.patient.caseId || state.encounter.id,
        patientName: state.patient.name,
        mobileNumber: normalizeMobile(state.recipientMobile) || "+966500000000",
        recipientEmail: state.recipientEmail.trim().toLowerCase() || "no-patient-email@unavailable.wathiqcare.local",
        locale: state.patient.languagePreference === "en" ? "en" : "ar",
      });

      const timeline = await fetchTimeline({
        tenantId: physician.tenantId,
        caseId: state.patient.caseId,
        documentId: "dry-run",
      });

      setState((s) => ({
        ...s,
        dryRunSuccess: true,
        dryRunMessage: result.message,
        timeline,
      }));
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Dry-run send validation failed.");
    } finally {
      setSendLoading(false);
    }
  }, [physician.tenantId, state.patient, state.encounter, state.assembly, state.recipientMobile, state.recipientEmail]);

  const reset = useCallback(() => {
    setState({
      step: "patient",
      procedureQuery: "",
      educationIncluded: true,
      physicianNotes: "",
      draftApproved: false,
      reviewMode: false,
      previewReviewed: false,
      recipientMobile: "",
      recipientEmail: "",
      doctorCompletionValues: {},
      physicianSignatureDataUrl: "",
      dryRunSuccess: false,
      dryRunMessage: undefined,
      timeline: [],
      acknowledgedBlockers: new Set(),
      acknowledgedAlerts: new Set(),
    });
    setPatients([]);
    setEncounters([]);
  }, []);

  const readiness = useMemo(() => {
    const patientReady = !!state.patient;
    const encounterReady = !!state.encounter;
    const procedureSelected = !!state.selectedProcedureId;
    const pdfSourceVerified = isAssemblyApprovedPdfSourceVerified(state.assembly);
    const assemblyReady = state.assembly?.status === "ready" && pdfSourceVerified;
    const blockers = state.assembly?.blockers ?? [];
    const unacknowledgedBlockers = blockers.filter((b) => !state.acknowledgedBlockers.has(b.key));
    const blockersResolved = unacknowledgedBlockers.length === 0;
    const hasEducation = (state.assembly?.educationMaterials.length || 0) > 0;
    const educationReady = assemblyReady && (hasEducation || blockersResolved);
    const contactAvailable = hasContact(state.recipientMobile, state.recipientEmail);
    const allowlisted = Boolean(state.sendEligibility?.allowlisted);
    const previewReviewed = state.previewReviewed;
    const draftApproved = state.draftApproved;
    const fieldMappingReadiness = state.fieldMappingReadiness;
    const fieldMappingVerified = Boolean(
      fieldMappingReadiness?.hasMapping && fieldMappingReadiness.verificationStatus === "VERIFIED",
    );
    const requiredDoctorFields =
      fieldMappingReadiness?.requiredDoctorFields ?? [];

    const doctorReadinessReport =
      analyzeDoctorReadiness({
        fields: requiredDoctorFields,
        values:
          state.doctorCompletionValues,
        physicianSignatureDataUrl:
          state.physicianSignatureDataUrl,
      });

    const doctorCompletionReady =
      Boolean(
        fieldMappingReadiness
        && doctorReadinessReport.ready,
      );
    const requiredAnesthesiaFields = fieldMappingReadiness?.requiredAnesthesiaFields ?? [];
    const anesthesiaDecision = state.doctorCompletionValues.anesthesia_applies;
    const anesthesiaMappingReady = Boolean(
      fieldMappingReadiness && (requiredAnesthesiaFields.length === 0 || anesthesiaDecision === "false"),
    );
    const patientSignatureMapped = Boolean((fieldMappingReadiness?.requiredPatientFields.length || 0) > 0);

    const missingItems: string[] = [];
    if (!patientReady) missingItems.push("Patient selected");
    if (!encounterReady) missingItems.push("Encounter selected");
    if (!procedureSelected) missingItems.push("Procedure selected");
    if (!state.assembly) missingItems.push("Consent form loaded");
    else if (!pdfSourceVerified) missingItems.push("Approved PDF source verified");
    else if (!assemblyReady) missingItems.push("Consent form loaded");
    if (!fieldMappingReadiness) {
      missingItems.push("Consent field mapping loaded");
    } else {
      if (!fieldMappingReadiness.hasMapping) missingItems.push("Consent field mapping exists");
      if (!fieldMappingVerified) missingItems.push("Consent field mapping verified");
      if (!patientSignatureMapped) missingItems.push("Patient signature field mapped");
      if (!doctorCompletionReady) {
        doctorReadinessReport.missingFields.forEach(
          (field) =>
            missingItems.push(
              "Physician field: "
              + (field.section
                ? field.section + " · "
                : "")
              + field.labelEn,
            ),
        );
      }
      if (!anesthesiaMappingReady) missingItems.push("Anesthesia workflow reviewed when applicable");
    }
    if (!educationReady) missingItems.push("Education material loaded or confirmed unavailable");
    if (!previewReviewed) missingItems.push("Patient-facing preview reviewed");
    if (!contactAvailable) missingItems.push("Patient contact available");
    if (!allowlisted) missingItems.push("Recipient allowlisted");
    if (!blockersResolved) missingItems.push("Send blockers resolved");
    if (!draftApproved) missingItems.push("Draft approved");

    const checks = [
      patientReady,
      encounterReady,
      procedureSelected,
      assemblyReady,
      fieldMappingVerified,
      doctorCompletionReady,
      anesthesiaMappingReady,
      patientSignatureMapped,
      educationReady,
      previewReviewed,
      contactAvailable,
      allowlisted,
      blockersResolved,
      draftApproved,
    ];
    const completedChecks = checks.filter(Boolean).length;
    const totalChecks = checks.length;
    const sendReady = completedChecks === totalChecks && missingItems.length === 0;

    return {
      patientReady,
      encounterReady,
      procedureSelected,
      assemblyReady,
      blockersResolved,
      educationReady,
      previewReviewed,
      contactAvailable,
      allowlisted,
      draftApproved,
      fieldMappingVerified,
      doctorCompletionReady,
      doctorReadinessReport,
      anesthesiaMappingReady,
      patientSignatureMapped,
      fieldMappingReadiness,
      sendReady,
      completedChecks,
      totalChecks,
      progressPercentage: Math.round((completedChecks / totalChecks) * 100),
      blockers,
      unacknowledgedBlockers,
      missingItems,
    };
  }, [state]);

  const filteredProcedures = useMemo(() => {
    const q = state.procedureQuery.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter(
      (p) =>
        p.titleEn.toLowerCase().includes(q) ||
        p.titleAr.toLowerCase().includes(q) ||
        p.specialty.toLowerCase().includes(q) ||
        (p.department || "").toLowerCase().includes(q) ||
        (p.procedureCode || "").toLowerCase().includes(q) ||
        (p.categoryCode || "").toLowerCase().includes(q) ||
        (p.consentType || "").toLowerCase().includes(q) ||
        (p.templateType || "").toLowerCase().includes(q),
    );
  }, [procedures, state.procedureQuery]);

  const visibleProcedures = useMemo(() => {
    if (!state.selectedProcedure) {
      return filteredProcedures;
    }
    const hasSelected = filteredProcedures.some((procedure) => procedure.id === state.selectedProcedure?.id);
    return hasSelected ? filteredProcedures : [state.selectedProcedure, ...filteredProcedures];
  }, [filteredProcedures, state.selectedProcedure]);

  useEffect(() => {
    const query = state.procedureQuery.trim();
    if (!query) {
      setProcedureSearchMessage("");
      return;
    }

    if (filteredProcedures.length === 0) {
      const message = `No procedures matched "${query}". Try ICU, specialty, category, or code.`;
      setProcedureSearchMessage(message);
      console.debug("[informed-consents] procedure search returned no matches", { query, totalProcedures: procedures.length });
      return;
    }

    setProcedureSearchMessage("");
  }, [filteredProcedures.length, procedures.length, state.procedureQuery]);

  return {
    state,
    patients,
    patientsLoading,
    patientsError,
    encounters,
    encountersLoading,
    encountersError,
    assemblyLoading,
    assemblyError,
    procedures,
    proceduresLoading,
    proceduresError,
    filteredProcedures: visibleProcedures,
    procedureSearchMessage,
    sendLoading,
    sendError,
    readiness,
    searchForPatients,
    selectPatient,
    selectEncounter,
    setProcedureQuery,
    selectProcedure,
    setRecipientMobile,
    setRecipientEmail,
    resolveAssembly,
    setAnesthesia,
    setEducationIncluded,
    setPhysicianNotes,
    setReviewMode,
    setPreviewReviewed,
    setDoctorCompletionValue,
    setPhysicianSignatureDataUrl,
    approveDraft,
    verifyFieldMapping,
    acknowledgeBlocker,
    acknowledgeAlert,
    send,
    sendDryRun,
    reset,
  };
}
