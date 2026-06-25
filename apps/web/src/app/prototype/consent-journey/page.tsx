"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileCheck,
  FileText,
  RefreshCcw,
  Search,
  Send,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import SectionPanel from "@/components/ui/SectionPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import WorkflowProgress from "@/components/ui/WorkflowProgress";
import type { WorkflowProgressState } from "@/components/ui/WorkflowProgress";
import {
  getProcedureOptions,
  getExampleWithBoth,
  getExampleConsentOnly,
  resolveContentByProcedureName,
  type ContentMappingResult,
} from "@/lib/prototype/content-mapping-service";

type JourneyStep = "procedure" | "mapping" | "education" | "preview" | "ready";

type JourneyStepDef = {
  id: JourneyStep;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
};

const baseSteps: JourneyStepDef[] = [
  {
    id: "procedure",
    titleEn: "Procedure",
    titleAr: "Procedure",
    subtitleEn: "Select procedure",
    subtitleAr: "Select procedure",
  },
  {
    id: "mapping",
    titleEn: "Content Mapping",
    titleAr: "Content Mapping",
    subtitleEn: "Resolve forms",
    subtitleAr: "Resolve forms",
  },
  {
    id: "education",
    titleEn: "Education",
    titleAr: "Education",
    subtitleEn: "Patient material",
    subtitleAr: "Patient material",
  },
  {
    id: "preview",
    titleEn: "Consent Preview",
    titleAr: "Consent Preview",
    subtitleEn: "Review form",
    subtitleAr: "Review form",
  },
  {
    id: "ready",
    titleEn: "Ready for Signature",
    titleAr: "Ready for Signature",
    subtitleEn: "Send to patient",
    subtitleAr: "Send to patient",
  },
];

function computeStepStates(
  currentStep: JourneyStep,
  hasEducation: boolean
): Array<JourneyStepDef & { state?: WorkflowProgressState }> {
  const currentIndex = baseSteps.findIndex((s) => s.id === currentStep);

  return baseSteps.map((step, index) => {
    const isEducation = step.id === "education";
    const skippedEducation = isEducation && !hasEducation;

    let state: WorkflowProgressState;
    if (skippedEducation) {
      state = "upcoming";
    } else if (index < currentIndex) {
      state = "completed";
    } else if (index === currentIndex) {
      state = "current";
    } else {
      state = "upcoming";
    }

    return {
      ...step,
      subtitleEn: skippedEducation ? "Not applicable" : step.subtitleEn,
      subtitleAr: skippedEducation ? "Not applicable" : step.subtitleAr,
      state,
    };
  });
}

