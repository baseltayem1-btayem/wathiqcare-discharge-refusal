"use client";

import { isAssemblyApprovedPdfSourceVerified, resolveAssemblyApprovedPdfUrl } from "./utils/approvedPdfSource";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/design-system";
import { useI18n } from "@/i18n/I18nProvider";
import type { PhysicianContext } from "./types";
import { useProductionWorkspace } from "./hooks/useProductionWorkspace";
import { createDoctorCompletedDraftPdfPreview } from "./lib/api";
import { PatientEncounterSelector } from "./components/PatientEncounterSelector";
import { ConsentPreviewModal } from "./components/ConsentPreviewModal";
import { SendConfirmationModal } from "./components/SendConfirmationModal";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { WorkspaceSectionLabel } from "./components/WorkspaceAtoms";
import {
  PatientsPage,
  EncountersPage,
  ProceduresPage,
  KnowledgePage,
  TemplatesPage,
  AnalyticsPage,
  AuditPage,
  SettingsPage,
} from "./components/canva/pages";
import type { WorkspacePageId } from "./components/canva/CanvaWorkspaceNav";
import { AuditEvidenceTimeline } from "./components/enterprise/AuditEvidenceTimeline";
import { ApprovedPdfViewer } from "./components/enterprise/ApprovedPdfViewer";
import { ComplianceReadinessPanel } from "./components/enterprise/ComplianceReadinessPanel";
import { DoctorCompletionPanel } from "./components/enterprise/DoctorCompletionPanel";
import { EnterpriseSidebar } from "./components/enterprise/EnterpriseSidebar";
import { PatientContextRibbon } from "./components/enterprise/PatientContextRibbon";
import { PhysicianWorkspaceHeader } from "./components/enterprise/PhysicianWorkspaceHeader";
import { ProcedureSelectionPanel } from "./components/enterprise/ProcedureSelectionPanel";
import { ReadinessChecklist } from "./components/enterprise/ReadinessChecklist";
import { SendToPatientPanel } from "./components/enterprise/SendToPatientPanel";

import "./workspace.css";

interface ProductionPhysicianWorkspaceProps {
  physician: PhysicianContext;
}

