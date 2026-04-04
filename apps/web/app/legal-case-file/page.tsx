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

// ---------------- CONSTANTS ----------------
const REFUSAL_STATES = new Set([
  "PATIENT_REFUSED",
  "REFUSED_TO_SIGN",
  "UNABLE_TO_SIGN",
  "ESCALATED",
]);

// ---------------- API ----------------
async function generateLegalPackage(caseId: string) {
  const res = await fetch(
    `${API_BASE_URL}/api/cases/${caseId}/legal-package`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error("Failed to generate legal package");
  return res.json();
}

// ---------------- COMPONENT ----------------
export default function LegalCaseFilePage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [dashboard, setDashboard] =
    useState<LegalControlDashboard | null>(null);

  const [summaries, setSummaries] =
    useState<Record<string, LegalCaseSummary>>({});

  const [legalPackages, setLegalPackages] =
    useState<Record<string, LegalPackageMeta | null>>({});

  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

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
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      >
        {/* Dashboard */}
        {dashboard && (
          <div className="grid gap-3 xl:grid-cols-4 mb-5">
            <StatCard title="Discharge" value={dashboard.total_discharge_decisions} icon={<ShieldCheck />} />
            <StatCard title="Refused" value={dashboard.total_refused} icon={<ScrollText />} />
            <StatCard title="Promissory" value={dashboard.promissory_notes_generated} icon={<FolderArchive />} />
            <StatCard title="Exposure" value={Math.round(dashboard.total_estimated_financial_exposure)} icon={<ShieldCheck />} />
          </div>
        )}

        {/* Cases */}
        {rows.map(({ item, workflow }) => {
          const summary = summaries[item.id];
          const legalPackage = legalPackages[item.id];
          const isBusy = busyCaseId === item.id;

          return (
            <div key={item.id} className="card">

              <h2>{item.caseNumber || item.id}</h2>
              <p>Patient: {item.patientName || "-"}</p>

              <WorkflowProgress
                steps={workflow.steps}
                currentStepId={workflow.currentStepId}
              />

              {/* Legal Package */}
              <div className="mt-2">
                {legalPackage ? (
                  <>
                    <span>Version: {legalPackage.version}</span>
                    <a href={legalPackage.download_url || "#"} target="_blank">
                      Download
                    </a>
                  </>
                ) : (
                  <span>No package</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">

                <button
                  disabled={isBusy}
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
                  disabled={isBusy}
                  onClick={() =>
                    runAction(item.id, () =>
                      legalOrchestrationService.quickPrepareLegalEvent(item.id, {})
                    )
                  }
                >
                  Prepare
                </button>

                <Link href={`/cases/${item.id}`}>
                  Open
                </Link>
              </div>
            </div>
          );
        })}
      </AppShell>
    </AuthGuard>
  );
}