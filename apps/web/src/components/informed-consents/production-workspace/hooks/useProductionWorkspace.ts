"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  ProductionPatient,
  ProductionEncounter,
  ProductionAssembly,
  PhysicianContext,
  SecureSigningResult,
  TimelineEvent,
} from "../types";
import {
  searchPatients,
  getPatientEncounters,
  resolveContentMapping,
  sendSecureSigningLink,
  fetchTimeline,
} from "../lib/api";

export type WorkspaceStep = "patient" | "encounter" | "procedure" | "review" | "sent";

export type ProductionWorkspaceState = {
  step: WorkspaceStep;
  patient?: ProductionPatient;
  encounter?: ProductionEncounter;
  procedureQuery: string;
  assembly?: ProductionAssembly;
  anesthesiaOverride?: "NONE" | "LOCAL" | "SEDATION" | "REGIONAL" | "GENERAL";
  educationIncluded: boolean;
  physicianNotes: string;
  draftApproved: boolean;
  sentAt?: string;
  signingResult?: SecureSigningResult;
  timeline: TimelineEvent[];
  acknowledgedBlockers: Set<string>;
  acknowledgedAlerts: Set<string>;
  dryRunSuccess?: boolean;
  dryRunResult?: SecureSigningResult;
};

export type Readiness = {
  patientReady: boolean;
  encounterReady: boolean;
  assemblyReady: boolean;
  blockersResolved: boolean;
  draftReady: boolean;
  sendReady: boolean;
  completedChecks: number;
  totalChecks: number;
  progressPercentage: number;
  blockers: ProductionAssembly["blockers"];
  unacknowledgedBlockers: ProductionAssembly["blockers"];
};

