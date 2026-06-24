"use client";

import React from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Shield,
  Stethoscope,
} from "lucide-react";

import { EnterpriseSupportSettingsPanel } from "./EnterpriseSupportSettingsPanel";
import SmartConsentFastTrackPreview from "./SmartConsentFastTrackPreview";
import FigmaPatientSearchAdapter from "./figma-adapters/FigmaPatientSearchAdapter";
import FigmaConsentBuilderAdapter from "./figma-adapters/FigmaConsentBuilderAdapter";
import FigmaStatusTrackingAdapter from "./figma-adapters/FigmaStatusTrackingAdapter";

type FigmaPhysicianWorkflowShellProps = {
  lang?: "en" | "ar";
};

export default function FigmaPhysicianWorkflowShell({
  lang = "en",
}: FigmaPhysicianWorkflowShellProps) {
  const isArabic = lang === "ar";

  const cards = [
    {
      label: isArabic ? "مسودات نشطة" : "Active Drafts",
      value: "08",
      icon: FileText,
      tone: "text-[#002B5C]",
      bg: "bg-[#EBF3FB]",
    },
    {
      label: isArabic ? "بانتظار المريض" : "Awaiting Patient",
      value: "12",
      icon: Send,
      tone: "text-[#4B9CD3]",
      bg: "bg-[#EBF3FB]",
    },
    {
      label: isArabic ? "مكتملة اليوم" : "Completed Today",
      value: "05",
      icon: CheckCircle2,
      tone: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: isArabic ? "تحتاج مراجعة" : "Needs Review",
      value: "03",
      icon: AlertCircle,
      tone: "text-amber-700",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-[#F4F6F9] text-[#2F2F2F]"
    >
      <div className="border-b border-[#D8DCE3] bg-white px-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#002B5C] text-white">
              <Stethoscope className="h-4 w-4" />
            </div>

            <div>
              <h1 className="text-lg font-semibold text-[#2F2F2F]">
                {isArabic
                  ? "رحلة الطبيب للموافقات المستنيرة"
                  : "Physician Consent Workflow"}
              </h1>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                {isArabic
                  ? "تصميم مرجعي مطور مع الحفاظ على مكتبة الموافقات والمنطق الحالي."
                  : "Figma enterprise workflow shell while preserving the current consent library and logic."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#D8DCE3] bg-[#F8FAFC] px-3 py-2 text-xs text-[#6B7280]">
            <Shield className="h-4 w-4 text-[#002B5C]" />
            {isArabic ? "بيئة طبية محمية" : "Protected clinical workspace"}
          </div>
        </div>
      </div>

      <main className="px-8 py-5">
        <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-xl border border-[#D8DCE3] bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${card.tone}`} />
                  </div>
                  <Activity className="h-3.5 w-3.5 text-[#9CA3AF]" />
                </div>

                <div className="font-mono text-2xl font-semibold text-[#002B5C]">
                  {card.value}
                </div>

                <div className="mt-1 text-sm text-[#6B7280]">
                  {card.label}
                </div>
              </div>
            );
          })}
        </section>

        <section className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

            <div>
              <div className="text-sm font-semibold text-amber-900">
                {isArabic
                  ? "تنبيه جاهزية قبل إشعار المريض"
                  : "Readiness gate before patient notification"}
              </div>

              <p className="mt-0.5 text-xs leading-5 text-amber-800">
                {isArabic
                  ? "لا يتم إرسال الإشعار الموحد للمريض إلا بعد اكتمال اختيار الموافقة، مراجعة التخدير عند الحاجة، التحقق من البيانات، ومعاينة المسودة."
                  : "The unified patient notification remains gated until consent selection, anesthesia review where required, validation, and draft preview are completed."}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="space-y-5">
            <FigmaPatientSearchAdapter lang={lang} />
            <FigmaConsentBuilderAdapter lang={lang} />
          </div>

          <aside className="space-y-5">
            <FigmaStatusTrackingAdapter lang={lang} />

            <div className="rounded-xl border border-[#D8DCE3] bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#002B5C]" />
                <h3 className="text-sm font-semibold text-[#2F2F2F]">
                  {isArabic ? "معاينة المسودة" : "Draft Preview"}
                </h3>
              </div>

              <SmartConsentFastTrackPreview />
            </div>

            <div className="rounded-xl border border-[#D8DCE3] bg-white p-5 shadow-sm">
              <EnterpriseSupportSettingsPanel />
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
