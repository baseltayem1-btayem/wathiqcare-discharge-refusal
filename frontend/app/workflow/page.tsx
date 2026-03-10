"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { 
  FileText, 
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  GitBranch
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/ui/StatusBadge";
import StatCard from "@/components/ui/StatCard";
import { apiFetch } from "@/utils/api";

type WorkflowCase = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

const STAGE_LABELS: Record<string, string> = {
  medical_discharge_decision: "Medical Discharge Decision",
  initial_communication: "Initial Communication",
  support_and_intervention: "Support & Intervention",
  refusal_form: "Refusal Form Generation",
  official_notification: "Official Notification",
  escalation: "Legal Escalation",
  closed: "Closed",
};

export default function WorkflowPage() {
  const [cases, setCases] = useState<WorkflowCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    try {
      const data = await apiFetch<WorkflowCase[]>("/api/cases?limit=100");
      setCases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load cases:", error);
      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const active = cases.filter(
      (c) => (c.status || "").toUpperCase() === "IN_PROGRESS" || 
             (c.status || "").toLowerCase() === "active"
    ).length;
    
    const completed = cases.filter(
      (c) => (c.status || "").toUpperCase() === "CLOSED"
    ).length;
    
    const escalated = cases.filter(
      (c) => (c.status || "").toLowerCase() === "escalated" ||
             c.metadata?.escalated_at
    ).length;

    return { active, completed, escalated, total: cases.length };
  }, [cases]);

  function getWorkflowStage(caseItem: WorkflowCase): string {
    const metadata = caseItem.metadata || {};
    
    if (metadata.escalated_at) return "escalation";
    if (metadata.financial_notice_generated_at) return "official_notification";
    if (metadata.refusal_form_generated_at) return "refusal_form";
    if (metadata.support_intervention_at) return "support_and_intervention";
    if (metadata.initial_communication_at) return "initial_communication";
    if (metadata.discharge_decision_at) return "medical_discharge_decision";
    
    return "medical_discharge_decision";
  }

  return (
    <AuthGuard>
      <AppShell
        title="Discharge Workflow"
        subtitle="Track and manage discharge refusal workflow progress across all cases."
        actions={
          <>
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              New Case
            </Link>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <Activity className="h-4 w-4" />
              All Cases
            </Link>
          </>
        }
      >
        {/* Workflow Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Workflows"
            value={loading ? "-" : stats.total}
            icon={<GitBranch className="h-5 w-5" />}
            variant="default"
          />
          <StatCard
            title="Active Workflows"
            value={loading ? "-" : stats.active}
            icon={<Activity className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Escalated"
            value={loading ? "-" : stats.escalated}
            icon={<AlertCircle className="h-5 w-5" />}
            variant="error"
          />
          <StatCard
            title="Completed"
            value={loading ? "-" : stats.completed}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
        </div>

        {/* Workflow Cases */}
        <div className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Active Workflows</h2>

          {loading ? (
            <p className="text-sm text-slate-600">Loading workflow cases...</p>
          ) : cases.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <GitBranch className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">No workflow cases found</p>
              <p className="mt-1 text-xs text-slate-500">Create a new case to start a workflow</p>
              <Link
                href="/cases/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Create New Case
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((caseItem) => {
                const stage = getWorkflowStage(caseItem);
                const stageLabel = STAGE_LABELS[stage] || stage;
                
                return (
                  <article
                    key={caseItem.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {caseItem.caseNumber || caseItem.id}
                          </h3>
                          <StatusBadge
                            variant={
                              (caseItem.status || "").toLowerCase() === "escalated" ? "escalated" :
                              (caseItem.status || "").toUpperCase() === "CLOSED" ? "completed" :
                              "active"
                            }
                            label={(caseItem.status || "draft").toUpperCase()}
                          />
                        </div>
                        
                        <p className="mt-1 text-sm text-slate-700">
                          Patient: <span className="font-medium">{caseItem.patientName || "Unknown"}</span>
                        </p>
                        
                        <div className="mt-2 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <p className="text-xs text-slate-600">
                            Current Stage: <span className="font-medium">{stageLabel}</span>
                          </p>
                        </div>

                        {caseItem.createdAt && (
                          <p className="mt-1 text-xs text-slate-500">
                            Created: {new Date(caseItem.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/cases/${caseItem.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View Details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Workflow Stages Overview */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Workflow Stages</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium text-slate-700">{label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {cases.filter((c) => getWorkflowStage(c) === key).length} cases
                </p>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
