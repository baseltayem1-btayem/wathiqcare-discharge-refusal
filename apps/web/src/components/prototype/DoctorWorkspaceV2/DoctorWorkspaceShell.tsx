"use client";

import { useMemo, useState } from "react";
import {
  Stethoscope,
  Search,
  User,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  Send,
  RotateCcw,
  FileCheck,
  ShieldAlert,
  Syringe,
  BookOpen,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import SectionPanel from "@/components/ui/SectionPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import WorkflowProgress from "@/components/ui/WorkflowProgress";
import type { MockPatientEncounter, WorkspaceStepKey } from "@/lib/prototype/types";
import { MOCK_PATIENT_ENCOUNTERS } from "@/lib/prototype/mock-patients";
import { PROCEDURE_MAPPINGS_V2 } from "@/lib/prototype/procedure-mapping-matrix";
import { getTemplateById, EDUCATION_ASSETS_V2 } from "@/lib/prototype/form-taxonomy";
import { CONSENT_CATEGORIES_V2 } from "@/lib/prototype/form-taxonomy";

const steps: {
  id: WorkspaceStepKey;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
}[] = [
  { id: "patient", titleEn: "Patient", titleAr: "المريض", subtitleEn: "Select encounter", subtitleAr: "اختيار الحالة" },
  { id: "recommend", titleEn: "Recommend", titleAr: "التوصية", subtitleEn: "Mapping engine", subtitleAr: "محرك الربط" },
  { id: "review", titleEn: "Review", titleAr: "المراجعة", subtitleEn: "Consent preview", subtitleAr: "معاينة الموافقة" },
  { id: "simulate", titleEn: "Simulate Send", titleAr: "محاكاة الإرسال", subtitleEn: "No real OTP/SMS/PDF", subtitleAr: "بدون OTP/SMS/PDF" },
];

export default function DoctorWorkspaceShell() {
  const [currentStep, setCurrentStep] = useState<WorkspaceStepKey>("patient");
  const [search, setSearch] = useState("");
  const [selectedEncounter, setSelectedEncounter] = useState<MockPatientEncounter | null>(null);
  const [simulated, setSimulated] = useState(false);

  const filteredEncounters = useMemo(() => {
    const term = search.trim().toLowerCase();
    return MOCK_PATIENT_ENCOUNTERS.filter(
      (e) =>
        !term ||
        e.patientNameEn.toLowerCase().includes(term) ||
        e.mrn.toLowerCase().includes(term) ||
        e.caseNumber.toLowerCase().includes(term)
    );
  }, [search]);

  const recommendation = useMemo(() => {
    if (!selectedEncounter) return null;
    return PROCEDURE_MAPPINGS_V2.find((m) => m.procedureCode === selectedEncounter.procedureCode) ?? null;
  }, [selectedEncounter]);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  function selectEncounter(encounter: MockPatientEncounter) {
    setSelectedEncounter(encounter);
    setCurrentStep("recommend");
    setSimulated(false);
  }

  function reset() {
    setSelectedEncounter(null);
    setCurrentStep("patient");
    setSimulated(false);
    setSearch("");
  }

  function simulateSend() {
    setSimulated(true);
  }

  const stats = useMemo(
    () => ({
      totalEncounters: MOCK_PATIENT_ENCOUNTERS.length,
      synced: MOCK_PATIENT_ENCOUNTERS.filter((e) => e.syncStatus === "SYNCED").length,
      highRisk: MOCK_PATIENT_ENCOUNTERS.filter((e) => {
        const map = PROCEDURE_MAPPINGS_V2.find((m) => m.procedureCode === e.procedureCode);
        return map && (map.riskLevel === "HIGH" || map.riskLevel === "CRITICAL");
      }).length,
      pending: MOCK_PATIENT_ENCOUNTERS.length,
    }),
    []
  );

  return (
    <div>
      <PageHeader
        title="Doctor Workspace V2"
        subtitle="Smart consent issuance flow powered by the Procedure Mapping Engine."
        badge="Prototype"
        icon={<Stethoscope className="h-7 w-7" />}
        action={
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today&apos;s Encounters</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.totalEncounters}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">EMR Synced</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{stats.synced}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">High / Critical Risk</div>
          <div className="mt-1 text-2xl font-bold text-rose-700">{stats.highRisk}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Consents</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{stats.pending}</div>
        </div>
      </div>

      <div className="mb-6">
        <WorkflowProgress
          steps={steps}
          currentStepIndex={currentStepIndex}
          language="en"
          layout="scroll"
          onStepClick={(step) => {
            const targetIndex = steps.findIndex((s) => s.id === step.id);
            if (targetIndex <= currentStepIndex) {
              setCurrentStep(step.id as WorkspaceStepKey);
            }
          }}
        />
      </div>

      {currentStep === "patient" && (
        <SectionPanel
          title="Select Patient Encounter"
          subtitle="Choose an encounter to generate smart consent recommendations."
          variant="elevated"
        >
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient name, MRN, or case number…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {filteredEncounters.map((e) => (
              <button
                key={e.id}
                onClick={() => selectEncounter(e)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{e.patientNameEn}</div>
                      <div className="text-xs text-slate-500">MRN {e.mrn}</div>
                    </div>
                  </div>
                  <StatusBadge variant={e.syncStatus === "SYNCED" ? "completed" : "warning"}>{e.syncStatus}</StatusBadge>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                    {e.caseNumber}
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    {e.admissionDate} · {e.department}
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                    {e.physicianName}
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Planned:</span> {e.plannedProcedure}
                </div>
              </button>
            ))}
          </div>
        </SectionPanel>
      )}

      {currentStep === "recommend" && selectedEncounter && recommendation && (
        <SectionPanel
          title="Smart Recommendation"
          subtitle="Procedure Mapping Engine output for the selected encounter."
          variant="elevated"
        >
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">{selectedEncounter.patientNameEn}</div>
                <div className="text-xs text-slate-500">{selectedEncounter.plannedProcedure}</div>
              </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</div>
                <div className="mt-0.5 font-medium text-slate-800">
                  {CONSENT_CATEGORIES_V2.find((c) => c.code === recommendation.categoryCode)?.nameEn}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Level</div>
                <div className="mt-0.5">
                  <StatusBadge
                    variant={
                      recommendation.riskLevel === "CRITICAL"
                        ? "error"
                        : recommendation.riskLevel === "HIGH"
                        ? "warning"
                        : recommendation.riskLevel === "MEDIUM"
                        ? "info"
                        : "success"
                    }
                  >
                    {recommendation.riskLevel}
                  </StatusBadge>
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Anesthesia</div>
                <div className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-800">
                  <Syringe className="h-3.5 w-3.5 text-slate-400" />
                  {recommendation.anesthesiaImplication}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Education Assets</div>
                <div className="mt-0.5 font-medium text-slate-800">{recommendation.educationAssetIds.length} attached</div>
              </div>
            </div>
          </div>

          <h4 className="mb-3 text-sm font-semibold text-slate-900">Recommended Forms</h4>
          <div className="mb-6 space-y-3">
            {recommendation.recommendedTemplateIds.map((id) => {
              const tpl = getTemplateById(id);
              return (
                <div key={id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{tpl?.titleEn ?? id}</div>
                      <div className="text-xs text-slate-500">{tpl?.templateCode ?? id}</div>
                    </div>
                    <StatusBadge variant={tpl?.status === "IMC_APPROVED" ? "completed" : "info"}>
                      {tpl?.status === "IMC_APPROVED" ? "IMC Approved" : tpl?.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{tpl?.summaryEn}</p>
                </div>
              );
            })}
          </div>

          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4" />
              Mandatory Disclosures
            </div>
            <ul className="list-disc space-y-1 pl-5">
              {recommendation.mandatoryDisclosures.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setCurrentStep("review")}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
            >
              Review Consent
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </div>
        </SectionPanel>
      )}

      {currentStep === "review" && selectedEncounter && recommendation && (
        <SectionPanel title="Review Consent Package" subtitle="Preview before simulated send." variant="elevated">
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Encounter Summary</h4>
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Patient</div>
                <div className="font-medium text-slate-800">{selectedEncounter.patientNameEn}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">MRN</div>
                <div className="font-medium text-slate-800">{selectedEncounter.mrn}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Case</div>
                <div className="font-medium text-slate-800">{selectedEncounter.caseNumber}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Physician</div>
                <div className="font-medium text-slate-800">{selectedEncounter.physicianName}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Procedure</div>
                <div className="font-medium text-slate-800">{selectedEncounter.plannedProcedure}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Diagnosis</div>
                <div className="font-medium text-slate-800">{selectedEncounter.diagnosis}</div>
              </div>
            </div>
          </div>

          <h4 className="mb-3 text-sm font-semibold text-slate-900">Selected Forms</h4>
          <div className="mb-5 space-y-3">
            {recommendation.recommendedTemplateIds.map((id) => {
              const tpl = getTemplateById(id);
              return (
                <div key={id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{tpl?.titleEn}</div>
                      <div className="text-xs text-slate-500">{tpl?.titleAr}</div>
                    </div>
                    <StatusBadge variant={tpl?.riskLevel === "CRITICAL" ? "error" : tpl?.riskLevel === "HIGH" ? "warning" : "info"}>
                      {tpl?.riskLevel}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tpl?.requiresWitness && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">Witness</span>
                    )}
                    {tpl?.requiresGuardian && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">Guardian</span>
                    )}
                    {tpl?.requiresInterpreter && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">Interpreter</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <h4 className="mb-3 text-sm font-semibold text-slate-900">Patient Education</h4>
          <div className="mb-6 flex flex-wrap gap-2">
            {recommendation.educationAssetIds.map((id) => {
              const asset = EDUCATION_ASSETS_V2.find((a) => a.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                >
                  <BookOpen className="h-3 w-3" />
                  {asset?.titleEn}
                  {asset?.durationMinutes ? ` · ${asset.durationMinutes}m` : ""}
                </span>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep("recommend")}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep("simulate")}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
            >
              Proceed to Send
              <Send className="h-4 w-4" />
            </button>
          </div>
        </SectionPanel>
      )}

      {currentStep === "simulate" && selectedEncounter && (
        <SectionPanel title="Simulate Send" subtitle="This action is simulated and will not generate a PDF or send an OTP/SMS." variant="elevated">
          {!simulated ? (
            <>
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-4 w-4" />
                  Simulation Mode
                </div>
                <p>
                  Clicking &quot;Simulate Patient Send&quot; will mark this consent as sent in the prototype only. No
                  real OTP, SMS, or PDF will be produced.
                </p>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 text-sm font-semibold text-slate-900">Recipient</div>
                <div className="text-sm text-slate-700">
                  {selectedEncounter.patientNameEn} · MRN {selectedEncounter.mrn}
                </div>
                <div className="text-xs text-slate-500">Language: Bilingual · Signature method: Patient portal</div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep("review")}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={simulateSend}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  <Send className="h-4 w-4" />
                  Simulate Patient Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Simulated Send Complete</h3>
              <p className="max-w-md text-sm text-slate-600">
                Consent package for <strong>{selectedEncounter.patientNameEn}</strong> has been marked as sent in the
                prototype. In production this would queue the patient signing link, generate the immutable PDF, and log
                an audit event.
              </p>
              <button
                onClick={reset}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
                Start New Encounter
              </button>
            </div>
          )}
        </SectionPanel>
      )}
    </div>
  );
}
