"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClinicalWorkspaceShell } from "./components/ClinicalWorkspaceShell";
import { ContextBar } from "./components/ContextBar";
import { ActionRail } from "./components/ActionRail";
import { PatientEncounterSelector } from "./components/PatientEncounterSelector";
import { ProcedureSelector } from "./components/ProcedureSelector";
import { ClinicalKnowledgePackageCard } from "./components/ClinicalKnowledgePackageCard";
import { DraftPreviewPanel } from "./components/DraftPreviewPanel";
import { ReadinessSidebar } from "./components/ReadinessSidebar";
import { SendConfirmationModal } from "./components/SendConfirmationModal";
import { TaskMetricsPanel } from "./components/TaskMetricsPanel";
import { ClinicalTimelinePanel } from "./components/timeline/ClinicalTimelinePanel";
import { AuditEvidenceExport } from "./components/timeline/AuditEvidenceExport";
import { PatientLandingPanel } from "./components/patient/PatientLandingPanel";
import { PatientEducationWorkspace } from "./components/patient/PatientEducationWorkspace";
import { PatientQuestionsPanel } from "./components/patient/PatientQuestionsPanel";
import { PatientDecisionPanel } from "./components/patient/PatientDecisionPanel";
import { PatientSignaturePanel } from "./components/patient/PatientSignaturePanel";
import { PatientConfirmationPanel } from "./components/patient/PatientConfirmationPanel";
import { RefusalBranchPanel } from "./components/patient/RefusalBranchPanel";
import { GuardianFlowPanel } from "./components/patient/GuardianFlowPanel";
import { InterpreterFlowPanel } from "./components/patient/InterpreterFlowPanel";
import { useWorkspaceState } from "./hooks/useWorkspaceState";
import { useComparisonMetrics } from "./hooks/useTaskMetrics";
import { buildPatientJourneyContext } from "./lib/patient-journey-data";
import type { SignatureRecord, PatientJourneyStep, SignatureRole } from "./types/workspace";

