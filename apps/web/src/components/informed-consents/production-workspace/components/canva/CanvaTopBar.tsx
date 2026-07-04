"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { ProductionPatient, ProductionEncounter, ClinicalKnowledgeAssembly } from "../../types";

interface CanvaTopBarProps {
  patient?: ProductionPatient;
  encounter?: ProductionEncounter;
  assembly?: ClinicalKnowledgeAssembly;
}

export function CanvaTopBar({ patient, encounter, assembly }: CanvaTopBarProps) {
  const { lang, setLang, isRtl } = useI18n();

  function toggleLang() {
    setLang(lang === "en" ? "ar" : "en");
  }

  const procedureLabel = assembly
    ? assembly.procedureNameEn || assembly.procedureNameAr
    : undefined;

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-5 text-[11px]">
        <div>
          <span className="text-slate-500">Patient:</span>{" "}
          <span className="font-semibold text-slate-800">
            {patient?.name || "Not selected"}
          </span>
          {patient?.mrn && (
            <span className="text-slate-500 ml-1">MRN: {patient.mrn}</span>
          )}
        </div>
        <div>
          <span className="text-slate-500">Encounter:</span>{" "}
          <span className="font-medium text-slate-800">
            {encounter?.encounterId || "Not selected"}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Procedure:</span>{" "}
          <span className="font-medium text-slate-800">
            {procedureLabel || "Not selected"}
          </span>
        </div>
      </div>
      <button
        onClick={toggleLang}
        className="px-2.5 py-1 rounded border border-slate-200 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
        aria-label={isRtl ? "Switch to English" : "التبديل إلى العربية"}
      >
        {lang === "en" ? "EN" : "AR"}
      </button>
    </header>
  );
}
