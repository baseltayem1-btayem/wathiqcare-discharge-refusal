"use client";

import { useState } from "react";
import { Stethoscope, Search } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Stack } from "@/components/design-system";
import type { PhysicianContext } from "./types";
import { useProductionWorkspace } from "./hooks/useProductionWorkspace";
import { PatientEncounterSelector } from "./components/PatientEncounterSelector";
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
    sendLoading,
    searchForPatients,
    selectPatient,
    selectEncounter,
    resolveAssembly,
    approveDraft,
    send,
    sendDryRun,
  } = useProductionWorkspace(physician);

  const [activePage, setActivePage] = useState<WorkspacePageId>("workspace");
  const [procedureQuery, setProcedureQuery] = useState("");
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

      {/* Procedure resolver */}
      <Card className="overflow-hidden" id="section-procedure">
        <CardHeader className="workspace-card-header">
          <Stack direction="row" align="center" gap={2}>
            <Stethoscope className="w-5 h-5 text-[var(--wc-blue)]" />
            <CardTitle className="workspace-section-title">Procedure</CardTitle>
          </Stack>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              value={procedureQuery}
              onChange={(e) => setProcedureQuery(e.target.value)}
              placeholder="Search procedure or specialty"
              startIcon={<Search className="w-4 h-4" />}
              disabled={!state.encounter || assemblyLoading}
              className="flex-1"
            />
            <Button
              variant="brand"
              size="sm"
              uppercase={false}
              onClick={() => void resolveAssembly(procedureQuery)}
              disabled={!state.encounter || !procedureQuery.trim() || assemblyLoading}
            >
              {assemblyLoading ? "Resolving…" : "Resolve"}
            </Button>
          </div>
          {assemblyError && <div className="text-sm text-[var(--wc-danger)]">{assemblyError}</div>}
          {!state.assembly && !assemblyLoading && !assemblyError && (
            <div className="text-sm text-[var(--wc-text-muted)]">
              Select an encounter, then type a procedure name and click Resolve to load the Clinical Knowledge Package.
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
          assembly={state.assembly}
        />
      }
    >
      {renderPage()}
    </CanvaWorkspaceShell>
  );
}
