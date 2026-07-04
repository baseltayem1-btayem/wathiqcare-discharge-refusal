"use client";

import { useState } from "react";
import { Stethoscope, Search } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Stack } from "@/components/design-system";
import type { PhysicianContext } from "./types";
import { useProductionWorkspace } from "./hooks/useProductionWorkspace";
import { PatientEncounterSelector } from "./components/PatientEncounterSelector";
import { SendRecipientCard } from "./components/SendRecipientCard";
import { SendConfirmationModal } from "./components/SendConfirmationModal";
import { CanvaWorkspaceShell } from "./components/canva/CanvaWorkspaceShell";
import { CanvaTopBar } from "./components/canva/CanvaTopBar";
import { CanvaWorkspacePage } from "./components/canva/CanvaWorkspacePage";
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
import "./workspace.css";

interface ProductionPhysicianWorkspaceProps {
  physician: PhysicianContext;
}

export function ProductionPhysicianWorkspace({ physician }: ProductionPhysicianWorkspaceProps) {
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
    approveDraft,
    send,
    sendDryRun,
  } = useProductionWorkspace(physician);

  const [activePage, setActivePage] = useState<WorkspacePageId>("workspace");
  const [sendModalOpen, setSendModalOpen] = useState(false);

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

  const renderWorkspaceContent = () => (
    <div className="space-y-3">
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

      <SendRecipientCard
        mobile={state.recipientMobile}
        email={state.recipientEmail}
        allowlisted={state.sendEligibility?.allowlisted}
        pilotEnabled={state.sendEligibility?.pilotEnabled}
        reason={state.sendEligibility?.reason}
        onMobileChange={setRecipientMobile}
        onEmailChange={setRecipientEmail}
        disabled={sendLoading}
      />

      {/* Procedure resolver */}
      <Card className="overflow-hidden" id="section-procedure">
        <CardHeader className="workspace-card-header">
          <Stack direction="row" align="center" gap={2}>
            <Stethoscope className="w-5 h-5 text-[var(--wc-blue)]" />
            <CardTitle className="workspace-section-title">Procedure</CardTitle>
          </Stack>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={state.selectedProcedureId || ""}
                onChange={(e) => selectProcedure(e.target.value)}
                disabled={!state.encounter || proceduresLoading || assemblyLoading}
                className="flex-1 h-10 rounded-md border border-[var(--wc-border)] bg-[var(--wc-surface)] px-3 text-sm text-[var(--wc-text)] focus:outline-none focus:ring-2 focus:ring-[var(--wc-blue)] disabled:opacity-50"
              >
                <option value="">
                  {proceduresLoading ? "Loading procedures…" : "Select a procedure"}
                </option>
                {filteredProcedures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titleEn} {p.titleAr ? ` / ${p.titleAr}` : ""} — {p.specialty}
                  </option>
                ))}
              </select>
              <Button
                variant="brand"
                size="sm"
                uppercase={false}
                onClick={() => void resolveAssembly()}
                disabled={!state.encounter || !state.selectedProcedureId || assemblyLoading}
              >
                {assemblyLoading ? "Resolving…" : "Load package"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={state.procedureQuery}
                onChange={(e) => setProcedureQuery(e.target.value)}
                placeholder="Or search procedure / specialty / Arabic name"
                startIcon={<Search className="w-4 h-4" />}
                disabled={!state.encounter || assemblyLoading}
                className="flex-1"
              />
            </div>
            {state.selectedProcedureTitle && !state.assembly && (
              <div className="text-sm text-[var(--wc-text-muted)]">
                Selected: <span className="font-medium text-[var(--wc-text)]">{state.selectedProcedureTitle}</span>. Click <strong>Load package</strong> to assemble the consent form.
              </div>
            )}
            {procedureSearchMessage && (
              <div className="text-sm text-[var(--wc-text-muted)]">{procedureSearchMessage}</div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--wc-text)] cursor-pointer">
            <Checkbox
              checked={state.reviewMode}
              onChange={(e) => setReviewMode(e.target.checked)}
            />
            Internal review mode — show draft illustrations
            <span className="text-xs text-[var(--wc-text-muted)]">(physician/clinical reviewer only)</span>
          </label>
          {assemblyError && <div className="text-sm text-[var(--wc-danger)]">{assemblyError}</div>}
          {!state.assembly && !assemblyLoading && !assemblyError && (
            <div className="text-sm text-[var(--wc-text-muted)]">
              Select an encounter, then choose a procedure and click Load package to assemble the consent form.
            </div>
          )}
        </CardContent>
      </Card>

      <CanvaWorkspacePage
        patient={state.patient}
        encounter={state.encounter}
        assembly={state.assembly}
        readiness={readiness}
        state={state}
        timeline={state.timeline}
        sendLoading={sendLoading}
        onSend={handleSend}
        onApproveDraft={handleApprove}
        onMarkPreviewReviewed={() => setPreviewReviewed(true)}
      />

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
        allowRealSend={readiness.sendReady}
        onConfirm={handleConfirmSend}
        onDryRun={handleDryRunSend}
        onCancel={() => setSendModalOpen(false)}
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
    <CanvaWorkspaceShell
      activePage={activePage}
      onPageChange={setActivePage}
      physician={physician}
      topBar={
        <CanvaTopBar
          patient={state.patient}
          encounter={state.encounter}
          selectedProcedureTitle={state.selectedProcedureTitle}
          assembly={state.assembly}
        />
      }
    >
      {renderPage()}
    </CanvaWorkspaceShell>
  );
}
