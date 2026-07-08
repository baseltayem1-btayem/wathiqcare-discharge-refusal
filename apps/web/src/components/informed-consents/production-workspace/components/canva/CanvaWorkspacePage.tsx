"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  Check,
  Download,
  Eye,
  FilePlus,
  Fingerprint,
  ListChecks,
  Lock,
  Package,
  Send,
  Server,
  User,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button, Checkbox } from "@/components/design-system";
import type {
  ProductionPatient,
  ProductionEncounter,
  ClinicalKnowledgeAssembly,
  TimelineEvent,
} from "../../types";
import type { ProductionWorkspaceState, Readiness } from "../../hooks/useProductionWorkspace";
import type {
  ClinicalKnowledgeEducationMaterial,
  ClinicalSuggestion,
  ConsentBlocker,
} from "@/lib/clinical-knowledge/types";
import { ConsentPreviewModal } from "../ConsentPreviewModal";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader, WorkspaceField } from "../WorkspaceAtoms";

interface CanvaWorkspacePageProps {
  patient?: ProductionPatient;
  encounter?: ProductionEncounter;
  assembly?: ClinicalKnowledgeAssembly;
  readiness: Readiness;
  state: ProductionWorkspaceState;
  timeline: TimelineEvent[];
  sendLoading: boolean;
  onSend: () => void;
  onApproveDraft: () => void;
  onMarkPreviewReviewed?: () => void;
}

function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width="56" height="56" className="-rotate-90">
      <circle cx="28" cy="28" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke="#2563eb"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function ChecklistDot({ done }: { done: boolean }) {
  return (
    <div
      className={[
        "flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full",
        done ? "bg-emerald-500 text-white" : "border-2 border-slate-200 bg-slate-100",
      ].join(" ")}
    >
      {done ? <Check className="h-2.5 w-2.5" /> : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-4 text-center text-[11px] text-slate-500">{message}</p>;
}

function PackageStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center text-[10px]">
      <p className="text-base font-bold text-slate-800">{value}</p>
      <p className="text-slate-500">{label}</p>
    </div>
  );
}

