"use client";

import { useId, type ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";

interface DoctorCaseWorkspaceShellProps {
  context: ReactNode;
  progress: ReactNode;
  patientSelection: ReactNode;
  procedure: ReactNode;
  completion: ReactNode;
  preview: ReactNode;
  attention: ReactNode;
  dispatch: ReactNode;
  evidence: ReactNode;
  actions: ReactNode;
}

/** Presentation only: every clinical value and action belongs to the existing flow. */
export function DoctorCaseWorkspaceShell(props: DoctorCaseWorkspaceShellProps) {
  const { lang } = useI18n();
  const id = useId();
  const sections = [
    { key: "patient", label: lang === "ar" ? "المريض والزيارة" : "Patient & encounter", content: props.patientSelection },
    { key: "procedure", label: lang === "ar" ? "الإجراء" : "Procedure", content: props.procedure },
    { key: "completion", label: lang === "ar" ? "استكمال الطبيب" : "Physician completion", content: props.completion },
    { key: "preview", label: lang === "ar" ? "مراجعة المستند" : "Document review", content: props.preview },
    { key: "dispatch", label: lang === "ar" ? "الإرسال إلى المريض" : "Patient dispatch", content: props.dispatch },
    { key: "evidence", label: lang === "ar" ? "التدقيق والأدلة" : "Audit & evidence", content: props.evidence },
  ];
  const renderSection = (key: string) => {
    const section = sections.find((item) => item.key === key)!;
    return (
      <section key={key} aria-labelledby={`${id}-${key}`} className="min-w-0 space-y-3">
        <h2 id={`${id}-${key}`} tabIndex={-1} className="scroll-mt-6 rounded text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600">
          {section.label}
        </h2>
        {section.content}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-950">
          {lang === "ar" ? "مساحة عمل حالة الطبيب" : "Doctor Case Workspace"}
        </h1>
        {props.context}
        {props.progress}
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[160px_minmax(0,1fr)] 2xl:grid-cols-[160px_minmax(0,1fr)_300px]">
        <nav aria-label={lang === "ar" ? "أقسام الحالة" : "Case sections"} className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-2 xl:sticky xl:top-6 xl:flex-col">
          {sections.map((section, index) => (
            <button key={section.key} type="button" onClick={() => {
              const target = document.getElementById(`${id}-${section.key}`);
              target?.focus({ preventScroll: true });
              target?.scrollIntoView({ block: "start" });
            }} className="flex items-center gap-2 rounded-xl px-3 py-3 text-start text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600">
              <span aria-hidden="true" className="text-xs text-slate-400">{index + 1}</span>
              {section.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-6">
          {renderSection("patient")}
          {renderSection("procedure")}
          <div className="grid items-start gap-6 min-[1800px]:grid-cols-2">
            {renderSection("completion")}
            {renderSection("preview")}
          </div>
          {renderSection("dispatch")}
          {renderSection("evidence")}
        </div>
        <aside aria-label={lang === "ar" ? "الانتباه والجاهزية" : "Attention & readiness"} className="min-w-0 space-y-4 xl:col-start-2 2xl:col-start-3 2xl:row-start-1">
          <h2 className="text-sm font-semibold text-slate-700">{lang === "ar" ? "الانتباه والجاهزية" : "Attention & readiness"}</h2>
          {props.attention}
        </aside>
      </div>
      <footer aria-label={lang === "ar" ? "إجراءات الحالة" : "Case actions"} className="sticky bottom-0 z-20 rounded-t-2xl border border-slate-200 bg-white p-4 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
        {props.actions}
      </footer>
    </div>
  );
}
