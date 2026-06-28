"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  Patient,
  Encounter,
  Procedure,
  MockClinicalKnowledgeAssembly,
  AnesthesiaDecision,
  WorkspaceState,
  TaskMetrics,
  PatientJourneyState,
  TimelineEvent,
  PatientAlert,
  PatientLanguage,
  PatientJourneyStep,
  PatientDecision,
  SignatureRecord,
  TimelineActor,
  TimelineEventType,
} from "../types/workspace";
import { MOCK_ENCOUNTERS, resolveMockAssembly, resolvePatientAlerts } from "../lib/mock-data";

export type WorkspaceAction =
  | { type: "select_patient"; patient: Patient }
  | { type: "select_encounter"; encounter: Encounter }
  | { type: "select_procedure"; procedure: Procedure }
  | { type: "set_anesthesia"; decision: AnesthesiaDecision }
  | { type: "toggle_education"; included: boolean }
  | { type: "set_notes"; notes: string }
  | { type: "approve_draft" }
  | { type: "send" }
  | { type: "reset" }
  | { type: "set_journey_mode"; mode: WorkspaceState["journeyMode"] }
  | { type: "acknowledge_alert"; alertId: string }
  | { type: "patient_set_accessibility"; accessibility: Partial<PatientJourneyState["accessibility"]> }
  | { type: "patient_advance_step"; step: PatientJourneyStep }
  | { type: "patient_update_education_progress"; progress: number }
  | { type: "patient_complete_education"; score?: number; passed?: boolean }
  | { type: "patient_submit_question"; text: string }
  | { type: "patient_record_decision"; decision: PatientDecision }
  | { type: "patient_capture_signature"; signature: SignatureRecord }
  | { type: "patient_verify_otp" }
  | { type: "patient_complete_journey" }
  | { type: "physician_review_completion" };

function buildInitialMetrics(): TaskMetrics {
  return {
    clicks: 0,
    decisions: 0,
    startTime: Date.now(),
    durationMs: 0,
    blockersHit: 0,
    patientInteractions: 0,
    patientScreensViewed: 0,
    educationTimeMs: 0,
    questionsAsked: 0,
    blockersCaughtBeforeSend: 0,
  };
}

function buildInitialPatientJourney(patient?: Patient): PatientJourneyState {
  const lang: PatientLanguage = patient?.languagePreference === "en" ? "en" : "ar";
  return {
    currentStep: "landing",
    accessibility: { language: lang, textSize: "normal", highContrast: false },
    educationProgress: 0,
    questions: [],
    signatures: [],
    otpVerified: false,
    patientInteractions: 0,
    screensViewed: 0,
  };
}

function deriveAssembly(
  procedure: Procedure,
  patient: Patient,
  anesthesiaOverride: AnesthesiaDecision | undefined,
): MockClinicalKnowledgeAssembly {
  return resolveMockAssembly({
    procedureCode: procedure.code,
    capacityStatus: patient.capacityStatus,
    languagePreference: patient.languagePreference,
    anesthesiaDecision: anesthesiaOverride ?? (procedure.anesthesiaRequired ? "GENERAL" : "NONE"),
  });
}

function deriveAlerts(
  procedure?: Procedure,
  encounter?: Encounter,
  patient?: Patient,
): PatientAlert[] {
  if (!procedure || !encounter || !patient) return [];
  return resolvePatientAlerts({ procedure, encounter, patient });
}

function makeTimelineEvent(
  type: TimelineEventType,
  actor: TimelineActor,
  actorName: string,
  metadata?: Record<string, unknown>,
): TimelineEvent {
  const now = new Date();
  return {
    id: `evt-${type}-${now.getTime()}`,
    type,
    actor,
    actorName,
    timestamp: now.toISOString(),
    status: "completed",
    summaryEn: type.replace(/_/g, " ").toLowerCase(),
    summaryAr: type.replace(/_/g, " ").toLowerCase(),
    evidenceHash: `sha256-${Math.random().toString(36).slice(2, 10)}`,
    metadata,
  };
}

