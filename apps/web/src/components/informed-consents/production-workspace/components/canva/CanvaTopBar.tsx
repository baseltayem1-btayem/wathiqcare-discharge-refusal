"use client";

import { Bell, ChevronRight, Circle, Clock, ShieldPlus } from "lucide-react";
import { cn } from "@/components/design-system";
import { useI18n } from "@/i18n/I18nProvider";
import { WorkspaceBadge } from "../WorkspaceAtoms";
import type { ProductionPatient, ProductionEncounter, ClinicalKnowledgeAssembly } from "../../types";

interface CanvaTopBarProps {
  patient?: ProductionPatient;
  encounter?: ProductionEncounter;
  selectedProcedureTitle?: string;
  assembly?: ClinicalKnowledgeAssembly;
}

export function CanvaTopBar({ patient, encounter, selectedProcedureTitle, assembly }: CanvaTopBarProps) {
  const { lang, setLang, isRtl } = useI18n();

  const procedureLabel = selectedProcedureTitle || (assembly ? assembly.procedureNameEn || assembly.procedureNameAr : undefined);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ShieldPlus className="size-4" />
          </span>
          <span className="text-sm font-semibold">WathiqCare</span>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-inset ring-blue-100" aria-hidden>
            {initials(patient?.name || "No Patient")}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="truncate text-sm font-semibold text-slate-900">{patient?.name || "No patient selected"}</h1>
              <WorkspaceBadge tone="green">
                <Circle className="size-2 fill-current" /> {encounter ? "Active encounter" : "Awaiting encounter"}
              </WorkspaceBadge>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
              <span className="font-mono">MRN {patient?.mrn || "—"}</span>
              <ChevronRight className="size-3" />
              <span className="font-mono">{encounter?.encounterId || "Not selected"}</span>
              <ChevronRight className="size-3" />
              <span>{procedureLabel || "Procedure pending"}</span>
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-slate-500 xl:flex">
            <Clock className="size-3.5" /> Draft auto-saved
          </span>

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Consent language">
            {(["en", "ar"] as const).map((nextLang) => (
              <button
                key={nextLang}
                type="button"
                onClick={() => setLang(nextLang)}
                aria-label={nextLang === "en" ? "Switch workspace language to English" : "Switch workspace language to Arabic"}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  lang === nextLang ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-900",
                )}
              >
                {nextLang === "en" ? "EN" : "ع"}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-500" aria-hidden />
          </button>

          <div className="hidden items-center gap-2.5 border-l border-slate-200 pl-3 sm:flex">
            <span className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700" aria-hidden>
              {initials(encounter?.physician || "Assigned Physician")}
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-slate-900">{encounter?.physician || "Assigned physician"}</p>
              <p className="text-[11px] text-slate-500">{encounter?.department || (isRtl ? "القسم" : "Department")}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