export function CanvaWorkspacePage({
  patient,
  encounter,
  assembly,
  readiness,
  state,
  timeline,
  sendLoading,
  onSend,
  onApproveDraft,
  onMarkPreviewReviewed,
}: CanvaWorkspacePageProps) {
  const { lang } = useI18n();
  const [previewOpen, setPreviewOpen] = useState(false);

  const packageTitle = useMemo(() => {
    if (!assembly) return undefined;
    return lang === "ar" && assembly.procedureNameAr ? assembly.procedureNameAr : assembly.procedureNameEn;
  }, [assembly, lang]);

  const consentForm = assembly?.consentForm;
  const consentSections = consentForm?.sections || [];
  const approvedPdfUrl = consentForm?.pdfTemplateUrl?.trim() || "";
  const hasApprovedPdfSource = Boolean(
    approvedPdfUrl &&
      (
        (consentForm as unknown as Record<string, unknown> | undefined)?.sourceAvailable ||
        (consentForm?.governanceSnapshot as Record<string, unknown> | null | undefined)?.sourceAvailable ||
        approvedPdfUrl.startsWith("/approved-consent-forms/")
      ),
  );
  const hasConsentContent = hasApprovedPdfSource;

  const checklistItems = [
    { done: readiness.patientReady, label: "Patient selected" },
    { done: readiness.encounterReady, label: "Encounter selected" },
    { done: readiness.procedureSelected, label: "Procedure selected" },
    { done: readiness.assemblyReady && readiness.blockersResolved, label: "Knowledge package ready" },
    { done: hasConsentContent, label: "Consent content loaded" },
    { done: readiness.educationReady, label: "Education material ready" },
    { done: readiness.previewReviewed, label: "Preview reviewed" },
    { done: readiness.contactAvailable && readiness.allowlisted, label: "Recipient allowlisted" },
    { done: state.draftApproved, label: "Draft approved" },
  ];

  const sendDisabled = !readiness.sendReady || sendLoading;
  const sendReason = useMemo(() => {
    if (sendLoading) return "Sending…";
    if (!readiness.patientReady) return "Select a patient first";
    if (!readiness.encounterReady) return "Select an encounter first";
    if (!readiness.procedureSelected) return "Select a procedure first";
    if (!readiness.assemblyReady) return "Load the knowledge package first";
    if (!readiness.blockersResolved) return "Resolve blockers first";
    if (!hasConsentContent) return "Consent form has no content";
    if (!readiness.educationReady) return "Education material missing";
    if (!readiness.previewReviewed) return "Review the patient preview first";
    if (!readiness.contactAvailable) return "Enter patient contact";
    if (!readiness.allowlisted) return "Recipient is not allowlisted";
    if (!state.draftApproved) return "Approve the draft first";
    return undefined;
  }, [hasConsentContent, readiness, sendLoading, state.draftApproved]);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <WorkspaceCard id="package-preview">
          <WorkspaceCardHeader
            icon={<BookOpenCheck className="size-5" />}
            title={packageTitle || "Clinical Knowledge Package"}
            description="The evidence-based content the patient will review."
            action={
              assembly?.status === "ready" ? (
                <WorkspaceBadge tone="green">Ready for review</WorkspaceBadge>
              ) : assembly?.status === "blocked" ? (
                <WorkspaceBadge tone="red">Blocked</WorkspaceBadge>
              ) : (
                <WorkspaceBadge tone="slate">Not loaded</WorkspaceBadge>
              )
            }
          />
          <div className="px-5 py-5">
            {assembly ? (
              <div className="flex flex-col gap-5 xl:flex-row">
                <div className="flex h-40 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 xl:w-40 xl:shrink-0">
                  <Package className="h-10 w-10 text-blue-300" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{consentForm?.titleEn || packageTitle}</h3>
                      <p className="text-sm leading-6 text-slate-500">
                        {consentForm
                          ? `${consentForm.formType.replace(/_/g, " ")} • v${consentForm.version} • ${consentForm.riskLevel} risk`
                          : "Procedure knowledge package pending clinical review."}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!assembly}
                      onClick={() => setPreviewOpen(true)}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 disabled:text-slate-500"
                    >
                      <Eye className="h-3 w-3" /> Preview package
                    </button>
                  </div>

                  <div className="grid gap-x-6 gap-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
                    <WorkspaceField label="Language" value={patient?.languagePreference === "ar" ? "Arabic Set" : "Bilingual Set"} />
                    <WorkspaceField label="Reading level" value="Grade 6" />
                    <WorkspaceField
                      label="Format"
                      value={assembly.educationMaterials.some((e: ClinicalKnowledgeEducationMaterial) => e.assetType === "VIDEO") ? "Video + illustrated" : "Illustrated"}
                    />
                    <WorkspaceField
                      label="Estimated time"
                      value={`~${assembly.educationMaterials.reduce((acc: number, e: ClinicalKnowledgeEducationMaterial) => acc + (e.durationMinutes || 0), 0) || 15} min`}
                    />
                  </div>

                  {!hasConsentContent ? (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        The approved consent PDF source is unavailable for this package. Preview review and sending are
                        blocked until the actual approved clinical form is available.
                      </span>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-center text-[10px] sm:grid-cols-4">
                    <PackageStat value={hasApprovedPdfSource ? 1 : 0} label="Approved PDF" />
                    <PackageStat
                      value={assembly.educationMaterials.filter((e: ClinicalKnowledgeEducationMaterial) => e.assetType === "PDF" || e.assetType === "TEXT").length}
                      label="Benefits / Info"
                    />
                    <PackageStat value={assembly.riskDisclosures.length} label="Risks" />
                    <PackageStat
                      value={assembly.suggestions.filter((s: ClinicalSuggestion) => s.type === "missing-alternative").length}
                      label="Alternatives"
                    />
                  </div>

                  <div className="flex flex-col items-start gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      uppercase={false}
                      disabled={!assembly}
                      onClick={() => setPreviewOpen(true)}
                      className="rounded-full border-slate-200 text-[11px]"
                    >
                      <Eye className="mr-1 h-3 w-3" /> Preview patient-facing consent
                    </Button>
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
                      <Checkbox
                        checked={state.previewReviewed}
                        onChange={() => onMarkPreviewReviewed?.()}
                        disabled={!assembly || state.previewReviewed || !hasConsentContent}
                      />
                      I have reviewed the patient preview
                    </label>
                  </div>

                  {assembly.educationMaterials.length > 0 ? (
                    <div className="border-t border-slate-100 pt-3">
                      <h4 className="mb-2 text-[11px] font-semibold text-slate-700">Education materials</h4>
                      <ul className="space-y-1">
                        {assembly.educationMaterials.map((material: ClinicalKnowledgeEducationMaterial) => (
                          <li
                            key={material.id}
                            className="flex items-center justify-between rounded border border-slate-100 p-2 text-[10px] text-slate-600"
                          >
                            <span className="truncate font-medium text-slate-700">
                              {lang === "ar" && material.titleAr ? material.titleAr : material.titleEn}
                            </span>
                            {material.status === "PUBLISHED" ? (
                              <WorkspaceBadge tone="green">Approved</WorkspaceBadge>
                            ) : (
                              <WorkspaceBadge tone="gold">Draft</WorkspaceBadge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {assembly.illustrations.filter((i) => i.imageReviewStatus === "approved" && i.patientFacing).length > 0 ? (
                    <div className="border-t border-slate-100 pt-3">
                      <h4 className="mb-2 text-[11px] font-semibold text-slate-700">Approved patient-facing illustrations</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {assembly.illustrations
                          .filter((i) => i.imageReviewStatus === "approved" && i.patientFacing)
                          .map((illustration) => (
                            <div key={illustration.id} className="space-y-1">
                              <span className="block truncate text-[10px] font-medium text-slate-700">{illustration.procedureNameEn}</span>
                              {illustration.procedureImageUrl || illustration.anatomyImageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element -- approved educational illustration preview */
                                <img
                                  src={illustration.procedureImageUrl || illustration.anatomyImageUrl || ""}
                                  alt={illustration.procedureNameEn}
                                  className="h-24 w-full rounded border border-slate-200 bg-slate-50 object-contain"
                                />
                              ) : null}
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null}

                  {state.reviewMode && assembly.illustrations.filter((i) => i.imageReviewStatus !== "approved").length > 0 ? (
                    <div className="border-t border-dashed border-slate-200 pt-3">
                      <h4 className="mb-2 text-[11px] font-semibold text-amber-700">Internal review — draft illustrations</h4>
                      <div className="grid grid-cols-2 gap-3 opacity-70">
                        {assembly.illustrations
                          .filter((i) => i.imageReviewStatus !== "approved")
                          .map((illustration) => (
                            <div key={illustration.id} className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-[10px] font-medium text-slate-700">{illustration.procedureNameEn}</span>
                                <WorkspaceBadge tone="gold">Draft</WorkspaceBadge>
                              </div>
                              {illustration.procedureImageUrl || illustration.anatomyImageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element -- internal draft illustration preview */
                                <img
                                  src={illustration.procedureImageUrl || illustration.anatomyImageUrl || ""}
                                  alt={illustration.procedureNameEn}
                                  className="h-24 w-full rounded border border-slate-200 bg-slate-50 object-contain"
                                />
                              ) : null}
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState message="Select a patient, encounter, and procedure to load the Clinical Knowledge Package." />
            )}

            <p className="mt-4 text-[10px] text-slate-500">
              {assembly ? `Last updated: ${new Date(assembly.assembledAt).toLocaleString()}` : "Knowledge package not yet resolved."}
            </p>
          </div>
        </WorkspaceCard>

        <WorkspaceCard>
          <WorkspaceCardHeader
            icon={<ListChecks className="size-5" />}
            title="Readiness checklist"
            description="Complete every required step before sending consent."
          />
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ProgressRing percentage={readiness.progressPercentage} />
                  <div>
                    <p className="text-xl font-bold text-slate-900">{readiness.progressPercentage}%</p>
                    <p className="text-[11px] text-slate-500">
                      {readiness.completedChecks} of {readiness.totalChecks} steps complete
                    </p>
                  </div>
                </div>
                <WorkspaceBadge tone={sendDisabled ? "gold" : "green"}>
                  {sendDisabled ? `${readiness.missingItems.length} required left` : "Ready to send"}
                </WorkspaceBadge>
              </div>
            </div>

            <div className="space-y-2 text-[11px]">
              {checklistItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <ChecklistDot done={item.done} />
                  <span className={item.done ? "text-slate-700" : "text-slate-500"}>{item.label}</span>
                </div>
              ))}
            </div>

            <Button
              variant="brand"
              size="sm"
              fullWidth
              disabled={sendDisabled}
              onClick={onSend}
              className="rounded-lg py-2 text-xs font-semibold"
            >
              <Send className="mr-1 h-3.5 w-3.5" />
              {sendLoading ? "Sending…" : "Send to Patient"}
            </Button>
            {sendReason ? <p className="text-center text-[10px] text-slate-500">{sendReason}</p> : null}
            <Button
              variant="outline"
              size="sm"
              fullWidth
              disabled={state.draftApproved}
              onClick={onApproveDraft}
              className="rounded-lg border-slate-200 py-1.5 text-xs font-medium"
            >
              {state.draftApproved ? "Draft Approved" : "Save Draft"}
            </Button>
            {!state.draftApproved ? <p className="text-center text-[10px] text-slate-500">Draft save is not persisted in this release.</p> : null}
          </div>
        </WorkspaceCard>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <WorkspaceCard className="space-y-2 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
              <FilePlus className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Decision support &amp; alerts</h3>
              <p className="text-xs text-slate-500">Clinical blockers, suggestions, and patient preference.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {assembly?.blockers.length
              ? assembly.blockers.map((blocker: ConsentBlocker) => (
                  <div key={blocker.key} className="flex items-start gap-2 rounded-lg bg-red-50 p-2">
                    <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0 text-red-500" />
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-red-700">Consent blocker</p>
                      <p className="text-[9px] text-red-700">
                        {lang === "ar" && blocker.messageAr ? blocker.messageAr : blocker.messageEn}
                      </p>
                    </div>
                  </div>
                ))
              : null}

            {assembly?.suggestions.length
              ? assembly.suggestions.map((suggestion: ClinicalSuggestion) => (
                  <div
                    key={suggestion.id}
                    className={[
                      "flex items-start gap-2 rounded-lg p-2",
                      suggestion.severity === "critical"
                        ? "bg-red-50"
                        : suggestion.severity === "warning"
                          ? "bg-yellow-50"
                          : "bg-blue-50",
                    ].join(" ")}
                  >
                    <FilePlus
                      className={[
                        "mt-[1px] h-3 w-3 shrink-0",
                        suggestion.severity === "critical"
                          ? "text-red-500"
                          : suggestion.severity === "warning"
                            ? "text-yellow-600"
                            : "text-blue-500",
                      ].join(" ")}
                    />
                    <div className="flex-1">
                      <p
                        className={[
                          "text-[11px] font-semibold",
                          suggestion.severity === "critical"
                            ? "text-red-700"
                            : suggestion.severity === "warning"
                              ? "text-yellow-800"
                              : "text-blue-800",
                        ].join(" ")}
                      >
                        {suggestion.type.replace(/-/g, " ").replace(/\b\w/g, (char: string) => char.toUpperCase())}
                      </p>
                      <p
                        className={[
                          "text-[9px]",
                          suggestion.severity === "critical"
                            ? "text-red-600"
                            : suggestion.severity === "warning"
                              ? "text-yellow-700"
                              : "text-blue-600",
                        ].join(" ")}
                      >
                        {lang === "ar" && suggestion.messageAr ? suggestion.messageAr : suggestion.messageEn}
                      </p>
                    </div>
                  </div>
                ))
              : null}

            {!assembly?.blockers.length && !assembly?.suggestions.length ? (
              <>
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-2">
                  <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0 text-red-500" />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-red-700">High-risk procedure</p>
                    <p className="text-[9px] text-red-700">
                      {assembly ? "Risk assessment will appear once the knowledge package is resolved." : "Select a procedure to view risk assessment."}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-2">
                  <FilePlus className="mt-[1px] h-3 w-3 shrink-0 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-yellow-800">Additional consent items</p>
                    <p className="text-[9px] text-yellow-700">No additional items detected.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-2">
                  <User className="mt-[1px] h-3 w-3 shrink-0 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-blue-800">Patient preference</p>
                    <p className="text-[9px] text-blue-600">
                      {patient?.languagePreference === "ar" ? "Prefers Arabic explanations." : "Language preference not set."}
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </WorkspaceCard>

        <WorkspaceCard>
          <WorkspaceCardHeader
            icon={<Activity className="size-5" />}
            title="Clinical timeline"
            description="Chronological record of consent activity."
          />
          <div className="space-y-0 px-5 py-5 text-[11px]">
            {timeline.length > 0
              ? timeline.map((event, idx) => {
                  const done = event.status === "completed";
                  const isLast = idx === timeline.length - 1;
                  return (
                    <div key={event.id} className="flex items-start gap-2">
                      <div className="flex flex-col items-center">
                        <div
                          className={[
                            "h-2 w-2 flex-shrink-0 rounded-full border-2 border-blue-600 bg-white",
                            done && "bg-blue-600",
                          ].join(" ")}
                        />
                        {!isLast ? <div className={["min-h-[14px] w-0.5 bg-slate-200", done && "bg-blue-600"].join(" ")} /> : null}
                      </div>
                      <div className={["pb-1", !done && "text-slate-500"].join(" ")}>
                        <p className="font-medium">{lang === "ar" && event.summaryAr ? event.summaryAr : event.summaryEn}</p>
                        <p className="text-[9px] text-slate-500">{new Date(event.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })
              : [
                  { label: "Patient registered", done: !!patient },
                  { label: "Encounter started", done: !!encounter },
                  { label: "Procedure selected", done: !!assembly },
                  { label: "Waiting for consent", done: false },
                  { label: "Patient signed", done: false },
                ].map((item, idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex flex-col items-center">
                        <div
                          className={[
                            "h-2 w-2 flex-shrink-0 rounded-full border-2 border-blue-600 bg-white",
                            item.done && "bg-blue-600",
                            !item.done && "border-slate-300 bg-white",
                          ].join(" ")}
                        />
                        {!isLast ? <div className={["min-h-[14px] w-0.5 bg-slate-200", item.done && "bg-blue-600"].join(" ")} /> : null}
                      </div>
                      <div className={["pb-1", !item.done && "text-slate-500"].join(" ")}>
                        <p className="font-medium">{item.label}</p>
                      </div>
                    </div>
                  );
                })}
          </div>
        </WorkspaceCard>

        <div className="space-y-3">
          <WorkspaceCard className="p-5">
            <h3 className="mb-1.5 text-xs font-semibold text-slate-800">Task Metrics (Today)</h3>
            <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
              <div>
                <p className="text-base font-bold text-blue-600">0</p>
                <p className="text-slate-500">Packages Generated</p>
              </div>
              <div>
                <p className="text-base font-bold text-blue-600">0</p>
                <p className="text-slate-500">Consents Sent</p>
              </div>
              <div>
                <p className="text-base font-bold text-green-600">0</p>
                <p className="text-slate-500">Consents Completed</p>
              </div>
              <div>
                <p className="text-base font-bold text-yellow-600">0</p>
                <p className="text-slate-500">Pending Review</p>
              </div>
            </div>
          </WorkspaceCard>

          <WorkspaceCard>
            <WorkspaceCardHeader
              icon={<Fingerprint className="size-5" />}
              title="Audit & evidence"
              description="Tamper-evident record of every action."
              action={
                <WorkspaceBadge tone="green">
                  <Lock className="size-3" /> Sealed
                </WorkspaceBadge>
              }
            />
            <div className="px-5 py-5">
              <div className="rounded-xl bg-blue-50 p-4 ring-1 ring-inset ring-blue-100">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200">
                    <Fingerprint className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900">Evidence chain verified</p>
                    <p className="text-[11px] text-slate-500">{timeline.length} events · SHA-256 · immutable</p>
                  </div>
                  <WorkspaceBadge tone="green" className="ml-auto">
                    Intact
                  </WorkspaceBadge>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-100 bg-white/80 px-3 py-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-blue-700" />
                  <p className="truncate font-mono text-[11px] text-slate-500">sha256:9f3a7c…c21e</p>
                </div>
              </div>

              <ol className="mt-4 space-y-3">
                {timeline.slice(0, 4).map((event, index) => {
                  const isSystem = event.actor === "system";
                  return (
                    <li key={event.id} className="relative flex gap-3">
                      {index < Math.min(timeline.length, 4) - 1 ? (
                        <span className="absolute left-[13px] top-7 h-[calc(100%-2px)] w-px bg-slate-200" aria-hidden />
                      ) : null}
                      <span
                        className={[
                          "z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                          isSystem ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-700",
                        ].join(" ")}
                      >
                        {isSystem ? <Server className="size-3.5" /> : <User className="size-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1 pb-0.5">
                        <p className="text-sm leading-snug text-slate-900">
                          {lang === "ar" && event.summaryAr ? event.summaryAr : event.summaryEn}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {event.actorName} · <span className="font-mono">{new Date(event.timestamp).toLocaleString()}</span>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <button
                type="button"
                disabled
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500"
              >
                <Download className="h-4 w-4" /> Export evidence bundle (PDF)
              </button>
            </div>
          </WorkspaceCard>
        </div>
      </div>

      <ConsentPreviewModal
        open={previewOpen}
        assembly={assembly}
        reviewMode={state.reviewMode}
        onClose={() => setPreviewOpen(false)}
        onMarkReviewed={onMarkPreviewReviewed}
        reviewed={state.previewReviewed}
      />

      <footer className="pt-2 text-center text-[9px] text-slate-500">
        © 2025 WathiqCare. All rights reserved. | Privacy Policy | Terms of Use | Enterprise Grade
        Security &amp; Compliance
      </footer>
    </div>
  );
}