export default function ClinicalWorkspace2Page() {
  const router = useRouter();
  const workspace = useWorkspaceState();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [notes, setNotes] = useState(workspace.state.physicianNotes);
  const metrics = useComparisonMetrics(workspace.metrics);

  const { state, dispatch, readiness } = workspace;
  const { current, baseline, deltas, percentReductions } = metrics;

  // Pilot remediation: this prototype surface must not be reachable by
  // end users. Redirect to the canonical physician workspace in production.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      router.replace("/modules/informed-consents");
    }
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") as "physician" | "patient" | "timeline" | null;
    if (mode === "patient" && state.patient && state.procedure) {
      dispatch({ type: "set_journey_mode", mode: "patientPreview" });
      dispatch({ type: "patient_advance_step", step: "landing" });
    } else if (mode === "timeline") {
      dispatch({ type: "set_journey_mode", mode: "timeline" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const handleJump = (target: string) => {
    const el = document.getElementById(`section-${target}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const anesthesiaDecision =
    state.anesthesiaOverride ?? (state.procedure?.anesthesiaRequired ? "GENERAL" : "NONE");

  const patientContext =
    state.patient && state.encounter && state.procedure && state.assembly
      ? buildPatientJourneyContext(state.patient, state.encounter, state.procedure, state.assembly)
      : undefined;

  const advancePatientStep = (step: PatientJourneyStep) => {
    dispatch({ type: "patient_advance_step", step });
  };

  const handleDecision = (decision: "accepted" | "refused") => {
    dispatch({ type: "patient_record_decision", decision });
    if (decision === "refused") {
      advancePatientStep("refusal_acknowledgment");
      return;
    }
    const next = nextSignatureStep(state.assembly?.requiredParticipants ?? [], state.patientJourney.signatures);
    advancePatientStep(next);
  };

  const handleSignature = (signature: SignatureRecord) => {
    dispatch({ type: "patient_capture_signature", signature });
    if (signature.role === "patient") {
      dispatch({ type: "patient_complete_journey" });
      advancePatientStep("confirmation");
      return;
    }
    const next = nextSignatureStep(state.assembly?.requiredParticipants ?? [], [
      ...state.patientJourney.signatures,
      signature,
    ]);
    if (next === "signature") {
      advancePatientStep("signature");
    } else {
      advancePatientStep(next);
    }
  };

  const handleRefusalSignature = (signature: SignatureRecord) => {
    dispatch({ type: "patient_capture_signature", signature });
    dispatch({ type: "patient_complete_journey" });
    advancePatientStep("refusal_confirmation");
  };

  const renderPatientStep = () => {
    if (!patientContext) return null;
    const { patientJourney } = state;

    switch (patientJourney.currentStep) {
      case "landing":
        return (
          <PatientLandingPanel
            context={patientContext}
            journey={patientJourney}
            onContinue={() => advancePatientStep("education")}
            onAccessibilityChange={(a) => dispatch({ type: "patient_set_accessibility", accessibility: a })}
          />
        );
      case "education":
        return (
          <PatientEducationWorkspace
            context={patientContext}
            journey={patientJourney}
            onComplete={(score, passed) => {
              dispatch({ type: "patient_complete_education", score, passed });
              advancePatientStep("questions");
            }}
            onProgress={(p) => dispatch({ type: "patient_update_education_progress", progress: p })}
            onAccessibilityChange={(a) => dispatch({ type: "patient_set_accessibility", accessibility: a })}
          />
        );
      case "questions":
        return (
          <PatientQuestionsPanel
            journey={patientJourney}
            onSubmitQuestion={(text) => dispatch({ type: "patient_submit_question", text })}
            onContinue={() => advancePatientStep("decision")}
            onAccessibilityChange={(a) => dispatch({ type: "patient_set_accessibility", accessibility: a })}
          />
        );
      case "decision":
        return (
          <PatientDecisionPanel
            context={patientContext}
            journey={patientJourney}
            onDecide={handleDecision}
            onAccessibilityChange={(a) => dispatch({ type: "patient_set_accessibility", accessibility: a })}
          />
        );
      case "refusal_acknowledgment":
        return (
          <RefusalBranchPanel
            context={patientContext}
            journey={patientJourney}
            onAcknowledge={() => advancePatientStep("refusal_signature")}
            onSign={handleRefusalSignature}
            onAccessibilityChange={(a) => dispatch({ type: "patient_set_accessibility", accessibility: a })}
          />
        );
      case "refusal_signature":
        return (
          <RefusalBranchPanel
            context={patientContext}
            journey={patientJourney}
            onAcknowledge={() => {}}
            onSign={handleRefusalSignature}
            onAccessibilityChange={(a) => dispatch({ type: "patient_set_accessibility", accessibility: a })}
          />
        );
      case "refusal_confirmation":
        return <PatientConfirmationPanel context={patientContext} journey={patientJourney} />;
      case "signature":
        return (
          <PatientSignaturePanel
            context={patientContext}
            journey={patientJourney}
            onSign={handleSignature}
            onRequestOtp={() => {
              dispatch({ type: "patient_verify_otp" });
            }}
            onAccessibilityChange={(a) => dispatch({ type: "patient_set_accessibility", accessibility: a })}
          />
        );
      case "confirmation":
        return <PatientConfirmationPanel context={patientContext} journey={patientJourney} />;
      default:
        return null;
    }
  };

  const renderGuardianStep = () => {
    if (!patientContext) return null;
    return (
      <GuardianFlowPanel
        journey={state.patientJourney}
        onComplete={(signature) => {
          dispatch({ type: "patient_capture_signature", signature });
          const next = nextSignatureStep(state.assembly?.requiredParticipants ?? [], [
            ...state.patientJourney.signatures,
            signature,
          ]);
          advancePatientStep(next);
        }}
        onAccessibilityChange={(a) => dispatch({ type: "patient_set_accessibility", accessibility: a })}
      />
    );
  };

  const renderInterpreterStep = () => {
    if (!patientContext) return null;
    return (
      <InterpreterFlowPanel
        journey={state.patientJourney}
        onComplete={(signature) => {
          dispatch({ type: "patient_capture_signature", signature });
          const next = nextSignatureStep(state.assembly?.requiredParticipants ?? [], [
            ...state.patientJourney.signatures,
            signature,
          ]);
          advancePatientStep(next);
        }}
        onAccessibilityChange={(a) => dispatch({ type: "patient_set_accessibility", accessibility: a })}
      />
    );
  };

  const renderMainContent = () => {
    if (state.journeyMode === "timeline") {
      return (
        <div className="space-y-6">
          <ClinicalTimelinePanel events={state.timeline} lang={state.patientJourney.accessibility.language} />
          <AuditEvidenceExport events={state.timeline} metrics={metrics.current} journey={state.patientJourney} />
        </div>
      );
    }

    if (state.journeyMode === "patientPreview") {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Patient Journey Preview</h2>
            <button
              type="button"
              onClick={() => dispatch({ type: "set_journey_mode", mode: "physician" })}
              className="px-4 py-2 rounded-lg border border-[var(--wc-border)] text-sm font-semibold hover:bg-[var(--wc-surface-2)]"
            >
              Back to physician workspace
            </button>
          </div>
          {state.patientJourney.currentStep === "guardian"
            ? renderGuardianStep()
            : state.patientJourney.currentStep === "interpreter"
              ? renderInterpreterStep()
              : renderPatientStep()}
        </div>
      );
    }

    return (
      <>
        <div id="section-patient" className="scroll-mt-32">
          <PatientEncounterSelector
            selectedPatient={state.patient}
            selectedEncounter={state.encounter}
            onSelectPatient={(patient) => dispatch({ type: "select_patient", patient })}
            onSelectEncounter={(encounter) => dispatch({ type: "select_encounter", encounter })}
          />
        </div>

        <div id="section-procedure" className="scroll-mt-32">
          <ProcedureSelector
            selectedProcedure={state.procedure}
            encounter={state.encounter}
            onSelectProcedure={(procedure) => dispatch({ type: "select_procedure", procedure })}
          />
        </div>

        <div id="section-package" className="scroll-mt-32">
          <ClinicalKnowledgePackageCard
            assembly={state.assembly}
            procedure={state.procedure}
            anesthesiaOverride={state.anesthesiaOverride}
            educationIncluded={state.educationIncluded}
            alerts={state.alerts}
            acknowledgedAlertIds={state.acknowledgedAlertIds}
            onAnesthesiaChange={(decision) => dispatch({ type: "set_anesthesia", decision })}
            onEducationToggle={(included) => dispatch({ type: "toggle_education", included })}
            onAcknowledgeAlert={(alertId) => dispatch({ type: "acknowledge_alert", alertId })}
          />
        </div>

        <DraftPreviewPanel
          patient={state.patient}
          encounter={state.encounter}
          procedure={state.procedure}
          assembly={state.assembly}
          educationIncluded={state.educationIncluded}
          physicianNotes={notes}
          onNotesChange={(value) => setNotes(value)}
        />

        <SendConfirmationModal
          open={sendModalOpen}
          patient={state.patient}
          encounter={state.encounter}
          procedure={state.procedure}
          assembly={state.assembly}
          onConfirm={() => {
            setSendModalOpen(false);
            dispatch({ type: "send" });
          }}
          onCancel={() => setSendModalOpen(false)}
        />
      </>
    );
  };

  return (
    <ClinicalWorkspaceShell
      title="Informed Consent — Clinical Workspace 2.0"
      subtitle="Patient → Encounter → Procedure → Clinical Knowledge Package"
      eyebrow="Clinical Workspace 2.0"
      showPrototypeBanner
      contextBar={
        <ContextBar
          patient={state.patient}
          encounter={state.encounter}
          procedure={state.procedure}
          anesthesia={anesthesiaDecision}
        />
      }
      actionRail={
        <ActionRail
          sendReady={readiness.sendReady}
          draftReady={readiness.draftReady}
          draftApproved={state.draftApproved}
          sent={!!state.sentAt}
          mode={state.journeyMode}
          canPreviewPatient={!!patientContext}
          onApprove={() => dispatch({ type: "approve_draft" })}
          onSend={() => setSendModalOpen(true)}
          onReset={() => {
            dispatch({ type: "reset" });
            setNotes("");
          }}
          onPreviewPatient={() => dispatch({ type: "set_journey_mode", mode: "patientPreview" })}
          onViewTimeline={() => dispatch({ type: "set_journey_mode", mode: "timeline" })}
          onBackToPhysician={() => dispatch({ type: "set_journey_mode", mode: "physician" })}
        />
      }
      sidebar={
        <div className="space-y-6">
          {state.journeyMode === "physician" && (
            <ReadinessSidebar
              patientReady={readiness.patientReady}
              encounterReady={readiness.encounterReady}
              procedureReady={readiness.procedureReady}
              assemblyReady={readiness.assemblyReady}
              blockersResolved={readiness.blockersResolved}
              draftApproved={state.draftApproved}
              sendReady={readiness.sendReady}
              progressPercentage={readiness.progressPercentage}
              blockers={readiness.blockers}
              onJump={handleJump}
            />
          )}
          <TaskMetricsPanel
            current={current}
            baseline={baseline}
            deltas={deltas}
            percentReductions={percentReductions}
            sent={!!state.sentAt}
            patientMetrics={metrics.current}
            mode={state.journeyMode}
          />
          {state.journeyMode === "timeline" && (
            <AuditEvidenceExport events={state.timeline} metrics={metrics.current} journey={state.patientJourney} />
          )}
        </div>
      }
    >
      {renderMainContent()}
    </ClinicalWorkspaceShell>
  );
}

function nextSignatureStep(requiredParticipants: ("witness" | "interpreter" | "guardian")[], signatures: SignatureRecord[]): PatientJourneyStep {
  const hasRole = (role: SignatureRole) => signatures.some((s) => s.role === role);
  if (requiredParticipants.includes("guardian") && !hasRole("guardian")) return "guardian";
  if (requiredParticipants.includes("interpreter") && !hasRole("interpreter")) return "interpreter";
  return "signature";
}
