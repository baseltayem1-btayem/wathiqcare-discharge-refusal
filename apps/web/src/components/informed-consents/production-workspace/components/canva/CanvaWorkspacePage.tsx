"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  Check,
  AlertTriangle,
  FilePlus,
  User,
  Send,
  FileText,
  Download,
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
    <svg width="56" height="56" className="canva-progress-ring -rotate-90">
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
        "w-[15px] h-[15px] rounded-full flex items-center justify-center shrink-0",
        done ? "bg-emerald-500 text-white" : "bg-slate-100 border-2 border-slate-200",
      ].join(" ")}
    >
      {done && <Check className="w-2.5 h-2.5" />}
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={["inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold", className].join(" ")}>
      {children}
    </span>
  );
}

function Card({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={["bg-white border border-slate-200 rounded-[10px] p-[14px]", className].join(" ")}
    >
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-[11px] text-slate-500 py-4 text-center">{message}</p>;
}

function PackageStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center text-[10px]">
      <p className="font-bold text-base text-slate-800">{value}</p>
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
    return lang === "ar" && assembly.procedureNameAr
      ? assembly.procedureNameAr
      : assembly.procedureNameEn;
  }, [assembly, lang]);

  const consentForm = assembly?.consentForm;

  const consentSections = assembly?.consentForm?.sections || [];
  const hasConsentContent = consentSections.length > 0;

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
  }, [readiness, sendLoading, state.draftApproved, hasConsentContent]);

  return (
    <div className="space-y-3">
      {/* Top row: Package + Readiness */}
      <div className="grid grid-cols-[1fr_240px] gap-3">
        {/* Clinical Knowledge Package card */}
        <Card id="package-preview">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-800">
                {packageTitle || "Clinical Knowledge Package"}
              </h2>
              {assembly?.status === "ready" && (
                <Badge className="bg-green-100 text-green-700">Ready for Review</Badge>
              )}
              {assembly?.status === "blocked" && (
                <Badge className="bg-red-100 text-red-700">Blocked</Badge>
              )}
              {!assembly && <Badge className="bg-slate-100 text-slate-600">Pending</Badge>}
            </div>
            <button
              type="button"
              disabled={!assembly}
              onClick={() => document.getElementById("package-preview")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="text-blue-600 text-[11px] font-medium flex items-center gap-1 disabled:text-slate-500"
            >
              <Eye className="w-3 h-3" /> Preview Package
            </button>
          </div>

          {assembly ? (
            <div className="flex gap-4">
              <div className="w-36 h-28 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center">
                <FileText className="w-10 h-10 text-slate-300" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-xs text-slate-800">
                  {consentForm?.titleEn || packageTitle}
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {consentForm
                    ? `${consentForm.formType.replace(/_/g, " ")} • v${consentForm.version} • ${consentForm.riskLevel} risk`
                    : "Procedure knowledge package pending clinical review."}
                </p>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <p className="text-slate-500">Language</p>
                    <p className="font-semibold text-slate-700">
                      {patient?.languagePreference === "ar" ? "Arabic Set" : "Bilingual Set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Reading Level</p>
                    <p className="font-semibold text-slate-700">Grade 6</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Format</p>
                    <p className="font-semibold text-slate-700">
                      {assembly.educationMaterials.some((e: ClinicalKnowledgeEducationMaterial) => e.assetType === "VIDEO")
                        ? "Video + Illustrated"
                        : "Illustrated"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Eq. Time</p>
                    <p className="font-semibold text-slate-700">
                      ~{assembly.educationMaterials.reduce((acc: number, e: ClinicalKnowledgeEducationMaterial) => acc + (e.durationMinutes || 0), 0) || 15} min
                    </p>
                  </div>
                </div>
                {!hasConsentContent && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 text-red-700 text-[11px]">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>
                      No consent form content is available for this package. Sending is blocked until real sections,
                      risks, and benefits are loaded.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-2 border-t border-slate-100">
                  <PackageStat value={consentSections.length} label="Sections" />
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

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    uppercase={false}
                    disabled={!assembly}
                    onClick={() => setPreviewOpen(true)}
                    className="text-[11px] border-slate-200"
                  >
                    <Eye className="w-3 h-3 mr-1" /> Preview patient-facing consent
                  </Button>
                  <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                    <Checkbox
                      checked={state.previewReviewed}
                      onChange={() => onMarkPreviewReviewed?.()}
                      disabled={!assembly || state.previewReviewed || !hasConsentContent}
                    />
                    I have reviewed the patient preview
                  </label>
                </div>

                {assembly.educationMaterials.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-[11px] font-semibold text-slate-700 mb-2">
                      Education materials
                    </h4>
                    <ul className="space-y-1">
                      {assembly.educationMaterials.map((material: ClinicalKnowledgeEducationMaterial) => (
                        <li
                          key={material.id}
                          className="flex items-center justify-between text-[10px] text-slate-600 p-2 rounded border border-slate-100"
                        >
                          <span className="font-medium text-slate-700 truncate">
                            {lang === "ar" && material.titleAr ? material.titleAr : material.titleEn}
                          </span>
                          <span className="shrink-0">
                            {material.status === "PUBLISHED" ? (
                              <Badge className="bg-green-100 text-green-700">Approved</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700">Draft</Badge>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {assembly.illustrations.filter((i) => i.imageReviewStatus === "approved" && i.patientFacing).length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-[11px] font-semibold text-slate-700 mb-2">
                      Approved patient-facing illustrations
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {assembly.illustrations
                        .filter((i) => i.imageReviewStatus === "approved" && i.patientFacing)
                        .map((illustration) => (
                          <div key={illustration.id} className="space-y-1">
                            <span className="text-[10px] font-medium text-slate-700 truncate block">
                              {illustration.procedureNameEn}
                            </span>
                            {(illustration.procedureImageUrl || illustration.anatomyImageUrl) && (
                              /* eslint-disable-next-line @next/next/no-img-element -- approved educational illustration preview */
                              <img
                                src={illustration.procedureImageUrl || illustration.anatomyImageUrl || ""}
                                alt={illustration.procedureNameEn}
                                className="w-full h-24 object-contain rounded border border-slate-200 bg-slate-50"
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {state.reviewMode &&
                  assembly.illustrations.filter((i) => i.imageReviewStatus !== "approved").length > 0 && (
                    <div className="pt-3 border-t border-dashed border-slate-200">
                      <h4 className="text-[11px] font-semibold text-amber-700 mb-2">
                        Internal review — draft illustrations
                      </h4>
                      <div className="grid grid-cols-2 gap-3 opacity-70">
                        {assembly.illustrations
                          .filter((i) => i.imageReviewStatus !== "approved")
                          .map((illustration) => (
                            <div key={illustration.id} className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-medium text-slate-700 truncate">
                                  {illustration.procedureNameEn}
                                </span>
                                <Badge className="bg-amber-100 text-amber-700">Draft</Badge>
                              </div>
                              {(illustration.procedureImageUrl || illustration.anatomyImageUrl) && (
                                /* eslint-disable-next-line @next/next/no-img-element -- internal draft illustration preview */
                                <img
                                  src={illustration.procedureImageUrl || illustration.anatomyImageUrl || ""}
                                  alt={illustration.procedureNameEn}
                                  className="w-full h-24 object-contain rounded border border-slate-200 bg-slate-50"
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <EmptyState message="Select a patient, encounter, and procedure to load the Clinical Knowledge Package." />
          )}
          <p className="text-[9px] text-slate-500 mt-2">
            {assembly
              ? `Last updated: ${new Date(assembly.assembledAt).toLocaleString()}`
              : "Knowledge package not yet resolved."}
          </p>
        </Card>

        {/* Readiness Checklist */}
        <Card className="space-y-2">
          <h3 className="font-semibold text-xs text-slate-800">Readiness Checklist</h3>
          <div className="flex items-center gap-3">
            <ProgressRing percentage={readiness.progressPercentage} />
            <div>
              <p className="text-xl font-bold text-blue-600">{readiness.progressPercentage}%</p>
              <p className="text-[9px] text-slate-500">
                {readiness.completedChecks} of {readiness.totalChecks} steps
              </p>
            </div>
          </div>
          <div className="space-y-1 text-[11px]">
            {checklistItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <ChecklistDot done={item.done} />
                <span className={item.done ? "text-slate-700" : "text-slate-500"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <Button
            variant="brand"
            size="sm"
            fullWidth
            disabled={sendDisabled}
            onClick={onSend}
            className="py-2 rounded-lg text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            {sendLoading ? "Sending…" : "Send to Patient"}
          </Button>
          {sendReason && <p className="text-[9px] text-slate-500 text-center">{sendReason}</p>}
          <Button
            variant="outline"
            size="sm"
            fullWidth
            disabled={state.draftApproved}
            onClick={onApproveDraft}
            className="py-1.5 rounded-lg border-slate-200 text-xs font-medium"
          >
            {state.draftApproved ? "Draft Approved" : "Save Draft"}
          </Button>
          {!state.draftApproved && (
            <p className="text-[9px] text-slate-500 text-center">Draft save is not persisted in this release.</p>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Decision Support & Alerts */}
        <Card className="space-y-2">
          <h3 className="font-semibold text-xs text-slate-800">Decision Support &amp; Alerts</h3>
          <div className="space-y-1.5">
            {assembly?.blockers.length ? (
              assembly.blockers.map((blocker: ConsentBlocker) => (
                <div key={blocker.key} className="flex items-start gap-2 p-2 rounded-lg bg-red-50">
                  <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-[1px]" />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-red-700">Consent Blocker</p>
                    <p className="text-[9px] text-red-700">
                      {lang === "ar" && blocker.messageAr ? blocker.messageAr : blocker.messageEn}
                    </p>
                  </div>
                </div>
              ))
            ) : null}

            {assembly?.suggestions.length ? (
              assembly.suggestions.map((s: ClinicalSuggestion) => (
                <div
                  key={s.id}
                  className={[
                    "flex items-start gap-2 p-2 rounded-lg",
                    s.severity === "critical"
                      ? "bg-red-50"
                      : s.severity === "warning"
                        ? "bg-yellow-50"
                        : "bg-blue-50",
                  ].join(" ")}
                >
                  <FilePlus
                    className={[
                      "w-3 h-3 shrink-0 mt-[1px]",
                      s.severity === "critical"
                        ? "text-red-500"
                        : s.severity === "warning"
                          ? "text-yellow-600"
                          : "text-blue-500",
                    ].join(" ")}
                  />
                  <div className="flex-1">
                    <p
                      className={[
                        "text-[11px] font-semibold",
                        s.severity === "critical"
                          ? "text-red-700"
                          : s.severity === "warning"
                            ? "text-yellow-800"
                            : "text-blue-800",
                      ].join(" ")}
                    >
                      {s.type.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </p>
                    <p
                      className={[
                        "text-[9px]",
                        s.severity === "critical"
                          ? "text-red-600"
                          : s.severity === "warning"
                            ? "text-yellow-700"
                            : "text-blue-600",
                      ].join(" ")}
                    >
                      {lang === "ar" && s.messageAr ? s.messageAr : s.messageEn}
                    </p>
                  </div>
                </div>
              ))
            ) : null}

            {!assembly?.blockers.length && !assembly?.suggestions.length && (
              <>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50">
                  <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-[1px]" />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-red-700">High-Risk Procedure</p>
                    <p className="text-[9px] text-red-700">
                      {assembly
                        ? "Risk assessment will appear once the knowledge package is resolved."
                        : "Select a procedure to view risk assessment."}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50">
                  <FilePlus className="w-3 h-3 text-yellow-600 shrink-0 mt-[1px]" />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-yellow-800">Additional Consent Items</p>
                    <p className="text-[9px] text-yellow-700">No additional items detected.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-50">
                  <User className="w-3 h-3 text-blue-500 shrink-0 mt-[1px]" />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-blue-800">Patient Preference</p>
                    <p className="text-[9px] text-blue-600">
                      {patient?.languagePreference === "ar" ? "Prefers Arabic explanations." : "Language preference not set."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Clinical Timeline */}
        <Card className="space-y-2">
          <h3 className="font-semibold text-xs text-slate-800">Clinical Timeline</h3>
          <div className="space-y-0 text-[11px]">
            {timeline.length > 0 ? (
              timeline.map((event, idx) => {
                const done = event.status === "completed";
                const isLast = idx === timeline.length - 1;
                return (
                  <div key={event.id} className="flex gap-2 items-start">
                    <div className="flex flex-col items-center">
                      <div
                        className={[
                          "w-2 h-2 rounded-full border-2 border-blue-600 bg-white flex-shrink-0",
                          done && "bg-blue-600",
                        ].join(" ")}
                      />
                      {!isLast && (
                        <div
                          className={[
                            "w-0.5 min-h-[14px] bg-slate-200",
                            done && "bg-blue-600",
                          ].join(" ")}
                        />
                      )}
                    </div>
                    <div className={["pb-1", !done && "text-slate-500"].join(" ")}>
                      <p className="font-medium">
                        {lang === "ar" && event.summaryAr ? event.summaryAr : event.summaryEn}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              [
                { label: "Patient Registered", done: !!patient },
                { label: "Encounter Started", done: !!encounter },
                { label: "Procedure Selected", done: !!assembly },
                { label: "Waiting for Consent", done: false },
                { label: "Patient Signed", done: false },
              ].map((item, idx, arr) => {
                const isLast = idx === arr.length - 1;
                return (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex flex-col items-center">
                      <div
                        className={[
                          "w-2 h-2 rounded-full border-2 border-blue-600 bg-white flex-shrink-0",
                          item.done && "bg-blue-600",
                          !item.done && "border-slate-300 bg-white",
                        ].join(" ")}
                      />
                      {!isLast && (
                        <div
                          className={[
                            "w-0.5 min-h-[14px] bg-slate-200",
                            item.done && "bg-blue-600",
                          ].join(" ")}
                        />
                      )}
                    </div>
                    <div className={["pb-1", !item.done && "text-slate-500"].join(" ")}>
                      <p className="font-medium">{item.label}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Task Metrics + Audit */}
        <div className="space-y-3">
          <Card>
            <h3 className="font-semibold text-xs mb-1.5 text-slate-800">Task Metrics (Today)</h3>
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
          </Card>
          <Card>
            <h3 className="font-semibold text-xs mb-1 text-slate-800">Audit &amp; Evidence</h3>
            <p className="text-[10px] text-slate-500">
              All actions are securely recorded and tamper-evident.
            </p>
            <button
              type="button"
              disabled
              className="mt-1.5 text-[10px] text-blue-600 font-medium flex items-center gap-1 disabled:text-slate-500"
            >
              <Download className="w-[11px] h-[11px]" /> Export Evidence
            </button>
            <p className="text-[9px] text-slate-500 mt-1">Export not available in this release.</p>
          </Card>
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

      {/* Footer */}
      <footer className="text-center text-[9px] text-slate-500 pt-2">
        © 2025 WathiqCare. All rights reserved. | Privacy Policy | Terms of Use | Enterprise Grade
        Security &amp; Compliance
      </footer>
    </div>
  );
}
