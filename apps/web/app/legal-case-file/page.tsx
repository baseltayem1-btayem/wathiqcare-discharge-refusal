"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderArchive,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  User,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import WorkflowProgress from "@/components/ui/WorkflowProgress";
import StatCard from "@/components/ui/StatCard";
import { buildMetadataWorkflowProgress } from "@/lib/workflowProgress";
import { apiFetch } from "@/utils/api";
import {
  type LegalCaseSummary,
  type LegalControlDashboard,
} from "@/lib/services/legalOrchestration.service";
import { legalOrchestrationService } from "@/lib/services/legalOrchestration.service";
import { fetchLegalPackageMetadata } from "@/lib/services/legalPackage.service";
// --- LEGAL PACKAGE GENERATION ---
async function generateLegalPackage(caseId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  const res = await fetch(
    `${baseUrl}/api/cases/${caseId}/legal-package`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Failed to generate legal package");
  return res.json();
}

type CaseItem = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
  patient_name?: string | null;
  mrn?: string | null;
  attendingPhysician?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  signer_name?: string | null;
  signer_role?: string | null;
  signed_at?: string | null;
  pdf_file?: string | null;
  _count?: {
    documents?: number;
    auditLogs?: number;
  };
};

/** Refusal states where financial acknowledgment is allowed */
const REFUSAL_STATES = new Set([
  "PATIENT_REFUSED",
  "REFUSED_TO_SIGN",
  "UNABLE_TO_SIGN",
  "ESCALATED",
]);

type LegalPackageMeta = {
  version?: string | number | null;
  generated_at?: string | null;
  download_url?: string | null;
};

