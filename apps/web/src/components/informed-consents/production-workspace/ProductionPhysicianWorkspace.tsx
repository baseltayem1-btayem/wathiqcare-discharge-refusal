"use client";

import { isAssemblyApprovedPdfSourceVerified } from "./utils/approvedPdfSource";
import { useState } from "react";
import { Button, Card, CardContent } from "@/components/design-system";
import { useI18n } from "@/i18n/I18nProvider";
import type { PhysicianContext } from "./types";
import { useProductionWorkspace } from "./hooks/useProductionWorkspace";
import { computeSupportsFilledDraftPreview } from "./utils/filledDraftPreviewCapability";
import { computeFilledPreviewBlocker } from "./utils/filledPreviewBlocker";
import { PatientEncounterSelector } from "./components/PatientEncounterSelector";
import { ConsentPreviewModal } from "./components/ConsentPreviewModal";
import { SendConfirmationModal } from "./components/SendConfirmationModal";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { WorkspaceCard, WorkspaceCardHeader, WorkspaceSectionLabel } from "./components/WorkspaceAtoms";
import { FileText, Loader2, RefreshCw } from "lucide-react";
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
    generateFilledDraftPreview,
    setFilledDraftReviewed,
    setPdfViewerMode,
    send,
    sendDryRun,
  } = useProductionWorkspace(physician);

  const [activePage, setActivePage] = useState<WorkspacePageId>("workspace");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  function handleApprove() {
    if (!effectivePreviewReviewed) return;
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
  const isAcroFormBacked = Boolean(state.fieldMappingReadiness?.acroForm);

  // Governed capability for the AcroForm filled-draft preview card.
  // Derived from the same canonical prerequisites required by generateFilledDraftPreview:
  // a verified approved PDF source, a verified field mapping, and a verified READY manifest hash.
  const supportsFilledDraftPreview = computeSupportsFilledDraftPreview({
    fieldMappingReadiness: state.fieldMappingReadiness,
    hasApprovedPdfSource,
    fieldMappingVerified: readiness.fieldMappingVerified,
  });

  const canGenerateFilledPreview =
    supportsFilledDraftPreview &&
    readiness.patientReady &&
    readiness.encounterReady &&
    readiness.assemblyReady &&
    readiness.doctorCompletionReady &&
    readiness.anesthesiaMappingReady &&
    readiness.patientSignatureMapped &&
    state.filledDraftStatus !== "loading";

  const filledPreviewBlocker = computeFilledPreviewBlocker({
    supportsFilledDraftPreview,
    hasApprovedPdfSource,
    fieldMappingVerified: readiness.fieldMappingVerified,
    patientReady: readiness.patientReady,
    patientDob: state.patient?.dateOfBirth,
    encounterReady: readiness.encounterReady,
    assemblyReady: readiness.assemblyReady,
    doctorCompletionReady: readiness.doctorCompletionReady,
    anesthesiaMappingReady: readiness.anesthesiaMappingReady,
    patientSignatureMapped: readiness.patientSignatureMapped,
    filledDraftStatus: state.filledDraftStatus,
    fieldMappingReadiness: state.fieldMappingReadiness,
  });

  const effectivePreviewReviewed = supportsFilledDraftPreview ? state.filledDraftReviewed : state.previewReviewed;

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
    if (readiness.aggregate.blocked) {
      const firstBlocked = readiness.aggregate.items.find((i) => i.status === "BLOCKED" || i.status === "REQUIRED");
      if (firstBlocked) return firstBlocked.detail || firstBlocked.labelEn;
    }
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
              filledPreviewBlocker={filledPreviewBlocker}
            />

            {supportsFilledDraftPreview ? (
              <WorkspaceCard className="overflow-hidden">
                <WorkspaceCardHeader
                  icon={<FileText className="size-5" />}
                  title={lang === "ar" ? "المعاينة المعبأة" : "Filled draft preview"}
                  description={
                    lang === "ar"
                      ? "أنشئ معاينة النموذج المعبأة من المصدر المعتمد والقيم المدخلة."
                      : "Generate the filled draft preview from the approved source and entered values."
                  }
                />
                <div className="space-y-4 px-5 py-5">
                  {state.filledDraftError ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                      {state.filledDraftError}
                    </div>
                  ) : null}
                  {filledPreviewBlocker ? (
                    <div
                      id="filled-preview-blocker"
                      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800"
                      role="status"
                      aria-live="polite"
                      data-filled-preview-blocker="true"
                    >
                      {filledPreviewBlocker}
                    </div>
                  ) : null}
                  <Button
                    className="h-11 w-full rounded-2xl"
                    disabled={!canGenerateFilledPreview}
                    onClick={() => void generateFilledDraftPreview()}
                    aria-describedby={filledPreviewBlocker ? "filled-preview-blocker" : undefined}
                  >
                    {state.filledDraftStatus === "loading" ? (
                      <Loader2 className="mr-1 size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 size-4" />
                    )}
                    {state.filledDraftStatus === "loading"
                      ? lang === "ar"
                        ? "جاري الإنشاء…"
                        : "Generating…"
                      : lang === "ar"
                        ? "إنشاء المعاينة المعبأة"
                        : "Generate Filled Preview"}
                  </Button>
                </div>
              </WorkspaceCard>
            ) : null}

            <ReadinessChecklist readiness={readiness} />
          </div>

          <ApprovedPdfViewer
            key={state.assembly?.consentForm?.id ?? "no-assembly"}
            assembly={state.assembly}
            loading={assemblyLoading}
            reviewed={state.previewReviewed}
            draftPdfUrl={state.filledDraftPdfUrl}
            draftPdfLoading={state.filledDraftStatus === "loading"}
            draftPdfError={state.filledDraftError}
            isAcroFormBacked={isAcroFormBacked}
            filledDraftStatus={state.filledDraftStatus}
            filledDraftReviewed={state.filledDraftReviewed}
            viewerMode={state.pdfViewerMode}
            onViewerModeChange={setPdfViewerMode}
            onGenerateFilledDraft={() => void generateFilledDraftPreview()}
            onMarkFilledDraftReviewed={() => setFilledDraftReviewed(true)}
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
              previewReviewed={effectivePreviewReviewed}
              draftApproved={state.draftApproved}
              sendDisabled={!readiness.sendReady || sendLoading || !hasApprovedPdfSource}
              sendReason={sendReason}
              sendLoading={sendLoading}
              signingResult={state.signingResult}
              supportsFilledDraftPreview={supportsFilledDraftPreview}
              filledDraftStatus={state.filledDraftStatus}
              draftPdfUrl={state.filledDraftPdfUrl}
              onMobileChange={setRecipientMobile}
              onEmailChange={setRecipientEmail}
              onApproveDraft={handleApprove}
              onMarkFilledDraftReviewed={() => setFilledDraftReviewed(true)}
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
