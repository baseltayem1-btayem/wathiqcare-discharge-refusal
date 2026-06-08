"use client";

import React from "react";
import { CheckCircle2, ChevronRight, FileText, Search } from "lucide-react";

import ConsentSearchEngine from "../ConsentSearchEngine";

type FigmaConsentBuilderAdapterProps = {
  lang?: "en" | "ar";
};

export default function FigmaConsentBuilderAdapter({
  lang = "en",
}: FigmaConsentBuilderAdapterProps) {
  const isArabic = lang === "ar";

  const steps = [
    isArabic ? "المريض" : "Patient",
    isArabic ? "الإجراء" : "Procedure",
    isArabic ? "التخدير" : "Anesthesia",
    isArabic ? "الإفصاحات" : "Disclosures",
    isArabic ? "التثقيف" : "Education",
    isArabic ? "المعاينة" : "Preview",
    isArabic ? "الإرسال" : "Send",
  ];

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="overflow-hidden rounded-xl border border-[#D8DCE3] bg-white shadow-sm"
    >
      <div className="border-b border-[#D8DCE3] bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#002B5C]" />
          <h2 className="text-sm font-semibold text-[#2F2F2F]">
            {isArabic ? "بناء حزمة الموافقة" : "Consent Builder"}
          </h2>
        </div>

        <p className="mt-1 text-xs text-[#6B7280]">
          {isArabic
            ? "واجهة Figma مع الحفاظ على محرك مكتبة الموافقات المعتمد."
            : "Figma layout while preserving the approved consent search library."}
        </p>
      </div>

      <div className="border-b border-[#D8DCE3] bg-[#F8FAFC] px-5 py-3">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                  index <= 1
                    ? "border-[#002B5C] bg-[#EBF3FB] text-[#002B5C]"
                    : "border-[#D8DCE3] bg-white text-[#6B7280]"
                }`}
              >
                {index <= 1 ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                {step}
              </span>
              {index < steps.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-[#CBD5E1]" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-[#002B5C]" />
            <h3 className="text-sm font-semibold text-[#2F2F2F]">
              {isArabic
                ? "مكتبة الموافقات المعتمدة"
                : "Approved Consent Library"}
            </h3>
          </div>

          <ConsentSearchEngine />
        </div>

        <aside className="border-t border-[#D8DCE3] bg-[#F8FAFC] p-5 xl:border-l xl:border-t-0">
          <h3 className="text-sm font-semibold text-[#2F2F2F]">
            {isArabic ? "بوابة الجاهزية" : "Readiness Gate"}
          </h3>

          <div className="mt-4 space-y-3">
            {[
              isArabic ? "اختيار الموافقة" : "Consent selected",
              isArabic ? "تحديد التخدير عند الحاجة" : "Anesthesia determined",
              isArabic ? "معاينة المسودة" : "Draft preview generated",
              isArabic ? "الإشعار الموحد للمريض" : "Unified patient notification",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-2 text-xs">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    index === 0
                      ? "bg-[#002B5C] text-white"
                      : "bg-white text-[#6B7280] border border-[#D8DCE3]"
                  }`}
                >
                  {index === 0 ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                </span>
                <span className="text-[#4B5563]">{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