export default function LegalCaseFilePage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [dashboard, setDashboard] = useState<LegalControlDashboard | null>(null);
  const [summaries, setSummaries] = useState<Record<string, LegalCaseSummary>>({});
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [legalPackages, setLegalPackages] = useState<Record<string, LegalPackageMeta | null>>({});

  useEffect(() => {
    void loadLegalCaseFileData();
  }, []);

  async function loadLegalCaseFileData() {
    const loadedCases = await apiFetch<CaseItem[]>("/api/cases?limit=100")
      .then((data) => (Array.isArray(data) ? data : []))
      .catch(() => []);
    setCases(loadedCases);

    const metricData = await legalOrchestrationService
      .getControlDashboard()
      .catch(() => null);
    setDashboard(metricData);

    const perCase = await Promise.all(
      loadedCases.map(async (item) => {
        const summary = await legalOrchestrationService
          .getCaseSummary(item.id)
          .catch(() => ({ event: null, counts: {} }));
        return [item.id, summary] as const;
      })
    );
    setSummaries(Object.fromEntries(perCase));

    // Fetch legal package metadata for each case
    const legalPackagesEntries = await Promise.all(
      loadedCases.map(async (item) => {
        try {
          const meta = await fetchLegalPackageMetadata(item.id);
          return [item.id, meta as LegalPackageMeta];
        } catch {
          return [item.id, null];
        }
      })
    );
    setLegalPackages(Object.fromEntries(legalPackagesEntries));
  }

  async function handlePrepare(caseItem: CaseItem) {
    setBusyCaseId(caseItem.id);
    try {
      await legalOrchestrationService.quickPrepareLegalEvent(caseItem.id, {
        mrn: caseItem.mrn,
        physicianName: caseItem.attendingPhysician || caseItem.signer_name,
        diagnosisSummary:
          (typeof caseItem.metadata?.workflow === "object" && caseItem.metadata?.workflow
            ? String((caseItem.metadata.workflow as Record<string, unknown>).discussion_summary || "")
            : "") || "Discharge refusal legal workflow",
      });
      await loadLegalCaseFileData();
    } finally {
      setBusyCaseId(null);
    }
  }

  async function handleRecordPresentation(caseItem: CaseItem) {
    setBusyCaseId(caseItem.id);
    try {
      await legalOrchestrationService.recordNoticePresentation(caseItem.id, {
        mode: "tablet",
        language: "ar",
        notice_method: "in_person",
        presented_to_type: "patient",
        presented_to_name: caseItem.patientName || caseItem.patient_name || "Unknown",
        identity_verified: true,
        acknowledged_view: true,
        document_type: "master_document",
        viewed_duration_seconds: 60,
        interpreter_used: false,
      });
      await loadLegalCaseFileData();
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Notice presentation failed: ${err.message}`);
    } finally {
      setBusyCaseId(null);
    }
  }


  async function handleGenerateLegalPackage(caseId: string) {
    setBusyCaseId(caseId);
    try {
      await generateLegalPackage(caseId);
      await loadLegalCaseFileData();
      alert("Legal package generated successfully.");
    } catch (err) {
      alert("Failed to generate legal package.");
    } finally {
      setBusyCaseId(null);
    }
  }

  async function handleGenerateFinancialAck(caseItem: CaseItem) {
    const legalState = summaries[caseItem.id]?.event?.legal_state;
    if (!legalState || !REFUSAL_STATES.has(legalState)) {
      alert("Financial acknowledgment is only allowed after a refusal-related state (PATIENT_REFUSED, REFUSED_TO_SIGN, etc.).");
      return;
    }
    setBusyCaseId(caseItem.id);
    try {
      await legalOrchestrationService.generateFinancialAcknowledgment(caseItem.id, {
        guarantor: caseItem.signer_name || caseItem.patientName || "Unknown",
        relation_to_patient: caseItem.signer_role || "patient",
        coverage_status: "pending",
        daily_cost_estimate: 1500,
        total_estimated_exposure: 4500,
      });
      await loadLegalCaseFileData();
    } finally {
      setBusyCaseId(null);
    }
  }

  async function handleGeneratePromissory(caseItem: CaseItem) {
    setBusyCaseId(caseItem.id);
    try {
      await legalOrchestrationService.generatePromissoryNote(caseItem.id, {
        amount_numeric: 4500,
        debtor_name: caseItem.signer_name || caseItem.patientName || "Unknown",
        debtor_id: caseItem.mrn || "N/A",
        debtor_mobile: "N/A",
        debtor_address: "N/A",
        relation_to_patient: caseItem.signer_role || "patient",
        creditor_name: "WathiqCare Hospital",
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        issue_place: "Riyadh",
        issue_date: new Date().toISOString().slice(0, 10),
      });
      await loadLegalCaseFileData();
    } finally {
      setBusyCaseId(null);
    }
  }

  async function handleEscalationEvent(caseItem: CaseItem) {
    setBusyCaseId(caseItem.id);
    try {
      await legalOrchestrationService.createEscalationEvent(caseItem.id, {
        escalation_level: "care_team_reminder",
        hours_from_now: 2,
        target_role: "patient_affairs",
        notes: "Triggered manually from legal case file dashboard",
      });
      await loadLegalCaseFileData();
    } finally {
      setBusyCaseId(null);
    }
  }

  const rows = useMemo(
    () =>
      cases.map((item) => ({
        item,
        workflow: buildMetadataWorkflowProgress({
          caseId: item.id,
          status: item.status,
          patientName: item.patientName,
          patient_name: item.patient_name,
          signer_name: item.signer_name,
          signer_role: item.signer_role,
          signed_at: item.signed_at,
          pdf_file: item.pdf_file,
          metadata: item.metadata,
          clickable: true,
        }),
      })),
    [cases]
  );

  return (
    <AuthGuard>
      <AppShell
        title="Legal Case File"
        subtitle="Review documentation coverage and jump to evidence bundle generation for each case."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void loadLegalCaseFileData()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Legal Data
            </button>
            <Link
              href="/bundles"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <FolderArchive className="h-4 w-4" />
              Open Evidence Bundles
            </Link>
          </div>
        }
      >
        {dashboard ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Discharge Decisions"
              value={dashboard.total_discharge_decisions}
              icon={<ShieldCheck className="h-5 w-5" />}
              variant="default"
            />
            <StatCard
              title="Refused Cases"
              value={dashboard.total_refused}
              icon={<ScrollText className="h-5 w-5" />}
              variant="warning"
            />
            <StatCard
              title="Promissory Notes"
              value={dashboard.promissory_notes_generated}
              icon={<FolderArchive className="h-5 w-5" />}
              variant="primary"
            />
            <StatCard
              title="Estimated Exposure (SAR)"
              value={Math.round(dashboard.total_estimated_financial_exposure)}
              icon={<ShieldCheck className="h-5 w-5" />}
              variant="error"
            />
          </div>
        ) : null}

        <div className="space-y-3">
          {rows.map(({ item, workflow }) => {
            const summary = summaries[item.id];
            const legalState = summary?.event?.legal_state ?? "NOT_STARTED";
            const isExpanded = expandedCase === item.id;
            const counts = summary?.counts ?? {};

            const legalPackage = legalPackages[item.id];
            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-slate-900">{item.caseNumber || item.id}</h2>
                    <p className="mt-1 text-sm text-slate-600">Patient: {item.patientName || "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Status: {item.status || "-"} | Documents: {item._count?.documents || 0} | Audit logs: {item._count?.auditLogs || 0}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Legal State: <span className="font-medium text-slate-800">{legalState}</span> | Responses: {counts.responses || 0} | Evidence Packages: {counts.evidence_packages || 0}
                    </p>

                    {workflow.steps.length > 0 ? (
                      <WorkflowProgress
                        className="mt-3 border-0 bg-transparent p-0"
                        layout="scroll"
                        steps={workflow.steps}
                        language="en"
                        direction="ltr"
                        currentStepId={workflow.currentStepId}
                      />
                    ) : null}

                    {/* Legal Package Metadata */}
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">Legal Package</p>
                      {legalPackage ? (
                        <>
                          <span className="text-xs text-emerald-900">Generated: Yes</span>
                          <span className="ml-2 text-xs text-emerald-900">Version: {legalPackage.version}</span>
                          <span className="ml-2 text-xs text-emerald-900">Last Generated: {legalPackage.generated_at ? new Date(legalPackage.generated_at).toLocaleString() : "—"}</span>
                          <a
                            href={legalPackage.download_url ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                          >
                            Download PDF
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-emerald-700">Generated: No</span>
                      )}
                    </div>

                    {/* Legal State Timeline */}
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-700">Legal State Timeline</p>
                      {(summary?.event?.state_history || []).length > 0 ? (
                        <ol className="mt-2 space-y-1">
                          {(summary?.event?.state_history || []).map((entry, idx) => (
                            <li key={`${item.id}-state-${idx}`} className="text-xs text-slate-600">
                              <span className="font-medium text-slate-700">{entry.from || "START"}</span>
                              <span> → </span>
                              <span className="font-semibold text-slate-900">{entry.to}</span>
                              <span> • {new Date(entry.at).toLocaleString()}</span>
                              {entry.reason ? <span> • {entry.reason}</span> : null}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">No legal state transitions logged yet.</p>
                      )}
                    </div>

                    {/* Expandable Detail Panels Toggle */}
                    <button
                      onClick={() => setExpandedCase(isExpanded ? null : item.id)}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? "Hide" : "Show"} Presentation · Signer · Signature Panels
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3">

                        {/* ── Proof of Presentation Panel ── */}
                        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-cyan-700" />
                            <span className="text-xs font-semibold text-cyan-900">إثبات التبليغ / Proof of Presentation</span>
                          </div>
                          {counts.notice_presentations && counts.notice_presentations > 0 ? (
                            <p className="text-xs text-cyan-800">
                              <span className="font-medium">{counts.notice_presentations}</span> presentation record(s) logged for this case.
                              Identity verification and acknowledgment fields are captured in each record.
                            </p>
                          ) : (
                            <p className="text-xs text-cyan-700 italic">No notice presentation recorded yet. Use the button below to log a presentation.</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-800">
                              Notification State: {summary?.event?.notification_state || "N/A"}
                            </span>
                            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-800">
                              Legal State: {legalState}
                            </span>
                          </div>
                        </div>

                        {/* ── Signer Identity Panel ── */}
                        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-violet-700" />
                            <span className="text-xs font-semibold text-violet-900">هوية الموقِّع / Signer Identity</span>
                          </div>
                          {counts.responses && counts.responses > 0 ? (
                            <div className="space-y-1">
                              <p className="text-xs text-violet-800">
                                <span className="font-medium">{counts.responses}</span> response(s) recorded. Each response auto-creates a signer identity record
                                capturing: full name, Arabic name, ID type/number, nationality, address, legal capacity, consent text version.
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                                  Response State: {summary?.event?.patient_response_state || "N/A"}
                                </span>
                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                                  Signer: {item.signer_name || "—"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-violet-700 italic">No patient response recorded yet.</p>
                          )}
                        </div>

                        {/* ── Signature Summary Panel ── */}
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-700" />
                            <span className="text-xs font-semibold text-emerald-900">ملخص التوقيع / Signature Summary</span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                                Signature State: {summary?.event?.signature_state || "PENDING"}
                              </span>
                              {item.signed_at && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                                  Signed at: {new Date(item.signed_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-emerald-800">
                              Each captured signature is stored with SHA-256 hash, source mode (tablet/paper/remote),
                              document version, and optional witness ID — ensuring legal binding strength.
                            </p>
                            {summary?.event?.signature_state === "CAPTURED" && (
                              <p className="text-xs font-medium text-emerald-900 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Signature artifact captured and hash-verified.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Document Counts */}
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-xs font-semibold text-slate-700 mb-2">Document Counts</p>
                          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                            {[
                              ["Financial Acks", counts.financial_acknowledgments || 0],
                              ["Promissory Notes", counts.promissory_notes || 0],
                              ["Evidence Packages", counts.evidence_packages || 0],
                              ["Escalations", counts.escalations || 0],
                            ].map(([label, val]) => (
                              <div key={String(label)} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-center">
                                <p className="text-lg font-bold text-slate-900">{val}</p>
                                <p className="text-xs text-slate-500">{label}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void handlePrepare(item)}
                        disabled={busyCaseId === item.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300 px-3 py-1.5 text-sm font-medium text-cyan-800 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyCaseId === item.id ? "Preparing..." : "Prepare Legal Event"}
                      </button>
                      <button
                        onClick={() => void handleRecordPresentation(item)}
                        disabled={busyCaseId === item.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyCaseId === item.id ? "Recording..." : "Record Presentation"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void handleGenerateLegalPackage(item.id)}
                        disabled={busyCaseId === item.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyCaseId === item.id ? "Generating..." : "Generate Legal Package"}
                      </button>
                      <button
                        onClick={() => void handleGenerateFinancialAck(item)}
                        disabled={busyCaseId === item.id || !REFUSAL_STATES.has(legalState)}
                        title={!REFUSAL_STATES.has(legalState) ? "Only available after refusal state" : undefined}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyCaseId === item.id ? "Generating..." : "Generate Financial Ack"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void handleGeneratePromissory(item)}
                        disabled={busyCaseId === item.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyCaseId === item.id ? "Generating..." : "Generate Promissory Note"}
                      </button>
                      <button
                        onClick={() => void handleEscalationEvent(item)}
                        disabled={busyCaseId === item.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyCaseId === item.id ? "Escalating..." : "Create Escalation Event"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/cases/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open Case
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href="/bundles"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Bundles
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {cases.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No legal case files are available yet.
            </div>
          ) : null}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
