"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GitBranch,
  Plus
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/ui/StatusBadge";
import KPICard from "@/components/ui/KPICard";
import WorkflowProgress from "@/components/ui/WorkflowProgress";
import { buildMetadataWorkflowProgress } from "@/lib/workflowProgress";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type WorkflowCase = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

const STAGE_KEYS = [
  "medical_assessment",
  "legal_capacity_check",
  "authorized_signatory_identification",
  "discharge_plan_preparation",
  "forms_and_consent_presentation",
  "approval_or_refusal_path",
  "legal_escalation_if_needed",
  "final_verification",
  "execute_discharge_or_hold",
];

export default function WorkflowPage() {
  const { t, lang, isRtl } = useI18n();
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

  const workflowCases = useMemo(
    () =>
      cases.map((caseItem) => ({
        caseItem,
        workflow: buildMetadataWorkflowProgress({
          caseId: caseItem.id,
          status: caseItem.status,
          patientName: caseItem.patientName,
          metadata: caseItem.metadata,
          clickable: true,
        }),
      })),
    [cases]
  );

  const stageCounts = useMemo(() => {
    return STAGE_KEYS.reduce<Record<string, number>>((accumulator, stageKey) => {
      accumulator[stageKey] = workflowCases.filter(({ workflow }) => workflow.currentStepId === stageKey).length;
      return accumulator;
    }, {});
  }, [workflowCases]);

  return (
    <AuthGuard>
      <AppShell
        title={t("workflow.pageTitle")}
        subtitle={t("workflow.pageSubtitle")}
        actions={
          <>
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {t("newCase.create")}
            </Link>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <Activity className="h-4 w-4" />
              {t("nav.cases")}
            </Link>
          </>
        }
      >
        {/* Workflow Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            label={t("workflow.kpi.totalWorkflows")}
            value={loading ? "-" : stats.total}
            icon={<GitBranch className="h-5 w-5" />}
            variant="default"
          />
          <KPICard
            label={t("workflow.kpi.activeWorkflows")}
            value={loading ? "-" : stats.active}
            icon={<Activity className="h-5 w-5" />}
            variant="primary"
          />
          <KPICard
            label={t("legalEscalation.status.active")}
            value={loading ? "-" : stats.escalated}
            icon={<AlertCircle className="h-5 w-5" />}
            variant="danger"
          />
          <KPICard
            label={t("workflow.kpi.completedWorkflows")}
            value={loading ? "-" : stats.completed}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
        </div>

        {/* Workflow Cases */}
        <div className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{t("workflow.filterAll")}</h2>

          {loading ? (
            <p className="text-sm text-slate-600">{t("workflow.loadingCases")}</p>
          ) : cases.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <GitBranch className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">{t("workflow.noCases")}</p>
              <Link
                href="/cases/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                {t("cases.newCase")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {workflowCases.map(({ caseItem, workflow }) => {
                const currentStep = workflow.steps.find((step) => step.id === workflow.currentStepId);

                return (
                  <article
                    key={caseItem.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {caseItem.caseNumber || caseItem.id.slice(0, 8)}
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

                        <p className="mt-1.5 text-sm text-slate-700">
                          Patient: <span className="font-medium">{caseItem.patientName || "—"}</span>
                        </p>

                        {currentStep ? (
                          <p className="mt-2 text-xs text-slate-600">
                            {t("workflow.panel.nextAction")}:{" "}
                            <span className="font-medium">
                              {lang === "ar" ? currentStep.titleAr : currentStep.titleEn}
                            </span>
                          </p>
                        ) : null}

                        {workflow.steps.length > 0 ? (
                          <WorkflowProgress
                            className="mt-3 border-0 bg-transparent p-0"
                            steps={workflow.steps}
                            language={lang}
                            direction={isRtl ? "rtl" : "ltr"}
                            currentStepId={workflow.currentStepId}
                          />
                        ) : null}

                        {caseItem.createdAt && (
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(caseItem.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/cases/${caseItem.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                      >
                        {t("workflow.viewDetails")}
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
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t("workflow.panel.title")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STAGE_KEYS.map((stageKey) => {
              return (
                <div key={stageKey} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-700">
                    {t(`workflow.stage.${stageKey}`)}
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {stageCounts[stageKey] || 0}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
