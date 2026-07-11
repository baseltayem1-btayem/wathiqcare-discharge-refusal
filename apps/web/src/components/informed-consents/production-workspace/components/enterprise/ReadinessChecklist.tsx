"use client";

import { Check, ListChecks } from "lucide-react";
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

const CHECK_ITEMS = [
  "Patient selected",
  "Encounter selected",
  "Procedure selected",
  "Knowledge package ready",
  "Consent field mapping verified",
  "Doctor completion fields completed",
  "Anesthesia workflow reviewed",
  "Patient signature mapped",
  "Education material ready",
  "Patient preview reviewed",
  "Patient contact available",
  "Recipient allowlisted",
  "Blockers resolved",
  "Draft approved",
];

const CHECK_ITEMS_AR = [
  "تم اختيار المريض",
  "تم ربط الزيارة",
  "تم اختيار الإجراء",
  "الحزمة المعرفية جاهزة",
  "تم التحقق من خريطة الحقول",
  "تم إكمال حقول الطبيب",
  "تمت مراجعة مسار التخدير",
  "تم ربط حقل توقيع المريض",
  "المواد التعليمية جاهزة",
  "تمت مراجعة معاينة المريض",
  "بيانات التواصل متوفرة",
  "المستلم ضمن allowlist",
  "تمت معالجة الموانع",
  "تم اعتماد المسودة",
];

export function ReadinessChecklist({ readiness }: { readiness: Readiness }) {
  const { lang } = useI18n();
  const checks = [
    readiness.patientReady,
    readiness.encounterReady,
    readiness.procedureSelected,
    readiness.assemblyReady,
    readiness.educationReady,
    readiness.previewReviewed,
    readiness.contactAvailable,
    readiness.allowlisted,
    readiness.blockersResolved,
    readiness.draftApproved,
  ];

  return (
    <WorkspaceCard className="overflow-hidden">
      <WorkspaceCardHeader
        icon={<ListChecks className="size-5" />}
        title={lang === "ar" ? "قائمة الجاهزية" : "Readiness checklist"}
        description={lang === "ar" ? "يجب اكتمال كل الشروط قبل إرسال جلسة التوقيع للمريض." : "Every gate must be complete before secure signing can be sent to the patient."}
        action={<WorkspaceBadge tone={readiness.sendReady ? "green" : "gold"}>{readiness.sendReady ? (lang === "ar" ? "جاهز للإرسال" : "Ready") : `${readiness.missingItems.length} ${lang === "ar" ? "متبقٍ" : "left"}`}</WorkspaceBadge>}
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
          </div>
        </div>

        <div className="space-y-2">
          {checks.map((done, index) => (
            <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm">
              <span className={done ? "flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white" : "flex size-5 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300"}>
                {done ? <Check className="size-3" /> : null}
              </span>
              <span className={done ? "text-slate-800" : "text-slate-500"}>{lang === "ar" ? CHECK_ITEMS_AR[index] : CHECK_ITEMS[index]}</span>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceCard>
  );
}