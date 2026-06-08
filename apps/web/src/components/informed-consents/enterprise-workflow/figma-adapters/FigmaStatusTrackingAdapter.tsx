"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Send,
  ShieldCheck,
} from "lucide-react";

type FigmaStatusTrackingAdapterProps = {
  lang?: "en" | "ar";
};

export default function FigmaStatusTrackingAdapter({
  lang = "en",
}: FigmaStatusTrackingAdapterProps) {
  const isArabic = lang === "ar";

  const records = [
    {
      title: isArabic ? "مسودة موافقة" : "Consent draft",
      status: isArabic ? "جاهزة للمعاينة" : "Ready for preview",
      icon: Eye,
    },
    {
      title: isArabic ? "إشعار المريض" : "Patient notification",
      status: isArabic ? "بانتظار الإرسال" : "Awaiting send",
      icon: Send,
    },
    {
      title: isArabic ? "توقيع المريض" : "Patient signature",
      status: isArabic ? "غير مكتمل" : "Not completed",
      icon: Clock,
    },
    {
      title: isArabic ? "حزمة الأدلة" : "Evidence package",
      status: isArabic ? "تُنشأ بعد التوقيع" : "Generated after signature",
      icon: ShieldCheck,
    },
  ];

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="rounded-xl border border-[#D8DCE3] bg-white shadow-sm"
    >
      <div className="border-b border-[#D8DCE3] px-5 py-4">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-[#002B5C]" />
          <h2 className="text-sm font-semibold text-[#2F2F2F]">
            {isArabic ? "متابعة حالة الموافقات" : "Consent Status Tracking"}
          </h2>
        </div>

        <p className="mt-1 text-xs text-[#6B7280]">
          {isArabic
            ? "عرض بصري لحالة رحلة الموافقة دون تغيير منطق التتبع الحالي."
            : "Visual tracking layer without changing the existing tracking logic."}
        </p>
      </div>

      <div className="divide-y divide-[#EEF1F5]">
        {records.map((record, index) => {
          const Icon = record.icon;

          return (
            <div key={record.title} className="flex items-start gap-3 px-5 py-4">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  index === 0 ? "bg-emerald-50" : "bg-[#F4F6F9]"
                }`}
              >
                {index === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                ) : (
                  <Icon className="h-4 w-4 text-[#6B7280]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#2F2F2F]">
                  {record.title}
                </div>
                <div className="mt-1 text-xs text-[#6B7280]">
                  {record.status}
                </div>
              </div>

              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  index === 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-[#F8FAFC] text-[#6B7280] border border-[#D8DCE3]"
                }`}
              >
                {index === 0
                  ? isArabic
                    ? "نشط"
                    : "Active"
                  : isArabic
                    ? "قيد الانتظار"
                    : "Pending"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