export default function ConsentJourneyPage() {
  const options = useMemo(() => getProcedureOptions(), []);
  const [currentStep, setCurrentStep] = useState<JourneyStep>("procedure");
  const [query, setQuery] = useState("");
  const [mapping, setMapping] = useState<ContentMappingResult | null>(null);
  const [educationConfirmed, setEducationConfirmed] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [sent, setSent] = useState(false);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options.slice(0, 10);
    return options.filter(
      (o) =>
        o.procedureNameEn.toLowerCase().includes(term) ||
        o.specialty.toLowerCase().includes(term)
    );
  }, [query, options]);

  const hasEducation = mapping?.found ? Boolean(mapping.educationMaterial) : false;
  const workflowSteps = useMemo(
    () => computeStepStates(currentStep, hasEducation),
    [currentStep, hasEducation]
  );

  function selectProcedure(procedureName: string) {
    const result = resolveContentByProcedureName(procedureName);
    if (result.found) {
      setMapping(result);
      setQuery(result.procedureNameEn);
      setEducationConfirmed(false);
      setConsentConfirmed(false);
      setSent(false);
      setCurrentStep(result.educationMaterial ? "education" : "preview");
    }
  }

  function loadExampleBoth() {
    const result = getExampleWithBoth();
    if (result.found) {
      setMapping(result);
      setQuery(result.procedureNameEn);
      setEducationConfirmed(false);
      setConsentConfirmed(false);
      setSent(false);
      setCurrentStep("education");
    }
  }

  function loadExampleConsentOnly() {
    const result = getExampleConsentOnly();
    if (result.found) {
      setMapping(result);
      setQuery(result.procedureNameEn);
      setEducationConfirmed(false);
      setConsentConfirmed(false);
      setSent(false);
      setCurrentStep("preview");
    }
  }

  function reset() {
    setCurrentStep("procedure");
    setQuery("");
    setMapping(null);
    setEducationConfirmed(false);
    setConsentConfirmed(false);
    setSent(false);
  }

  if (!mapping) {
    return (
      <div>
        <PageHeader
          title="Consent Journey"
          subtitle="End-to-end prototype: procedure selection → content mapping → education → consent preview → ready for signature."
          badge="Phase 44 Prototype"
          icon={<UserCheck className="h-7 w-7" />}
          action={
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          }
        />

        <SectionPanel
          title="Select a Procedure"
          subtitle="Choose a procedure to start the informed-consent journey using real IMC approved-forms mappings."
          variant="elevated"
        >
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search procedure…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="mb-6 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">No matching procedures.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredOptions.map((option) => (
                  <li key={option.procedureId}>
                    <button
                      onClick={() => selectProcedure(option.procedureNameEn)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-violet-50/60"
                    >
                      <span className="font-medium text-slate-800">{option.procedureNameEn}</span>
                      <span className="text-xs text-slate-500">{option.specialty}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={loadExampleBoth}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Example: Education + Consent</span>
                <StatusBadge variant="completed">Complete</StatusBadge>
              </div>
              <p className="text-sm text-slate-600">
                Loads a procedure with both patient education material and consent form.
              </p>
            </button>
            <button
              onClick={loadExampleConsentOnly}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Example: Consent Only</span>
                <StatusBadge variant="warning">Consent only</StatusBadge>
              </div>
              <p className="text-sm text-slate-600">
                Loads a procedure with only a consent form and no education material.
              </p>
            </button>
          </div>
        </SectionPanel>
      </div>
    );
  }

  const result = mapping as Extract<ContentMappingResult, { found: true }>;

  return (
    <div>
      <PageHeader
        title="Consent Journey"
        subtitle={`${result.procedureNameEn} · ${result.specialty}`}
        badge="Phase 44 Prototype"
        icon={<UserCheck className="h-7 w-7" />}
        action={
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        }
      />

      <div className="mb-6">
        <WorkflowProgress
          steps={workflowSteps}
          language="en"
          layout="scroll"
          onStepClick={(step) => {
            const target = step.id as JourneyStep;
            const targetIndex = baseSteps.findIndex((s) => s.id === target);
            if (targetIndex <= baseSteps.findIndex((s) => s.id === currentStep)) {
              setCurrentStep(target);
            }
          }}
        />
      </div>

      {currentStep === "procedure" && (
        <SectionPanel title="Procedure Selected" subtitle="Review the selected procedure." variant="elevated">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-700">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{result.procedureNameEn}</div>
              <div className="text-sm text-slate-500">{result.specialty} · {result.department}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setCurrentStep("mapping")}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
            >
              Continue to Mapping
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </SectionPanel>
      )}

      {currentStep === "mapping" && (
        <SectionPanel title="Content Mapping Result" subtitle="Resolved from the Approved Forms Library." variant="elevated">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Procedure</div>
              <div className="font-medium text-slate-800">{result.procedureNameEn}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Specialty</div>
              <div className="font-medium text-slate-800">{result.specialty}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Language</div>
              <div className="font-medium text-slate-800">{result.language}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Version</div>
              <div className="font-medium text-slate-800">{result.version}</div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {result.educationMaterial && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  <BookOpen className="h-4 w-4" />
                  Education Material
                </div>
                <div className="text-sm text-slate-700">{result.educationMaterial.fileName}</div>
              </div>
            )}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-blue-900">
                <FileCheck className="h-4 w-4" />
                Consent Form
              </div>
              <div className="text-sm text-slate-700">{result.consentForm.fileName}</div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={() => setCurrentStep(result.educationMaterial ? "education" : "preview")}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </SectionPanel>
      )}

      {currentStep === "education" && result.educationMaterial && (
        <SectionPanel
          title="Patient Education Material"
          subtitle="Review and confirm the patient education material before proceeding."
          variant="elevated"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">{result.educationMaterial.fileName}</div>
                <div className="text-xs text-slate-500">{result.educationMaterial.publicPath}</div>
              </div>
            </div>
            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-2">In production this panel would render the bilingual education content (video, PDF, or article) and capture patient acknowledgment.</p>
              <p>This prototype does not display the actual PDF content.</p>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <input
                type="checkbox"
                checked={educationConfirmed}
                onChange={(e) => setEducationConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm font-medium text-slate-700">Patient has reviewed the education material</span>
            </label>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep("mapping")}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              disabled={!educationConfirmed}
              onClick={() => setCurrentStep("preview")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white ${
                educationConfirmed ? "bg-violet-700 hover:bg-violet-800" : "cursor-not-allowed bg-slate-300"
              }`}
            >
              Continue to Consent Preview
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </SectionPanel>
      )}

      {currentStep === "preview" && (
        <SectionPanel title="Consent Form Preview" subtitle="Review the consent form before sending for signature." variant="elevated">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">{result.consentForm.fileName}</div>
                <div className="text-xs text-slate-500">{result.consentForm.publicPath}</div>
              </div>
            </div>
            <div className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Specialty</div>
                <div className="font-medium text-slate-800">{result.specialty}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Language</div>
                <div className="font-medium text-slate-800">{result.language}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Version</div>
                <div className="font-medium text-slate-800">{result.version}</div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-2">In production this panel would render the bilingual consent form with all mandatory disclosures, risks, alternatives, and signature blocks.</p>
              <p>This prototype does not display the actual PDF content and does not generate a signature request.</p>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm font-medium text-slate-700">Physician confirms the consent form is correct</span>
            </label>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(result.educationMaterial ? "education" : "mapping")}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              disabled={!consentConfirmed}
              onClick={() => setCurrentStep("ready")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white ${
                consentConfirmed ? "bg-violet-700 hover:bg-violet-800" : "cursor-not-allowed bg-slate-300"
              }`}
            >
              Mark Ready for Signature
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </SectionPanel>
      )}

      {currentStep === "ready" && (
        <SectionPanel title="Ready for Signature" subtitle="Simulated final step — no real OTP/SMS/PDF is sent." variant="elevated">
          {!sent ? (
            <>
              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="mb-3 text-sm font-semibold text-slate-900">Consent Package Summary</h4>
                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Procedure</div>
                    <div className="font-medium text-slate-800">{result.procedureNameEn}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Specialty</div>
                    <div className="font-medium text-slate-800">{result.specialty}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Consent Form</div>
                    <div className="font-medium text-slate-800">{result.consentForm.fileName}</div>
                  </div>
                  {result.educationMaterial && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Education Material</div>
                      <div className="font-medium text-slate-800">{result.educationMaterial.fileName}</div>
                    </div>
                  )}
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Language</div>
                    <div className="font-medium text-slate-800">{result.language}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Version</div>
                    <div className="font-medium text-slate-800">{result.version}</div>
                  </div>
                </div>
              </div>

              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <strong>Simulation Mode:</strong> Clicking "Send to Patient" will only simulate the final step. No
                OTP, SMS, or PDF will be generated.
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep("preview")}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setSent(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  <Send className="h-4 w-4" />
                  Simulate Send to Patient
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
                Consent package for <strong>{result.procedureNameEn}</strong> is ready for patient signature. In
                production this would queue the signing link, generate the immutable PDF, and log an audit event.
              </p>
              <button
                onClick={reset}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <RefreshCcw className="h-4 w-4" />
                Start New Journey
              </button>
            </div>
          )}
        </SectionPanel>
      )}
    </div>
  );
}
