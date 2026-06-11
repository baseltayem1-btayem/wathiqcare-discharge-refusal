"use client";

import React, { useState } from "react";
import { StepProcedure } from "@/components/informed-consents/final-ui/steps/StepProcedure";

export default function CriticalCareConsentPreviewPage() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  return (
    <main className="min-h-screen bg-[#F4F6F9]">
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-4">
        <div className="rounded-xl border border-[#D8DCE3] bg-white p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C9A13B]">
              WathiqCare Preview Only
            </p>
            <h1 className="text-2xl font-semibold text-[#002B5C]">
              Critical Care Consent Digital Template
            </h1>
            <div className="mt-3 inline-flex items-center rounded-full border border-[#C9A13B]/40 bg-[#C9A13B]/10 px-3 py-1 text-xs font-semibold text-[#8A6A12]">
              Approved IMC Form Code: IMC-MR-1363
            </div>
            <p className="text-sm text-[#6B7280] mt-1">
              IMC MR 1363 · Jan 2026 · No patient data · No database write
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                lang === "en"
                  ? "bg-[#002B5C] text-white"
                  : "border border-[#D8DCE3] text-[#2F2F2F]"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                lang === "ar"
                  ? "bg-[#002B5C] text-white"
                  : "border border-[#D8DCE3] text-[#2F2F2F]"
              }`}
            >
              العربية
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[#D8DCE3] bg-white overflow-hidden">
          <StepProcedure
            lang={lang}
            onPrev={() => {
              setPayload({ action: "Back clicked" });
            }}
            onNext={() => {
              setPayload((previous) => ({
                ...(previous ?? {}),
                action: "Continue clicked",
              }));
            }}
            onComplete={(_step, _ids, nextPayload) => {
              setPayload(nextPayload ?? null);
            }}
          />
        </div>

        {payload && (
          <div className="rounded-xl border border-[#D8DCE3] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#C9A13B]">
                  Preview Completed
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#002B5C]">
                  Critical Care Consent Captured Successfully
                </h2>
                <p className="mt-2 text-sm text-[#4B5563]">
                  The selected Critical Care Consent template data has been captured for review only.
                  No patient data was stored and no database write was performed.
                </p>
              </div>

              <div className="rounded-lg bg-[#ECFDF3] px-3 py-2 text-xs font-semibold text-[#027A48]">
                Review Only
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs text-[#6B7280]">Template</p>
                <p className="mt-1 text-sm font-semibold text-[#002B5C]">
                  Critical Care Consent
                </p>
              </div>

              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs text-[#6B7280]">Form Code</p>
                <p className="mt-1 text-sm font-semibold text-[#002B5C]">
                  IMC MR 1363
                </p>
              </div>

              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs text-[#6B7280]">Version</p>
                <p className="mt-1 text-sm font-semibold text-[#002B5C]">
                  Jan 2026
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


