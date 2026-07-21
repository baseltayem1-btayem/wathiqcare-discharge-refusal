"use client";

import { Check, ListChecks, X, Minus } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { Readiness } from "../../hooks/useProductionWorkspace";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader } from "../WorkspaceAtoms";

function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="64" height="64" className="-rotate-90">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="#2563eb"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

const STATUS_TONE = {
  COMPLETE: "green" as const,
  BLOCKED: "red" as const,
  REQUIRED: "gold" as const,
  NOT_APPLICABLE: "slate" as const,
};

export function ReadinessChecklist({ readiness }: { readiness: Readiness }) {
  const { lang } = useI18n();
  const items = readiness.items;

  const blockerCount = items.filter((i) => i.status === "BLOCKED").length;
  const requiredCount = items.filter((i) => i.status === "REQUIRED").length;

  return (
    <WorkspaceCard className="overflow-hidden">
      <WorkspaceCardHeader
        icon={<ListChecks className="size-5" />}
        title={lang === "ar" ? "قائمة الجاهزية" : "Readiness checklist"}
        description={
          lang === "ar"
            ? "يجب اكتمال كل البوابات قبل إرسال جلسة التوقيع للمريض."
            : "Every gate must be complete before secure signing can be sent to the patient."
        }
        action={
          <WorkspaceBadge tone={readiness.sendReady ? "green" : blockerCount > 0 ? "red" : "gold"}>
            {readiness.sendReady
              ? lang === "ar" ? "جاهز للإرسال" : "Ready"
              : `${blockerCount + requiredCount} ${lang === "ar" ? "متبقي" : "left"}`}
          </WorkspaceBadge>
        }
      />
      <div className="space-y-4 px-5 py-5">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="relative shrink-0">
            <ProgressRing percentage={readiness.progressPercentage} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">
              {readiness.progressPercentage}%
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {readiness.completedChecks} / {readiness.totalChecks}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {lang === "ar"
                ? "التقدم عبر بوابات المراجعة والحوكمة والإرسال."
                : "Progress across review, governance, and dispatch gates."}
            </p>
            {readiness.notApplicableCount > 0 ? (
              <p className="mt-1 text-xs text-slate-400">
                {lang === "ar"
                  ? `${readiness.notApplicableCount} غير منطبق`
                  : `${readiness.notApplicableCount} not applicable`}
              </p>
            ) : null}
          </div>
        </div>

        {readiness.sendReady ? null : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {lang === "ar"
              ? "لا يمكن الإرسال حتى تتم معالجة جميع البوابات المحظورة أو المطلوبة."
              : "Send is blocked until all blocked or required gates are resolved."}
          </div>
        )}

        <div className="space-y-2">
          {items.map((item) => {
            const icon =
              item.status === "COMPLETE" ? (
                <Check className="size-3" />
              ) : item.status === "BLOCKED" ? (
                <X className="size-3" />
              ) : item.status === "NOT_APPLICABLE" ? (
                <Minus className="size-3" />
              ) : null;

            const statusClass =
              item.status === "COMPLETE"
                ? "bg-emerald-500 text-white"
                : item.status === "BLOCKED"
                  ? "bg-red-500 text-white"
                  : item.status === "NOT_APPLICABLE"
                    ? "border-slate-300 bg-slate-100 text-slate-400"
                    : "border-2 border-slate-200 bg-white text-slate-300";

            return (
              <div
                key={item.key}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${statusClass}`}
                >
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={item.status === "COMPLETE" || item.status === "NOT_APPLICABLE" ? "text-slate-800" : "text-slate-500"}>
                      {lang === "ar" ? item.labelAr : item.labelEn}
                    </span>
                    <WorkspaceBadge tone={STATUS_TONE[item.status]}>
                      {item.status === "NOT_APPLICABLE"
                        ? lang === "ar" ? "غير منطبق" : "N/A"
                        : item.status === "COMPLETE"
                          ? lang === "ar" ? "مكتمل" : "Complete"
                          : item.status === "BLOCKED"
                            ? lang === "ar" ? "محظور" : "Blocked"
                            : lang === "ar" ? "مطلوب" : "Required"}
                    </WorkspaceBadge>
                  </div>
                  {item.detail ? (
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.detail}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WorkspaceCard>
  );
}
