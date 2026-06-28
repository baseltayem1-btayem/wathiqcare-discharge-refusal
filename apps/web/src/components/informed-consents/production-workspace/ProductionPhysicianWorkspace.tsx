"use client";

import { useMemo, useState } from "react";
import { Stethoscope, Search, Send } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Stack,
} from "@/components/design-system";
import { ClinicalWorkspaceShell } from "@/app/prototype/clinical-workspace-2/components/ClinicalWorkspaceShell";
import { ContextBar } from "@/app/prototype/clinical-workspace-2/components/ContextBar";
import { ActionRail } from "@/app/prototype/clinical-workspace-2/components/ActionRail";
import { PatientEncounterSelector } from "@/app/prototype/clinical-workspace-2/components/PatientEncounterSelector";
import { ClinicalKnowledgePackageCard } from "@/app/prototype/clinical-workspace-2/components/ClinicalKnowledgePackageCard";
import { DraftPreviewPanel } from "@/app/prototype/clinical-workspace-2/components/DraftPreviewPanel";
import { ReadinessSidebar } from "@/app/prototype/clinical-workspace-2/components/ReadinessSidebar";
import { SendConfirmationModal } from "@/app/prototype/clinical-workspace-2/components/SendConfirmationModal";
import { ClinicalTimelinePanel } from "@/app/prototype/clinical-workspace-2/components/timeline/ClinicalTimelinePanel";
import type { PhysicianContext } from "./types";
import { useProductionWorkspace } from "./hooks/useProductionWorkspace";
import { mapAssemblyToMock } from "./lib/map-assembly";
import { toMockPatient, toMockEncounter, toMockProcedure, toMockTimelineEvents } from "./lib/map-context";

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
    searchForPatients,
    selectPatient,
    selectEncounter,
    resolveAssembly,
    setAnesthesia,
    setEducationIncluded,
    setPhysicianNotes,
    approveDraft,
    acknowledgeAlert,
    send,
    reset,
  } = useProductionWorkspace(physician);

  const [procedureQuery, setProcedureQuery] = useState("");
  const [sendModalOpen, setSendModalOpen] = useState(false);

  const mappedAssembly = mapAssemblyToMock(state.assembly);
  const mappedPatient = useMemo(
    () => (state.patient ? toMockPatient(state.patient) : undefined),
    [state.patient],
  );
  const mappedEncounter = useMemo(
    () => (state.encounter ? toMockEncounter(state.encounter) : undefined),
    [state.encounter],
  );
  const mappedProcedure = useMemo(() => toMockProcedure(state.assembly), [state.assembly]);
  const mappedPatients = useMemo(() => patients.map(toMockPatient), [patients]);
  const mappedEncounters = useMemo(() => encounters.map(toMockEncounter), [encounters]);
  const mappedTimeline = useMemo(() => toMockTimelineEvents(state.timeline), [state.timeline]);

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

  function handleJump(target: string) {
    const el = document.getElementById(`section-${target}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const renderMainContent = () => {
    if (state.step === "sent" && state.signingResult) {
      return (
        <div className="space-y-6">
          <Card className="p-5 border-[var(--wc-success)]/30 bg-[var(--wc-success-bg)]">
            <div className="flex items-start gap-3">
              <Send className="w-5 h-5 text-[var(--wc-success)] mt-0.5" />
              <div>
                <div className="font-semibold text-[var(--wc-text)]">Consent dispatched to patient.</div>
                <div className="text-sm text-[var(--wc-text-muted)] mt-1">
                  A secure signing link has been sent to the patient&apos;s mobile number.
                </div>
                {state.signingResult.signingUrl && (
                  <div className="mt-3 text-xs break-all text-[var(--wc-text-muted)]">
                    {state.signingResult.signingUrl}
                  </div>
                )}
              </div>
            </div>
          </Card>
          <ClinicalTimelinePanel events={mappedTimeline} lang="en" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <PatientEncounterSelector
          selectedPatient={mappedPatient}
          selectedEncounter={mappedEncounter}
          onSelectPatient={selectPatient}
          onSelectEncounter={selectEncounter}
          patients={mappedPatients}
          encounters={mappedEncounters}
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
              <CardTitle className="workspace-section-title">2. Procedure</CardTitle>
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

        {mappedAssembly && (
          <>
            <ClinicalKnowledgePackageCard
              assembly={mappedAssembly}
              procedure={mappedProcedure}
              anesthesiaOverride={state.anesthesiaOverride}
              educationIncluded={state.educationIncluded}
              alerts={[]} // Production alerts are embedded in assembly.blockers/suggestions
              acknowledgedAlertIds={state.acknowledgedAlerts}
              onAnesthesiaChange={setAnesthesia}
              onEducationToggle={setEducationIncluded}
              onAcknowledgeAlert={acknowledgeAlert}
            />
            <DraftPreviewPanel
              patient={mappedPatient}
              encounter={mappedEncounter}
              procedure={mappedProcedure}
              assembly={mappedAssembly}
              educationIncluded={state.educationIncluded}
              physicianNotes={state.physicianNotes}
              onNotesChange={setPhysicianNotes}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <ClinicalWorkspaceShell
        title="Informed Consent — Clinical Workspace"
        subtitle="Patient → Encounter → Procedure → Clinical Knowledge Package"
        eyebrow="Informed Consent"
        showPrototypeBanner={false}
        showPreviewBadge={false}
        contextBar={
          <ContextBar
            patient={mappedPatient}
            encounter={mappedEncounter}
            procedure={mappedProcedure}
            anesthesia={state.anesthesiaOverride}
          />
        }
        actionRail={
          <ActionRail
            draftReady={readiness.draftReady}
            sendReady={readiness.sendReady}
            draftApproved={state.draftApproved}
            sent={state.step === "sent"}
            mode="physician"
            canPreviewPatient={false}
            onApprove={handleApprove}
            onSend={handleSend}
            onReset={reset}
            onPreviewPatient={() => {}}
            onViewTimeline={() => handleJump("timeline")}
            onBackToPhysician={() => {}}
          />
        }
        sidebar={
          <div className="space-y-6">
            <ReadinessSidebar
              patientReady={readiness.patientReady}
              encounterReady={readiness.encounterReady}
              procedureReady={!!state.assembly}
              assemblyReady={readiness.assemblyReady}
              blockersResolved={readiness.blockersResolved}
              draftApproved={state.draftApproved}
              sendReady={readiness.sendReady}
              progressPercentage={readiness.progressPercentage}
              blockers={mappedAssembly?.blockers ?? []}
              onJump={handleJump}
            />
          </div>
        }
      >
        {renderMainContent()}
      </ClinicalWorkspaceShell>

      <SendConfirmationModal
        open={sendModalOpen}
        patient={mappedPatient}
        encounter={mappedEncounter}
        procedure={mappedProcedure}
        assembly={mappedAssembly}
        onConfirm={handleConfirmSend}
        onCancel={() => setSendModalOpen(false)}
      />
    </>
  );
}
