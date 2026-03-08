"use client";

import { AlertTriangle, CheckCircle2, Circle, Clock3, ShieldAlert } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { DischargeWorkflow } from "@/types/dischargeWorkflow";

type Props = {
  workflow: DischargeWorkflow | null;
};

function formatDate(raw: string | null, locale: string): string {
  if (!raw) {
    return "-";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleString(locale);
}

function stageLabel(key: string, fallback: string, t: (key: string) => string): string {
  const translated = t(`workflow.stage.${key}`);
  return translated.startsWith("workflow.stage.") ? fallback : translated;
}

export default function WorkflowTimelinePanel({ workflow }: Props) {
  const { t, locale } = useI18n();

  if (!workflow) {
    return (
      <section className="rounded-2xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900">{t("workflow.panel.title")}</h2>
        <p className="mt-3 text-sm text-slate-500">{t("workflow.panel.empty")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">{t("workflow.panel.title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            <Clock3 className="h-3.5 w-3.5" />
            {stageLabel(workflow.current_stage, workflow.current_stage_label, t)}
          </span>
          {workflow.escalation_required ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
              <ShieldAlert className="h-3.5 w-3.5" />
              {t("workflow.panel.escalationRequired")}
            </span>
          ) : null}
        </div>
      </div>

      {workflow.escalation_required && workflow.escalation_due_at ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <div className="inline-flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            {t("workflow.panel.persisted24h")}
          </div>
          <p className="mt-1 text-xs text-rose-700">
            {t("workflow.panel.escalationDue", { date: formatDate(workflow.escalation_due_at, locale) })}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{t("workflow.panel.responsibleDepartment")}</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{workflow.responsible_department || t("common.na")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{t("workflow.panel.responsiblePerson")}</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{workflow.responsible_person || t("common.na")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{t("workflow.panel.nextAction")}</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{workflow.next_action || t("common.na")}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p className="font-semibold text-slate-900">{t("workflow.panel.policyValidation")}</p>
        <p className="mt-1">
          {workflow.policy_validation.can_generate
            ? t("workflow.panel.policyReady")
            : t("workflow.panel.policyMissing", { count: workflow.policy_validation.missing_fields.length })}
        </p>
      </div>

      <ol className="mt-5 space-y-2">
        {workflow.timeline.map((item) => (
          <li key={item.key} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            {item.status === "completed" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
            ) : item.status === "current" ? (
              <Clock3 className="mt-0.5 h-4 w-4 text-cyan-700" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 text-slate-400" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{stageLabel(item.key, item.label, t)}</p>
              <p className="text-xs text-slate-600">{formatDate(item.timestamp, locale)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
