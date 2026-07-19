"use client";

import { isAssemblyApprovedPdfSourceVerified } from "../utils/approvedPdfSource";
import { normalizePatientDob } from "../utils/normalizePatientDob";
import { buildAcroFormFilledDraftPreviewInput } from "../utils/buildAcroFormFilledDraftPreviewInput";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  createAcroFormFilledDraftPreview,
} from "../lib/api";
import type { ConsentFieldMappingReadiness } from "../lib/api";
import { analyzeDoctorReadiness, type DoctorReadinessReport } from "../doctorReadiness";
import {
  computePhysicianJourneyReadiness,
  type PhysicianJourneyReadiness,
  type ReadinessItem,
} from "@/lib/server/physician-journey-readiness";

export type FilledDraftStatus = "idle" | "loading" | "current" | "stale" | "error";

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
  /** ISO timestamp captured when the physician signature image is set. */
  physicianSignedAt?: string;
  filledDraftPdfUrl?: string;
  filledDraftFingerprint?: string;
  filledDraftStatus: FilledDraftStatus;
  filledDraftError?: string;
  filledDraftReviewed: boolean;
  pdfViewerMode: "source" | "filled";
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
  // Canonical readiness aggregate (server-derived logic)
  items: ReadinessItem[];
  notApplicableCount: number;
  blocked: boolean;
  blockerItemKeys: string[];
  aggregate: PhysicianJourneyReadiness;
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
    physicianSignedAt: undefined,
    filledDraftStatus: "idle",
    filledDraftReviewed: false,
    pdfViewerMode: "source",
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
  const filledDraftAbortControllerRef = useRef<AbortController | null>(null);
  const eligibilityRequestIdRef = useRef(0);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    return () => {
      if (state.filledDraftPdfUrl) {
        URL.revokeObjectURL(state.filledDraftPdfUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function staleFilledDraft(previous: ProductionWorkspaceState): Partial<ProductionWorkspaceState> {
    if (previous.filledDraftPdfUrl) {
      URL.revokeObjectURL(previous.filledDraftPdfUrl);
    }
    return {
      filledDraftPdfUrl: undefined,
      filledDraftStatus: "stale",
      filledDraftReviewed: false,
      filledDraftError: undefined,
      previewReviewed: false,
      draftApproved: false,
    };
  }

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

  useEffect(() => {
    void loadProcedures();
  }, [loadProcedures]);

  const refreshSendEligibility = useCallback(async (mobile: string, email: string) => {
    if (!hasContact(mobile, email)) {
      setState((s) => ({
        ...s,
        sendEligibility: { pilotEnabled: false, allowlisted: false, reason: "Patient contact is missing." },
      }));
      return;
    }
    const requestId = ++eligibilityRequestIdRef.current;
    try {
      const result = await checkSendEligibility({ mobileNumber: mobile, recipientEmail: email });
      setState((s) => {
        if (requestId !== eligibilityRequestIdRef.current) return s;
        return { ...s, sendEligibility: result };
      });
    } catch {
      setState((s) => {
        if (requestId !== eligibilityRequestIdRef.current) return s;
        return {
          ...s,
          sendEligibility: { pilotEnabled: false, allowlisted: false, reason: "Unable to verify recipient eligibility." },
        };
      });
    }
  }, []);

  const selectPatient = useCallback(
    async (patient: ProductionPatient) => {
      const patientEncounters = await loadEncounters(patient);
      const defaultEncounter = patientEncounters[0];
      const mobile = patient.mobileNumber || "";
      const email = patient.email || "";
      const normalizedDob = normalizePatientDob(patient.dateOfBirth) ?? null;
      setState((s) => ({
        ...s,
        ...staleFilledDraft(s),
        step: defaultEncounter ? "procedure" : "encounter",
        patient: { ...patient, dateOfBirth: normalizedDob },
        encounter: defaultEncounter,
        assembly: undefined,
        fieldMappingReadiness: undefined,
        doctorCompletionValues: {},
        physicianSignatureDataUrl: "",
        physicianSignedAt: undefined,
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
    setState((s) => {
      const encounterDob = normalizePatientDob(encounter.patientDateOfBirth);
      const nextPatient = s.patient
        ? {
            ...s.patient,
            dateOfBirth: s.patient.dateOfBirth || encounterDob || null,
          }
        : s.patient;
      return {
        ...s,
        ...staleFilledDraft(s),
        step: "procedure",
        patient: nextPatient,
        encounter,
        assembly: undefined,
        fieldMappingReadiness: undefined,
        doctorCompletionValues: {},
        physicianSignatureDataUrl: "",
        physicianSignedAt: undefined,
        selectedProcedureId: undefined,
        selectedProcedureTitle: undefined,
        selectedProcedure: undefined,
        procedureQuery: "",
        anesthesiaOverride: undefined,
        draftApproved: false,
        previewReviewed: false,
        sentAt: undefined,
        signingResult: undefined,
      };
    });
  }, []);

  const setProcedureQuery = useCallback((procedureQuery: string) => {
    setState((s) => ({ ...s, procedureQuery }));
  }, []);

  const selectProcedure = useCallback((procedureId: string) => {
    const selectedProcedure = procedures.find((procedure) => procedure.id === procedureId);
    setState((s) => ({
      ...s,
      ...staleFilledDraft(s),
      selectedProcedureId: selectedProcedure?.id,
      selectedProcedureTitle: selectedProcedure?.titleEn,
      selectedProcedure,
      assembly: undefined,
      fieldMappingReadiness: undefined,
      doctorCompletionValues: {},
      physicianSignatureDataUrl: "",
      physicianSignedAt: undefined,
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
        ...staleFilledDraft(s),
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

  const setAnesthesia = useCallback((decision: ProductionWorkspaceState["anesthesiaOverride"]) => {
    setState((s) => ({
      ...s,
      ...staleFilledDraft(s),
      anesthesiaOverride: decision,
      doctorCompletionValues: {
        ...s.doctorCompletionValues,
        anesthesia_applies: decision && decision !== "NONE" ? "true" : "false",
      },
      draftApproved: false,
      previewReviewed: false,
      signingResult: undefined,
      sentAt: undefined,
      dryRunSuccess: false,
      dryRunMessage: undefined,
    }));
  }, []);

  const setDoctorCompletionValue = useCallback((key: string, value: string) => {
    setState((s) => ({
      ...s,
      ...staleFilledDraft(s),
      doctorCompletionValues: {
        ...s.doctorCompletionValues,
        [key]: value,
      },
      draftApproved: false,
      previewReviewed: false,
      signingResult: undefined,
      sentAt: undefined,
      dryRunSuccess: false,
      dryRunMessage: undefined,
    }));
  }, []);

  const setPhysicianSignatureDataUrl = useCallback(
    (physicianSignatureDataUrl: string) => {
      setState((current) => ({
        ...current,
        ...staleFilledDraft(current),
        physicianSignatureDataUrl,
        physicianSignedAt: physicianSignatureDataUrl ? new Date().toISOString() : undefined,
        draftApproved: false,
        previewReviewed: false,
        signingResult: undefined,
        sentAt: undefined,
        dryRunSuccess: false,
        dryRunMessage: undefined,
      }));
    },
    [],
  );

  const approveDraft = useCallback(() => {
    setState((s) => ({ ...s, draftApproved: true }));
  }, []);

  const setFilledDraftReviewed = useCallback((reviewed: boolean) => {
    setState((s) => ({ ...s, filledDraftReviewed: reviewed }));
  }, []);

  const setPdfViewerMode = useCallback((mode: "source" | "filled") => {
    setState((s) => ({ ...s, pdfViewerMode: mode }));
  }, []);

  const generateFilledDraftPreview = useCallback(async () => {
    if (!state.assembly || !state.patient || !state.encounter) return;

    const formId = state.fieldMappingReadiness?.formId || state.assembly.consentForm?.id;
    const approvedPdfUrl = state.assembly.consentForm?.pdfTemplateUrl;
    const manifestHash = state.fieldMappingReadiness?.acroForm?.manifestState?.hash;

    if (!formId || !approvedPdfUrl || !manifestHash) {
      setState((s) => ({
        ...s,
        filledDraftStatus: "error",
        filledDraftError: "Form mapping or approved PDF source is not ready.",
      }));
      return;
    }

    if (filledDraftAbortControllerRef.current) {
      filledDraftAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    filledDraftAbortControllerRef.current = controller;

    setState((s) => ({
      ...s,
      filledDraftStatus: "loading",
      filledDraftError: undefined,
    }));

    try {
      const input = buildAcroFormFilledDraftPreviewInput({
        formId,
        approvedPdfUrl,
        manifestHash,
        patient: state.patient,
        encounter: state.encounter,
        physician,
        doctorCompletionValues: state.doctorCompletionValues,
        physicianSignatureDataUrl: state.physicianSignatureDataUrl,
        physicianSignedAt: state.physicianSignedAt,
      });
      const result = await createAcroFormFilledDraftPreview(input, controller.signal);

      if (controller.signal.aborted) {
        URL.revokeObjectURL(result.url);
        return;
      }

      setState((s) => {
        if (s.filledDraftPdfUrl) URL.revokeObjectURL(s.filledDraftPdfUrl);
        return {
          ...s,
          filledDraftPdfUrl: result.url,
          filledDraftFingerprint: result.fingerprint,
          filledDraftStatus: "current",
          filledDraftReviewed: false,
          filledDraftError: undefined,
          draftApproved: false,
          pdfViewerMode: "filled",
        };
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((s) => ({
        ...s,
        filledDraftStatus: "error",
        filledDraftError:
          error instanceof Error ? error.message : "Failed to generate filled draft preview.",
      }));
    } finally {
      if (filledDraftAbortControllerRef.current === controller) {
        filledDraftAbortControllerRef.current = null;
      }
    }
  }, [
    state.assembly,
    state.patient,
    state.encounter,
    state.doctorCompletionValues,
    state.fieldMappingReadiness,
    state.physicianSignatureDataUrl,
    state.physicianSignedAt,
    physician,
  ]);

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





  const validateSendPrerequisites = useCallback((): string | undefined => {
    const aggregate = computePhysicianJourneyReadiness({
      patient: state.patient,
      encounter: state.encounter,
      selectedProcedure: state.selectedProcedure,
      assembly: state.assembly,
      fieldMappingReadiness: state.fieldMappingReadiness,
      doctorCompletionValues: state.doctorCompletionValues,
      physicianSignatureDataUrl: state.physicianSignatureDataUrl,
      anesthesiaOverride: state.anesthesiaOverride,
      previewReviewed: state.previewReviewed,
      filledDraftStatus: state.filledDraftStatus,
      filledDraftReviewed: state.filledDraftReviewed,
      recipientMobile: state.recipientMobile,
      recipientEmail: state.recipientEmail,
      sendEligibility: state.sendEligibility,
      draftApproved: state.draftApproved,
      acknowledgedBlockers: state.acknowledgedBlockers,
      physicianContext: physician,
    });

    if (!aggregate.sendReady) {
      const firstBlocked = aggregate.items.find((i) => i.status === "BLOCKED" || i.status === "REQUIRED");
      return firstBlocked?.detail || firstBlocked?.labelEn || "Complete all readiness gates before sending.";
    }
    return undefined;
  }, [state, physician]);

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
        physicianLicense: physician.licenseNumber || state.encounter.physicianLicense || undefined,
        physicianSpecialty: physician.specialty || state.encounter.physicianSpecialty || undefined,
        department: physician.department || state.encounter.department || undefined,
        diagnosis: state.encounter.diagnosis || undefined,
        plannedProcedure: state.selectedProcedureTitle,
        dob: state.patient.dateOfBirth || undefined,
        gender: state.patient.gender || undefined,
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
          approvedPdfUrl: state.assembly.consentForm?.pdfTemplateUrl,
          patientLanguagePreference: state.patient.languagePreference,
          doctorCompletionValues: state.doctorCompletionValues,
          patientDisplay: {
            name: state.patient.name,
            mrn: state.patient.mrn,
            dob: state.patient.dateOfBirth,
          },
          physicianContext: {
            name: physician.name,
            designation: physician.specialty || state.encounter.physicianSpecialty || undefined,
            designationEn: physician.specialtyEn || state.encounter.physicianSpecialtyEn || undefined,
            designationAr: physician.specialtyAr || state.encounter.physicianSpecialtyAr || undefined,
          },
          encounterReference: {
            id: state.encounter.id,
            encounterId: state.encounter.encounterId,
          },
          filledDraftFingerprint: state.filledDraftFingerprint,
          filledDraftReviewed: state.filledDraftReviewed,
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
                acroForm: state.fieldMappingReadiness.acroForm
                  ? {
                      canonicalTemplateIdentity: state.fieldMappingReadiness.acroForm.canonicalTemplateIdentity,
                      manifestState: state.fieldMappingReadiness.acroForm.manifestState,
                    }
                  : undefined,
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
    setState((s) => {
      if (s.filledDraftPdfUrl) URL.revokeObjectURL(s.filledDraftPdfUrl);
      return {
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
        filledDraftPdfUrl: undefined,
        filledDraftFingerprint: undefined,
        filledDraftStatus: "idle",
        filledDraftError: undefined,
        filledDraftReviewed: false,
        pdfViewerMode: "source",
        dryRunSuccess: false,
        dryRunMessage: undefined,
        timeline: [],
        acknowledgedBlockers: new Set(),
        acknowledgedAlerts: new Set(),
      };
    });
    setPatients([]);
    setEncounters([]);
  }, []);

  const readiness = useMemo(() => {
    const pdfSourceVerified = isAssemblyApprovedPdfSourceVerified(state.assembly);
    const assemblyReady = state.assembly?.status === "ready" && pdfSourceVerified;
    const blockers = state.assembly?.blockers ?? [];
    const unacknowledgedBlockers = blockers.filter((b) => !state.acknowledgedBlockers.has(b.key));
    const blockersResolved = unacknowledgedBlockers.length === 0;
    const hasEducation = (state.assembly?.educationMaterials.length || 0) > 0;
    const educationReady = assemblyReady && (hasEducation || blockersResolved);
    const contactAvailable = hasContact(state.recipientMobile, state.recipientEmail);
    const allowlisted = Boolean(state.sendEligibility?.allowlisted);
    const fieldMappingReadiness = state.fieldMappingReadiness;
    const isAcroFormBacked = Boolean(fieldMappingReadiness?.acroForm);
    const previewReviewed = isAcroFormBacked ? state.filledDraftReviewed : state.previewReviewed;
    const draftApproved = state.draftApproved;
    const fieldMappingVerified = Boolean(
      fieldMappingReadiness?.hasMapping && fieldMappingReadiness.verificationStatus === "VERIFIED",
    );
    const requiredDoctorFields = fieldMappingReadiness?.requiredDoctorFields ?? [];

    const doctorReadinessReport = analyzeDoctorReadiness({
      fields: requiredDoctorFields,
      values: state.doctorCompletionValues,
      physicianSignatureDataUrl: state.physicianSignatureDataUrl,
    });

    const doctorCompletionReady = Boolean(fieldMappingReadiness && doctorReadinessReport.ready);
    const requiredAnesthesiaFields = fieldMappingReadiness?.requiredAnesthesiaFields ?? [];
    const anesthesiaDecision = state.doctorCompletionValues.anesthesia_applies;
    const effectiveAnesthesiaFields = requiredAnesthesiaFields.filter((field) => {
      if (!field.requiredWhen) return true;
      const match = field.requiredWhen.trim().match(/^([a-zA-Z0-9_]+)\s*===\s*(true|false)$/);
      if (!match) return true;
      const [, key, expected] = match;
      const actual = state.doctorCompletionValues[key];
      return expected === "true" ? actual === "true" : actual === "false";
    });
    const anesthesiaDecisionAnswered = anesthesiaDecision === "true" || anesthesiaDecision === "false" || state.anesthesiaOverride !== undefined;
    const anesthesiaApplies = anesthesiaDecision === "true" || (state.anesthesiaOverride !== undefined && state.anesthesiaOverride !== "NONE");
    const anesthesiaMappingReady = Boolean(
      fieldMappingReadiness &&
        (effectiveAnesthesiaFields.length === 0 ||
          (anesthesiaDecisionAnswered && (!anesthesiaApplies || effectiveAnesthesiaFields.every((field) => {
            const value = state.doctorCompletionValues[field.key];
            return value !== undefined && String(value).trim().length > 0;
          })))),
    );
    const patientSignatureMapped = Boolean((fieldMappingReadiness?.requiredPatientFields.length || 0) > 0);

    const aggregate = computePhysicianJourneyReadiness({
      patient: state.patient,
      encounter: state.encounter,
      selectedProcedure: state.selectedProcedure,
      assembly: state.assembly,
      fieldMappingReadiness: state.fieldMappingReadiness,
      doctorCompletionValues: state.doctorCompletionValues,
      physicianSignatureDataUrl: state.physicianSignatureDataUrl,
      anesthesiaOverride: state.anesthesiaOverride,
      previewReviewed: state.previewReviewed,
      filledDraftStatus: state.filledDraftStatus,
      filledDraftReviewed: state.filledDraftReviewed,
      recipientMobile: state.recipientMobile,
      recipientEmail: state.recipientEmail,
      sendEligibility: state.sendEligibility,
      draftApproved: state.draftApproved,
      acknowledgedBlockers: state.acknowledgedBlockers,
      physicianContext: physician,
    });

    const missingItems: string[] = aggregate.missingItemKeys.map((key) => {
      const found = aggregate.items.find((i) => i.key === key);
      return found ? found.labelEn : key;
    });

    const sendReady = aggregate.sendReady;

    return {
      patientReady: !!state.patient,
      encounterReady: !!state.encounter,
      procedureSelected: !!state.selectedProcedureId,
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
      completedChecks: aggregate.completedCount,
      totalChecks: aggregate.totalCount,
      progressPercentage: aggregate.progressPercentage,
      blockers,
      unacknowledgedBlockers,
      missingItems,
      items: aggregate.items,
      notApplicableCount: aggregate.notApplicableCount,
      blocked: aggregate.blocked,
      blockerItemKeys: aggregate.blockerItemKeys,
      aggregate,
    };
  }, [state, physician]);

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
    generateFilledDraftPreview,
    setFilledDraftReviewed,
    setPdfViewerMode,
    verifyFieldMapping,
    acknowledgeBlocker,
    acknowledgeAlert,
    send,
    sendDryRun,
    reset,
  };
}
