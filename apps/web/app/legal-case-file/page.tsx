"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FolderArchive,
  RefreshCw,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import WorkflowProgress from "@/components/ui/WorkflowProgress";
import StatCard from "@/components/ui/StatCard";
import { useUiPermissions } from "@/hooks/useUiPermissions";

import { buildMetadataWorkflowProgress } from "@/lib/workflowProgress";
import { apiFetch } from "@/utils/api";

import {
  type LegalCaseSummary,
  type LegalControlDashboard,
  legalOrchestrationService,
} from "@/lib/services/legalOrchestration.service";

import { fetchLegalPackageMetadata } from "@/lib/services/legalPackage.service";

// ---------------- CONFIG ----------------
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000";

// ---------------- TYPES ----------------
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

type LegalPackageMeta = {
  version?: string | number | null;
  generated_at?: string | null;
  download_url?: string | null;
};

type LegalPanelItem = {
  label: string;
  satisfied: boolean;
  missingReason: string;
};

// ---------------- CONSTANTS ----------------
// const REFUSAL_STATES = new Set([
//   "PATIENT_REFUSED",
//   "REFUSED_TO_SIGN",
//   "UNABLE_TO_SIGN",
//   "ESCALATED",
// ]);

// ---------------- API ----------------
async function generateLegalPackage(caseId: string) {
  const res = await fetch(
    `${API_BASE_URL}/api/cases/${caseId}/legal-package`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error("Failed to generate legal package");
  return res.json();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function buildLegalPanelItems(item: CaseItem): LegalPanelItem[] {
  const metadata = asRecord(item.metadata);
  const workflow = asRecord(metadata?.workflow);
  const signature = asRecord(metadata?.signature);
  const witness = asRecord(metadata?.witness);

  const hasCaseData = Boolean(item.mrn && item.patientName && (item.attendingPhysician || workflow?.attending_physician));
  const hasPatientDecision = Boolean(signature?.outcome);
  const hasRiskExplanation = Boolean(workflow?.discussion_summary);
  const hasSignature = Boolean(signature?.signer_name || signature?.outcome);
  const hasWitness = Boolean(witness?.witness_name);
  const hasTimestamp = Boolean(workflow?.refusal_started_at || workflow?.discharge_decision_at);
  const hasPdfReady = Boolean(item.pdf_file);

  return [
    { label: "Case Data Complete", satisfied: hasCaseData, missingReason: "Case profile is incomplete." },
    { label: "Patient Decision Recorded", satisfied: hasPatientDecision, missingReason: "Patient decision is missing." },
    { label: "Risk Explanation Present", satisfied: hasRiskExplanation, missingReason: "Risk explanation is missing." },
    { label: "Signature Captured", satisfied: hasSignature, missingReason: "Signature is not recorded." },
    { label: "Witness Recorded", satisfied: hasWitness, missingReason: "Witness details are missing." },
    { label: "Timestamp Complete", satisfied: hasTimestamp, missingReason: "Required legal timestamps are missing." },
    { label: "PDF Ready", satisfied: hasPdfReady, missingReason: "PDF binary is missing or not ready." },
  ];
}

// ---------------- COMPONENT ----------------
export default function LegalCaseFilePage() {
  const permissions = useUiPermissions();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [dashboard, setDashboard] =
    useState<LegalControlDashboard | null>(null);

  const [, setSummaries] =
    useState<Record<string, LegalCaseSummary>>({});

  const [legalPackages, setLegalPackages] =
    useState<Record<string, LegalPackageMeta | null>>({});

  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);

  const canLegalReview = permissions.can("legal.review");
  const canLegalApprove = permissions.can("legal.approve.readiness");
  const canDownloadFinal = permissions.can("documents.download.final");

  // ---------------- LOAD ----------------
  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const loadedCases =
      (await apiFetch<CaseItem[]>("/api/cases?limit=100").catch(() => [])) || [];

    setCases(loadedCases);

    const dash = await legalOrchestrationService
      .getControlDashboard()
      .catch(() => null);

    setDashboard(dash);

    // summaries
    const summariesEntries = await Promise.all(
      loadedCases.map(async (c) => {
        const summary = await legalOrchestrationService
          .getCaseSummary(c.id)
          .catch(() => ({ event: null, counts: {} }));

        return [c.id, summary] as const;
      })
    );

    setSummaries(Object.fromEntries(summariesEntries));

    // legal packages
    const packagesEntries = await Promise.all(
      loadedCases.map(async (c) => {
        try {
          const meta = await fetchLegalPackageMetadata(c.id);
          return [c.id, meta as LegalPackageMeta];
        } catch {
          return [c.id, null];
        }
      })
    );

    setLegalPackages(Object.fromEntries(packagesEntries));
  }
  // ---------------- ACTIONS ----------------
  async function runAction(
    caseId: string,
    action: () => Promise<void>,
    successMsg?: string
  ) {
    setBusyCaseId(caseId);
    try {
      await action();
      await loadData();
      if (successMsg) alert(successMsg);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusyCaseId(null);
    }
  }

  // ---------------- DERIVED ----------------
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

  // ---------------- UI ----------------
  return (
    <AuthGuard>
      <AppShell
        title="Legal Case File"
        subtitle="Evidence and legal workflow dashboard"
        actions={
          <button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      >
        {/* Dashboard */}
        {dashboard && (
          <div className="mb-5 grid gap-3 xl:grid-cols-4">
            <StatCard title="Discharge" value={dashboard.total_discharge_decisions} icon={<ShieldCheck />} />
            <StatCard title="Refused" value={dashboard.total_refused} icon={<ScrollText />} />
            <StatCard title="Promissory" value={dashboard.promissory_notes_generated} icon={<FolderArchive />} />
            <StatCard title="Exposure" value={Math.round(dashboard.total_estimated_financial_exposure)} icon={<ShieldCheck />} />
          </div>
        )}

        {/* Cases */}
        {rows.map(({ item, workflow }) => {
          const legalPackage = legalPackages[item.id];
          const isBusy = busyCaseId === item.id;
          const legalPanelItems = buildLegalPanelItems(item);
          const missingItems = legalPanelItems.filter((panel) => !panel.satisfied);
          const readyForFinalization = missingItems.length === 0;

          return (
            <div key={item.id} className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)]">

              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{item.caseNumber || item.id}</h2>
                  <p className="mt-1 text-sm text-slate-600">Patient: <span className="font-medium text-slate-800">{item.patientName || "-"}</span></p>
                </div>
                <Link
                  href={`/cases/${item.id}`}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Open Case
                </Link>
              </div>

              <WorkflowProgress
                steps={workflow.steps}
                currentStepId={workflow.currentStepId}
              />

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 text-sm font-semibold text-slate-900">Legal Readiness Panel</div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {legalPanelItems.map((panel) => (
                    <div key={panel.label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs">
                      <span className="text-slate-700">{panel.label}</span>
                      <span className={panel.satisfied ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                        {panel.satisfied ? "PASS" : "MISSING"}
                      </span>
                    </div>
                  ))}
                </div>
                {readyForFinalization ? (
                  <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                    Ready for Legal Finalization
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <div className="font-semibold">Final legal approval is blocked.</div>
                    <ul className="mt-1 space-y-1">
                      {missingItems.map((missing) => (
                        <li key={missing.label}>• {missing.missingReason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Legal Package */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                {legalPackage ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-slate-700">Version: <span className="font-semibold text-slate-900">{legalPackage.version}</span></span>
                    {canDownloadFinal ? (
                      <a
                        href={legalPackage.download_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Download Package
                      </a>
                    ) : (
                      <span className="text-xs text-amber-700">{permissions.deniedMessage}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-slate-600">No legal package generated yet.</span>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">

                <button
                  disabled={isBusy || !canLegalApprove}
                  title={!canLegalApprove ? permissions.deniedMessage : undefined}
                  className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() =>
                    runAction(item.id, () =>
                      generateLegalPackage(item.id),
                      "Legal package generated"
                    )
                  }
                >
                  Generate Package
                </button>

                <button
                  disabled={isBusy || !canLegalReview}
                  title={!canLegalReview ? permissions.deniedMessage : undefined}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() =>
                    runAction(item.id, () =>
                      legalOrchestrationService.quickPrepareLegalEvent(item.id, {})
                    )
                  }
                >
                  Prepare
                </button>
              </div>
            </div>
          );
        })}
      </AppShell>
    </AuthGuard>
  );
}