export function ProductionPhysicianWorkspace({ physician }: ProductionPhysicianWorkspaceProps) {
  const { lang } = useI18n();
  const {
    state,
    patients,
    patientsLoading,
    patientsError,
    encounters,
    encountersLoading,
    encountersError,
    readiness,
    assemblyLoading,
    assemblyError,
    proceduresLoading,
    filteredProcedures,
    procedureSearchMessage,
    sendLoading,
    searchForPatients,
    selectPatient,
    selectEncounter,
    setProcedureQuery,
    selectProcedure,
    resolveAssembly,
    setReviewMode,
    setRecipientMobile,
    setRecipientEmail,
    setPreviewReviewed,
    setDoctorCompletionValue,
    setPhysicianSignatureDataUrl,
    approveDraft,
    send,
    sendDryRun,
  } = useProductionWorkspace(physician);

  const [activePage, setActivePage] = useState<WorkspacePageId>("workspace");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [draftPdfUrl, setDraftPdfUrl] = useState<string>();
  const [draftPdfLoading, setDraftPdfLoading] = useState(false);
  const [draftPdfError, setDraftPdfError] = useState<string>();

  function handleApprove() {
    approveDraft();
  }

  function handleSend() {
    setSendModalOpen(true);
  }

  async function handleConfirmSend() {
    await send();
    setSendModalOpen(false);
  }

  async function handleDryRunSend() {
    await sendDryRun();
    setSendModalOpen(false);
  }

  const hasApprovedPdfSource = isAssemblyApprovedPdfSourceVerified(state.assembly);


  useEffect(() => {
    const formId = state.fieldMappingReadiness?.formId || state.assembly?.consentForm?.id || "";
    const approvedPdfUrl = resolveAssemblyApprovedPdfUrl(state.assembly);
    const values = state.doctorCompletionValues || {};
    const hasDoctorValues = Object.values(values).some((value) => String(value || "").trim().length > 0);
    const hasPhysicianSignature = Boolean(state.physicianSignatureDataUrl.trim());

    if (!formId || !approvedPdfUrl || (!hasDoctorValues && !hasPhysicianSignature)) {
      const resetTimer = window.setTimeout(() => {
        setDraftPdfLoading(false);
        setDraftPdfError(undefined);
        setDraftPdfUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return undefined;
        });
      }, 0);
      return () => {
        window.clearTimeout(resetTimer);
      };
    }

    const controller = new AbortController();
    let disposed = false;
    const timer = window.setTimeout(() => {
      setDraftPdfLoading(true);
      setDraftPdfError(undefined);

      createDoctorCompletedDraftPdfPreview(
        {
          formId,
          approvedPdfUrl,
          doctorCompletionValues: values,
          physicianSignatureDataUrl: state.physicianSignatureDataUrl,
        },
        controller.signal,
      )
        .then((url) => {
          if (disposed || controller.signal.aborted) {
            URL.revokeObjectURL(url);
            return;
          }
          setDraftPdfUrl((previous) => {
            if (previous) URL.revokeObjectURL(previous);
            return url;
          });
        })
        .catch((error) => {
          if (disposed || controller.signal.aborted) return;
          setDraftPdfError(
            error instanceof Error
              ? error.message
              : "Doctor-completed draft PDF preview could not be generated.",
          );
        })
        .finally(() => {
          if (!disposed && !controller.signal.aborted) {
            setDraftPdfLoading(false);
          }
        });
    }, 650);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    state.assembly,
    state.fieldMappingReadiness?.formId,
    state.doctorCompletionValues,
    state.physicianSignatureDataUrl,
  ]);

  const sendReason = (() => {
    if (sendLoading) return "Sending…";
    if (!readiness.patientReady) return "Select a patient first";
    if (!readiness.encounterReady) return "Select an encounter first";
    if (!readiness.procedureSelected) return "Select a procedure first";
    if (!readiness.assemblyReady) return "Load the package first";
    if (!hasApprovedPdfSource) return "Approved PDF source is required";
    if (!readiness.fieldMappingReadiness) return "Consent field mapping is loading";
    if (!readiness.patientSignatureMapped) return "Patient signature field is not mapped";
    if (!readiness.doctorCompletionReady) return "Complete required physician fields";
    if (!readiness.anesthesiaMappingReady) return "Complete anesthesia review when applicable";
    if (!readiness.fieldMappingVerified) return "Consent field mapping must be verified";
    if (!readiness.educationReady) return "Education material missing";
    if (!readiness.previewReviewed) return "Mark Preview Reviewed first";
    if (!readiness.contactAvailable) return "Enter patient contact";
    if (!readiness.allowlisted) return "Recipient is not allowlisted";
    if (!readiness.draftApproved) return "Approve the draft first";
    if (!readiness.blockersResolved) return "Resolve blockers first";
    return undefined;
  })();

  const renderWorkspaceContent = () => (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <WorkflowStepper currentStep={state.step} readiness={readiness} lang={lang} />

      <PatientEncounterSelector
        selectedPatient={state.patient}
        selectedEncounter={state.encounter}
        onSelectPatient={selectPatient}
        onSelectEncounter={selectEncounter}
        patients={patients}
        encounters={encounters}
        patientsLoading={patientsLoading}
        encountersLoading={encountersLoading}
        error={patientsError || encountersError}
        onSearchQueryChange={(q) => {
          setProcedureQuery("");
          void searchForPatients(q);
        }}
      />

      <PatientContextRibbon patient={state.patient} encounter={state.encounter} />

      <div>
        <WorkspaceSectionLabel>{lang === "ar" ? "إعداد الموافقة" : "Consent setup"}</WorkspaceSectionLabel>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <ProcedureSelectionPanel
              encounter={state.encounter}
              selectedProcedureId={state.selectedProcedureId}
              selectedProcedureTitle={state.selectedProcedureTitle}
              selectedProcedure={state.selectedProcedure}
              procedureQuery={state.procedureQuery}
              procedures={filteredProcedures}
              proceduresLoading={proceduresLoading}
              procedureSearchMessage={procedureSearchMessage}
              reviewMode={state.reviewMode}
              assemblyLoading={assemblyLoading}
              assemblyLoaded={Boolean(state.assembly)}
              assemblyError={assemblyError}
              onProcedureQueryChange={setProcedureQuery}
              onSelectProcedure={selectProcedure}
              onResolveAssembly={() => void resolveAssembly()}
              onReviewModeChange={setReviewMode}
            />
            <DoctorCompletionPanel
              mapping={state.fieldMappingReadiness}
              values={state.doctorCompletionValues}
              physicianSignatureDataUrl={state.physicianSignatureDataUrl}
              onValueChange={setDoctorCompletionValue}
              onPhysicianSignatureChange={setPhysicianSignatureDataUrl}
              disabled={sendLoading}
            />
            <ReadinessChecklist readiness={readiness} />
          </div>

          <ApprovedPdfViewer
            assembly={state.assembly}
            loading={assemblyLoading}
            reviewed={state.previewReviewed}
                        draftPdfUrl={draftPdfUrl}
            draftPdfLoading={draftPdfLoading}
            draftPdfError={draftPdfError}
            onOpenPreview={() => setPreviewOpen(true)}
            onMarkReviewed={() => setPreviewReviewed(true)}
          />

          <div className="space-y-6">
            <ComplianceReadinessPanel assembly={state.assembly} readiness={readiness} reviewMode={state.reviewMode} />
            <SendToPatientPanel
              mobile={state.recipientMobile}
              email={state.recipientEmail}
              allowlisted={state.sendEligibility?.allowlisted}
              pilotEnabled={state.sendEligibility?.pilotEnabled}
              reason={state.sendEligibility?.reason}
              previewReviewed={state.previewReviewed}
              draftApproved={state.draftApproved}
              sendDisabled={!readiness.sendReady || sendLoading || !hasApprovedPdfSource}
              sendReason={sendReason}
              sendLoading={sendLoading}
              signingResult={state.signingResult}
              onMobileChange={setRecipientMobile}
              onEmailChange={setRecipientEmail}
              onApproveDraft={handleApprove}
              onSend={handleSend}
            />
          </div>
        </div>
      </div>

      <div>
        <WorkspaceSectionLabel>{lang === "ar" ? "التدقيق والأدلة" : "Audit & evidence"}</WorkspaceSectionLabel>
        <AuditEvidenceTimeline timeline={state.timeline} signingResult={state.signingResult} />
      </div>

      {state.dryRunSuccess && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-emerald-800">Dry-run successful</p>
            <p className="text-xs text-emerald-700">
              {state.dryRunMessage || "Send validation passed. No consent was sent to the patient."}
            </p>
          </CardContent>
        </Card>
      )}

      <SendConfirmationModal
        open={sendModalOpen}
        patient={state.patient}
        encounter={state.encounter}
        procedure={
          state.assembly
            ? {
                nameEn: state.assembly.procedureNameEn,
              }
            : undefined
        }
        assembly={state.assembly}
        recipientMobile={state.recipientMobile}
        recipientEmail={state.recipientEmail}
        allowlisted={state.sendEligibility?.allowlisted}
        pilotEnabled={state.sendEligibility?.pilotEnabled}
        eligibilityReason={state.sendEligibility?.reason}
        allowRealSend={readiness.sendReady && hasApprovedPdfSource}
        onConfirm={handleConfirmSend}
        onDryRun={handleDryRunSend}
        onCancel={() => setSendModalOpen(false)}
      />

      <ConsentPreviewModal
        open={previewOpen}
        assembly={state.assembly}
        reviewMode={state.reviewMode}
        reviewed={state.previewReviewed}
        onMarkReviewed={() => setPreviewReviewed(true)}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );

  const renderPage = () => {
    switch (activePage) {
      case "workspace":
        return renderWorkspaceContent();
      case "patients":
        return <PatientsPage patients={patients} />;
      case "encounters":
        return <EncountersPage encounters={encounters} />;
      case "procedures":
        return <ProceduresPage />;
      case "knowledge":
        return <KnowledgePage />;
      case "templates":
        return <TemplatesPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "audit":
        return <AuditPage timeline={state.timeline} />;
      case "settings":
        return <SettingsPage physician={physician} />;
      default:
        return renderWorkspaceContent();
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50" dir={lang === "ar" ? "rtl" : "ltr"}>
      <EnterpriseSidebar activePage={activePage} onPageChange={setActivePage} physician={physician} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PhysicianWorkspaceHeader
          patient={state.patient}
          encounter={state.encounter}
          selectedProcedureTitle={state.selectedProcedureTitle}
          assembly={state.assembly}
        />
        <main className="flex-1 px-5 py-6 lg:px-8">{renderPage()}</main>
      </div>
    </div>
  );
}
