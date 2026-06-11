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
            <h2 className="text-sm font-semibold text-[#002B5C] mb-3">
              Captured Preview Payload
            </h2>
            <pre className="max-h-96 overflow-auto rounded-lg bg-[#0B1220] p-4 text-xs text-white">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