const EVENT_SUMMARIES: Record<TimelineEventType, { en: string; ar: string }> = {
  CONSENT_DISPATCHED: { en: "Consent dispatched to patient secure link.", ar: "تم إرسال الموافقة إلى رابط المريض الآمن." },
  PATIENT_LANDING_VIEWED: { en: "Patient opened the secure signing session.", ar: "فتح المريض جلسة التوقيع الآمنة." },
  LANGUAGE_SELECTED: { en: "Patient selected display language.", ar: "اختار المريض لغة العرض." },
  EDUCATION_PRESENTED: { en: "Patient education presented.", ar: "تم عرض التثقيف للمريض." },
  EDUCATION_COMPLETED: { en: "Patient completed education module.", ar: "أكمل المريض وحدة التثقيف." },
  QUESTION_SUBMITTED: { en: "Patient submitted a question.", ar: "قدم المريض سؤالاً." },
  QUESTION_ANSWERED: { en: "Physician answered patient question.", ar: "أجاب الطبيب على سؤال المريض." },
  DECISION_ACCEPTED: { en: "Patient accepted the procedure.", ar: "وافق المريض على الإجراء." },
  DECISION_REFUSED: { en: "Patient refused the procedure.", ar: "رفض المريض الإجراء." },
  OTP_REQUESTED: { en: "Patient requested OTP.", ar: "طلب المريض رمز التحقق." },
  OTP_VERIFIED: { en: "Patient verified OTP.", ar: "تحقق المريض من رمز التحقق." },
  SIGNATURE_CAPTURED: { en: "Signature captured.", ar: "تم التقاط التوقيع." },
  PDF_FINALIZED: { en: "Consent PDF finalized.", ar: "تم إنهاء ملف PDF للموافقة." },
  ARCHIVED_TO_CLINICAL_RECORD: { en: "Consent archived to clinical record.", ar: "تم أرشفة الموافقة في السجل الطبي." },
  PHYSICIAN_COMPLETION_REVIEWED: { en: "Physician reviewed completion and evidence.", ar: "راجع الطبيب الإكمال والأدلة." },
};

function enrichTimelineEvent(event: TimelineEvent): TimelineEvent {
  const summary = EVENT_SUMMARIES[event.type];
  return {
    ...event,
    summaryEn: summary?.en ?? event.summaryEn,
    summaryAr: summary?.ar ?? event.summaryAr,
  };
}

