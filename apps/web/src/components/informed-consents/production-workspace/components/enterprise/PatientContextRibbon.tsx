"use client";

import { CalendarDays, HeartPulse, IdCard, Phone, UserRound } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { WorkspaceBadge, WorkspaceCard } from "../WorkspaceAtoms";
import type { ProductionEncounter, ProductionPatient } from "../../types";
import { EmptyState } from "./EmptyState";

interface PatientContextRibbonProps {
  patient?: ProductionPatient;
  encounter?: ProductionEncounter;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
        <Icon className="size-3.5 text-blue-700" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value || "—"}</p>
    </div>
  );
}

export function PatientContextRibbon({ patient, encounter }: PatientContextRibbonProps) {
  const { lang } = useI18n();

  return (
    <WorkspaceCard className="overflow-hidden">
      <div className="border-b border-slate-200 bg-[linear-gradient(120deg,#eff6ff_0%,#f8fafc_55%,#fff7e8_100%)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              {lang === "ar" ? "سياق المريض والزيارة" : "Patient & encounter context"}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
              {patient?.name || (lang === "ar" ? "اختر مريضاً للبدء" : "Select a patient to begin")}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WorkspaceBadge tone={patient && encounter ? "green" : "gold"}>
              {patient && encounter
                ? lang === "ar"
                  ? "السياق السريري مربوط"
                  : "Clinical context bound"
                : lang === "ar"
                  ? "بانتظار الربط"
                  : "Binding pending"}
            </WorkspaceBadge>
            <WorkspaceBadge tone="slate">
              {patient?.languagePreference === "ar"
                ? lang === "ar"
                  ? "العربية"
                  : "Arabic"
                : patient?.languagePreference === "en"
                  ? lang === "ar"
                    ? "الإنجليزية"
                    : "English"
                  : "EN / AR"}
            </WorkspaceBadge>
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        {!patient ? (
          <EmptyState
            compact
            title={lang === "ar" ? "لا يوجد سياق مريض بعد" : "No patient context yet"}
            message={lang === "ar" ? "ابحث عن المريض واربط الزيارة لإظهار السياق السريري الثابت عبر الواجهة." : "Search for a patient and bind an encounter to keep clinical context visible throughout the workspace."}
            icon={<UserRound className="size-5" />}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Metric label={lang === "ar" ? "الاسم" : "Patient"} value={patient.name} icon={UserRound} />
            <Metric label="MRN" value={patient.mrn} icon={IdCard} />
            <Metric label={lang === "ar" ? "الزيارة" : "Encounter"} value={encounter?.encounterId || "—"} icon={CalendarDays} />
            <Metric label={lang === "ar" ? "التشخيص" : "Diagnosis"} value={encounter?.diagnosis || "—"} icon={HeartPulse} />
            <Metric label={lang === "ar" ? "الاتصال" : "Contact"} value={patient.mobileNumber || patient.email || "—"} icon={Phone} />
          </div>
        )}
      </div>
    </WorkspaceCard>
  );
}