export function useProductionWorkspace(physician: PhysicianContext) {
  const [state, setState] = useState<ProductionWorkspaceState>({
    step: "patient",
    procedureQuery: "",
    educationIncluded: true,
    physicianNotes: "",
    draftApproved: false,
    timeline: [],
    acknowledgedBlockers: new Set(),
    acknowledgedAlerts: new Set(),
    dryRunSuccess: false,
  });

  const [patients, setPatients] = useState<ProductionPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState<string>("");

  const [encounters, setEncounters] = useState<ProductionEncounter[]>([]);
  const [encountersLoading, setEncountersLoading] = useState(false);
  const [encountersError, setEncountersError] = useState<string>("");

  const [assemblyLoading, setAssemblyLoading] = useState(false);
  const [assemblyError, setAssemblyError] = useState<string>("");

  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string>("");

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

  const selectPatient = useCallback(
    async (patient: ProductionPatient) => {
      const patientEncounters = await loadEncounters(patient);
      const defaultEncounter = patientEncounters[0];
      setState((s) => ({
        ...s,
        step: defaultEncounter ? "procedure" : "encounter",
        patient,
        encounter: defaultEncounter,
        assembly: undefined,
        anesthesiaOverride: undefined,
        draftApproved: false,
        sentAt: undefined,
        signingResult: undefined,
        timeline: [],
        acknowledgedBlockers: new Set(),
        acknowledgedAlerts: new Set(),
      }));
    },
    [loadEncounters],
  );

  const selectEncounter = useCallback((encounter: ProductionEncounter) => {
    setState((s) => ({
      ...s,
      step: "procedure",
      encounter,
      assembly: undefined,
      anesthesiaOverride: undefined,
      draftApproved: false,
      sentAt: undefined,
      signingResult: undefined,
    }));
  }, []);

  const resolveAssembly = useCallback(
    async (procedureName: string) => {
      if (!state.patient || !state.encounter) return;
      setAssemblyError("");
      setAssemblyLoading(true);
      try {
        const result = await resolveContentMapping({
          procedure: procedureName,
          tenantId: physician.tenantId,
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

        setState((s) => ({
          ...s,
          procedureQuery: procedureName,
          assembly: result.clinicalKnowledgeAssembly,
          step: "review",
          draftApproved: false,
        }));
      } catch (error) {
        setAssemblyError(error instanceof Error ? error.message : "Failed to resolve procedure.");
      } finally {
        setAssemblyLoading(false);
      }
    },
    [physician, state.patient, state.encounter],
  );

  const setAnesthesia = useCallback((decision: ProductionWorkspaceState["anesthesiaOverride"]) => {
    setState((s) => ({ ...s, anesthesiaOverride: decision }));
  }, []);

  const setEducationIncluded = useCallback((included: boolean) => {
    setState((s) => ({ ...s, educationIncluded: included }));
  }, []);

  const setPhysicianNotes = useCallback((notes: string) => {
    setState((s) => ({ ...s, physicianNotes: notes }));
  }, []);

  const approveDraft = useCallback(() => {
    setState((s) => ({ ...s, draftApproved: true }));
  }, []);

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

  const send = useCallback(async () => {
    if (!state.patient || !state.encounter || !state.assembly) return;
    setSendError("");
    setSendLoading(true);
    try {
      const documentId = crypto.randomUUID();
      const result = await sendSecureSigningLink({
        tenantId: physician.tenantId,
        documentId,
        caseId: state.patient.caseId || state.encounter.id,
        patientName: state.patient.name,
        mobileNumber: state.patient.mobileNumber || "",
        // Patient email is not available in the current patient record; use a clearly
        // marked unavailable address so the secure-signing service can still attempt SMS delivery.
        recipientEmail: "no-patient-email@unavailable.wathiqcare.local",
        locale: state.patient.languagePreference === "ar" ? "ar" : "en",
      });

      const timeline = await fetchTimeline({
        tenantId: physician.tenantId,
        caseId: state.patient.caseId,
        documentId,
      });

      setState((s) => ({
        ...s,
        step: "sent",
        sentAt: new Date().toISOString(),
        signingResult: result,
        timeline,
        dryRunSuccess: false,
        dryRunResult: undefined,
      }));
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Failed to send consent.");
    } finally {
      setSendLoading(false);
    }
  }, [physician.tenantId, state.patient, state.encounter, state.assembly]);

  const sendDryRun = useCallback(async () => {
    if (!state.patient || !state.encounter || !state.assembly) return;
    setSendError("");
    setSendLoading(true);
    try {
      const documentId = crypto.randomUUID();
      const result = await sendSecureSigningLink({
        tenantId: physician.tenantId,
        documentId,
        caseId: state.patient.caseId || state.encounter.id,
        patientName: state.patient.name,
        mobileNumber: state.patient.mobileNumber || "",
        recipientEmail: "no-patient-email@unavailable.wathiqcare.local",
        locale: state.patient.languagePreference === "ar" ? "ar" : "en",
        dryRun: true,
      });

      setState((s) => ({
        ...s,
        dryRunSuccess: true,
        dryRunResult: result,
      }));
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Dry-run failed.");
    } finally {
      setSendLoading(false);
    }
  }, [physician.tenantId, state.patient, state.encounter, state.assembly]);

  const reset = useCallback(() => {
    setState({
      step: "patient",
      procedureQuery: "",
      educationIncluded: true,
      physicianNotes: "",
      draftApproved: false,
      timeline: [],
      acknowledgedBlockers: new Set(),
      acknowledgedAlerts: new Set(),
      dryRunSuccess: false,
    });
    setPatients([]);
    setEncounters([]);
  }, []);

  const readiness = useMemo(() => {
    const patientReady = !!state.patient;
    const encounterReady = !!state.encounter;
    const assemblyReady = state.assembly?.status === "ready";
    const blockers = state.assembly?.blockers ?? [];
    const unacknowledgedBlockers = blockers.filter((b) => !state.acknowledgedBlockers.has(b.key));
    const blockersResolved = unacknowledgedBlockers.length === 0;
    const draftReady = patientReady && encounterReady && assemblyReady && blockersResolved;
    const sendReady = draftReady && state.draftApproved;
    const completedChecks = [patientReady, encounterReady, assemblyReady && blockersResolved, state.draftApproved].filter(Boolean).length;
    const totalChecks = 4;
    return {
      patientReady,
      encounterReady,
      assemblyReady,
      blockersResolved,
      draftReady,
      sendReady,
      completedChecks,
      totalChecks,
      progressPercentage: Math.round((completedChecks / totalChecks) * 100),
      blockers,
      unacknowledgedBlockers,
    };
  }, [state]);

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
    sendLoading,
    sendError,
    readiness,
    searchForPatients,
    selectPatient,
    selectEncounter,
    resolveAssembly,
    setAnesthesia,
    setEducationIncluded,
    setPhysicianNotes,
    approveDraft,
    acknowledgeBlocker,
    acknowledgeAlert,
    send,
    sendDryRun,
    reset,
  };
}