export function useWorkspaceState() {
  const [state, setState] = useState<WorkspaceState>({
    educationIncluded: true,
    physicianNotes: "",
    draftApproved: false,
    journeyMode: "physician",
    patientJourney: buildInitialPatientJourney(),
    timeline: [],
    alerts: [],
    acknowledgedAlertIds: new Set<string>(),
  });
  const [metrics, setMetrics] = useState<TaskMetrics>(buildInitialMetrics);

  const trackClick = useCallback(() => {
    setMetrics((m) => ({ ...m, clicks: m.clicks + 1, durationMs: Date.now() - m.startTime }));
  }, []);

  const trackDecision = useCallback(() => {
    setMetrics((m) => ({ ...m, decisions: m.decisions + 1, durationMs: Date.now() - m.startTime }));
  }, []);

  const trackPatientInteraction = useCallback(() => {
    setMetrics((m) => ({
      ...m,
      patientInteractions: m.patientInteractions + 1,
      durationMs: Date.now() - m.startTime,
    }));
  }, []);

  const appendTimeline = useCallback((event: TimelineEvent) => {
    setState((s) => ({ ...s, timeline: [...s.timeline, enrichTimelineEvent(event)] }));
  }, []);

  const dispatch = useCallback(
    (action: WorkspaceAction) => {
      const isPatientAction = action.type.startsWith("patient_");
      if (isPatientAction) {
        trackPatientInteraction();
      } else {
        trackClick();
      }

      switch (action.type) {
        case "select_patient": {
          trackDecision();
          const encounters = MOCK_ENCOUNTERS[action.patient.id] ?? [];
          const defaultEncounter = encounters[0];
          setState((s) => ({
            ...s,
            patient: action.patient,
            encounter: defaultEncounter,
            procedure: undefined,
            assembly: undefined,
            anesthesiaOverride: undefined,
            draftApproved: false,
            sentAt: undefined,
            alerts: [],
            acknowledgedAlertIds: new Set<string>(),
            patientJourney: buildInitialPatientJourney(action.patient),
            timeline: [],
          }));
          return;
        }
        case "select_encounter": {
          trackDecision();
          setState((s) => ({
            ...s,
            encounter: action.encounter,
            procedure: undefined,
            assembly: undefined,
            anesthesiaOverride: undefined,
            draftApproved: false,
            sentAt: undefined,
            alerts: [],
            acknowledgedAlertIds: new Set<string>(),
            patientJourney: buildInitialPatientJourney(s.patient),
            timeline: [],
          }));
          return;
        }
        case "select_procedure": {
          trackDecision();
          const { patient } = state;
          const assembly = patient
            ? deriveAssembly(action.procedure, patient, state.anesthesiaOverride)
            : undefined;
          const alerts = deriveAlerts(action.procedure, state.encounter, patient);
          setState((s) => ({
            ...s,
            procedure: action.procedure,
            assembly,
            alerts,
            acknowledgedAlertIds: new Set<string>(),
            draftApproved: false,
            sentAt: undefined,
            patientJourney: { ...s.patientJourney, currentStep: "landing" },
          }));
          return;
        }
        case "set_anesthesia": {
          trackDecision();
          const { patient, procedure } = state;
          const assembly = patient && procedure
            ? deriveAssembly(procedure, patient, action.decision)
            : state.assembly;
          setState((s) => ({ ...s, anesthesiaOverride: action.decision, assembly }));
          return;
        }
        case "toggle_education": {
          trackDecision();
          setState((s) => ({ ...s, educationIncluded: action.included }));
          return;
        }
        case "set_notes": {
          setState((s) => ({ ...s, physicianNotes: action.notes }));
          return;
        }
        case "approve_draft": {
          trackDecision();
          setState((s) => ({ ...s, draftApproved: true }));
          return;
        }
        case "send": {
          trackDecision();
          const endTime = Date.now();
          const blockersCaught =
            (state.assembly?.blockers.length ?? 0) +
            state.alerts.filter((a) => a.severity !== "info").length;
          setState((s) => ({
            ...s,
            sentAt: new Date().toISOString(),
            journeyMode: "timeline",
          }));
          setMetrics((m) => ({
            ...m,
            endTime,
            durationMs: endTime - m.startTime,
            blockersCaughtBeforeSend: m.blockersCaughtBeforeSend + blockersCaught,
          }));
          appendTimeline(makeTimelineEvent("CONSENT_DISPATCHED", "physician", state.patient?.name ?? "Physician"));
          return;
        }
        case "reset": {
          setState({
            educationIncluded: true,
            physicianNotes: "",
            draftApproved: false,
            journeyMode: "physician",
            patientJourney: buildInitialPatientJourney(),
            timeline: [],
            alerts: [],
            acknowledgedAlertIds: new Set<string>(),
          });
          setMetrics(buildInitialMetrics());
          return;
        }
        case "set_journey_mode": {
          setState((s) => ({ ...s, journeyMode: action.mode }));
          return;
        }
        case "acknowledge_alert": {
          setState((s) => {
            const next = new Set(s.acknowledgedAlertIds);
            next.add(action.alertId);
            return { ...s, acknowledgedAlertIds: next };
          });
          return;
        }
        case "patient_set_accessibility": {
          setState((s) => ({
            ...s,
            patientJourney: {
              ...s.patientJourney,
              accessibility: { ...s.patientJourney.accessibility, ...action.accessibility },
            },
          }));
          if (action.accessibility.language) {
            appendTimeline(makeTimelineEvent("LANGUAGE_SELECTED", "patient", state.patient?.name ?? "Patient", { language: action.accessibility.language }));
          }
          return;
        }
        case "patient_advance_step": {
          const isEducation = action.step === "education";
          setState((s) => ({
            ...s,
            patientJourney: {
              ...s.patientJourney,
              currentStep: action.step,
              screensViewed: s.patientJourney.screensViewed + 1,
              educationStartedAt: isEducation ? new Date().toISOString() : s.patientJourney.educationStartedAt,
            },
          }));
          setMetrics((m) => ({
            ...m,
            patientScreensViewed: m.patientScreensViewed + 1,
            durationMs: Date.now() - m.startTime,
          }));
          if (isEducation) {
            appendTimeline(makeTimelineEvent("EDUCATION_PRESENTED", "patient", state.patient?.name ?? "Patient"));
          }
          return;
        }
        case "patient_update_education_progress": {
          setState((s) => ({
            ...s,
            patientJourney: { ...s.patientJourney, educationProgress: action.progress },
          }));
          return;
        }
        case "patient_complete_education": {
          const completedAt = new Date();
          setState((s) => ({
            ...s,
            patientJourney: {
              ...s.patientJourney,
              educationCompletedAt: completedAt.toISOString(),
              comprehensionScore: action.score,
              comprehensionPassed: action.passed,
            },
          }));
          setMetrics((m) => {
            const startedAt = state.patientJourney?.educationStartedAt;
            const educationTimeMs = startedAt ? completedAt.getTime() - new Date(startedAt).getTime() : m.educationTimeMs;
            return { ...m, educationTimeMs, durationMs: completedAt.getTime() - m.startTime };
          });
          appendTimeline(makeTimelineEvent("EDUCATION_COMPLETED", "patient", state.patient?.name ?? "Patient", { score: action.score, passed: action.passed }));
          return;
        }
        case "patient_submit_question": {
          setState((s) => ({
            ...s,
            patientJourney: {
              ...s.patientJourney,
              questions: [
                ...s.patientJourney.questions,
                { id: `q-${Date.now()}`, text: action.text, askedAt: new Date().toISOString() },
              ],
            },
          }));
          setMetrics((m) => ({ ...m, questionsAsked: m.questionsAsked + 1 }));
          appendTimeline(makeTimelineEvent("QUESTION_SUBMITTED", "patient", state.patient?.name ?? "Patient"));
          return;
        }
        case "patient_record_decision": {
          setState((s) => ({
            ...s,
            patientJourney: { ...s.patientJourney, decision: action.decision },
          }));
          if (action.decision === "accepted") {
            appendTimeline(makeTimelineEvent("DECISION_ACCEPTED", "patient", state.patient?.name ?? "Patient"));
          } else if (action.decision === "refused") {
            appendTimeline(makeTimelineEvent("DECISION_REFUSED", "patient", state.patient?.name ?? "Patient"));
          }
          return;
        }
        case "patient_capture_signature": {
          setState((s) => ({
            ...s,
            patientJourney: {
              ...s.patientJourney,
              signatures: [...s.patientJourney.signatures, action.signature],
            },
          }));
          appendTimeline(makeTimelineEvent("SIGNATURE_CAPTURED", action.signature.role, action.signature.signerName, { role: action.signature.role }));
          return;
        }
        case "patient_verify_otp": {
          setState((s) => ({ ...s, patientJourney: { ...s.patientJourney, otpVerified: true } }));
          appendTimeline(makeTimelineEvent("OTP_VERIFIED", "patient", state.patient?.name ?? "Patient"));
          return;
        }
        case "patient_complete_journey": {
          const endTime = Date.now();
          setState((s) => ({
            ...s,
            patientJourney: { ...s.patientJourney, completedAt: new Date().toISOString(), currentStep: s.patientJourney.decision === "refused" ? "refusal_confirmation" : "confirmation" },
          }));
          appendTimeline(makeTimelineEvent("PDF_FINALIZED", "system", "WathiqCare"));
          appendTimeline(makeTimelineEvent("ARCHIVED_TO_CLINICAL_RECORD", "system", "WathiqCare"));
          setMetrics((m) => ({ ...m, endToEndDurationMs: endTime - m.startTime }));
          return;
        }
        case "physician_review_completion": {
          setState((s) => ({ ...s, journeyMode: "timeline" }));
          appendTimeline(makeTimelineEvent("PHYSICIAN_COMPLETION_REVIEWED", "physician", state.patient?.name ?? "Physician"));
          return;
        }
      }
    },
    [state, trackClick, trackDecision, trackPatientInteraction, appendTimeline],
  );

  const readiness = useMemo(() => {
    const patientReady = !!state.patient;
    const encounterReady = !!state.encounter;
    const procedureReady = !!state.procedure;
    const assemblyReady = state.assembly?.status === "ready";
    const blockers = state.assembly?.blockers ?? [];
    const blockersResolved = !blockers.some((b) => b.severity === "blocking");
    const unacknowledgedAlerts = state.alerts.filter((a) => !state.acknowledgedAlertIds.has(a.id));
    const alertsResolved = unacknowledgedAlerts.length === 0;
    const draftReady = patientReady && encounterReady && procedureReady && assemblyReady && blockersResolved && alertsResolved;
    const sendReady = draftReady && state.draftApproved;
    const completedChecks = [patientReady, encounterReady, procedureReady, assemblyReady && blockersResolved && alertsResolved, state.draftApproved].filter(Boolean).length;
    const totalChecks = 5;
    return {
      patientReady,
      encounterReady,
      procedureReady,
      assemblyReady,
      blockersResolved,
      alertsResolved,
      draftReady,
      sendReady,
      completedChecks,
      totalChecks,
      progressPercentage: Math.round((completedChecks / totalChecks) * 100),
      blockers,
      unacknowledgedAlerts,
    };
  }, [state]);

  return { state, metrics, dispatch, readiness };
}
