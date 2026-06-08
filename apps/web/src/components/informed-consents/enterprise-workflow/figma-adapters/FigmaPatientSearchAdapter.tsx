"use client";

import React from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Droplets,
  Phone,
  Search,
  Shield,
  User,
} from "lucide-react";

type FigmaPatientSearchAdapterProps = {
  lang?: "en" | "ar";
};

export default function FigmaPatientSearchAdapter({
  lang = "en",
}: FigmaPatientSearchAdapterProps) {
  const isArabic = lang === "ar";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="rounded-xl border border-[#D8DCE3] bg-white shadow-sm"
    >
      <div className="border-b border-[#D8DCE3] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#2F2F2F]">
          {isArabic ? "البحث عن المريض" : "Patient Search"}
        </h2>
        <p className="mt-1 text-xs text-[#6B7280]">
          {isArabic
            ? "ابحث برقم الملف الطبي أو الاسم أو رقم الهوية."
            : "Search by MRN, name, or national ID."}
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <div className="text-sm font-semibold text-amber-900">
              {isArabic ? "بيانات صحية محمية" : "Protected health information"}
            </div>
            <p className="mt-0.5 text-xs leading-5 text-amber-800">
              {isArabic
                ? "يجب استخدام بيانات المريض فقط لغرض إصدار الموافقة المستنيرة."
                : "Patient data must be used only for informed consent issuance."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-[#D8DCE3] bg-[#F8FAFC] p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280] ${
                  isArabic ? "right-3" : "left-3"
                }`}
              />
              <input
                readOnly
                value=""
                placeholder={
                  isArabic
                    ? "رقم الملف الطبي / الاسم / رقم الهوية"
                    : "MRN / Name / National ID"
                }
                className={`w-full rounded-lg border border-[#D8DCE3] bg-white px-3 py-2.5 text-sm text-[#2F2F2F] outline-none ${
                  isArabic ? "pr-10" : "pl-10"
                }`}
              />
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#002B5C] px-5 py-2.5 text-sm font-medium text-white"
            >
              <Search className="h-4 w-4" />
              {isArabic ? "بحث" : "Search"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {["MRN-XXXX", "Full Name", "National ID", "DOB"].map((item) => (
              <span
                key={item}
                className="rounded border border-[#D8DCE3] bg-white px-2 py-1 text-xs text-[#6B7280]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#D8DCE3] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#2F2F2F]">
              {isArabic ? "مثال عرض النتيجة" : "Sample result view"}
            </span>
            <span className="rounded-full bg-[#EBF3FB] px-2 py-1 text-xs text-[#002B5C]">
              {isArabic ? "جاهز للربط" : "Ready for binding"}
            </span>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-[#EEF1F5] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#002B5C] text-white">
              <User className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#2F2F2F]">
                  {isArabic ? "اسم المريض" : "Patient Name"}
                </span>
                <span className="rounded border border-[#D8DCE3] bg-[#F4F6F9] px-2 py-0.5 font-mono text-xs text-[#6B7280]">
                  MRN-0000
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  Allergy
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-4">
                <div className="flex items-center gap-1.5 text-[#6B7280]">
                  <Calendar className="h-3.5 w-3.5" />
                  DOB / Age
                </div>
                <div className="flex items-center gap-1.5 text-[#6B7280]">
                  <User className="h-3.5 w-3.5" />
                  Gender
                </div>
                <div className="flex items-center gap-1.5 text-[#6B7280]">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </div>
                <div className="flex items-center gap-1.5 text-red-700">
                  <Droplets className="h-3.5 w-3.5" />
                  Blood Type
                </div>
              </div>
            </div>

            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#6B7280]" />
          </div>
        </div>
      </div>
    </div>
  );
}
