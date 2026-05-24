import type { Phase22TemplateBundle } from "@/modules/consent-engine/loaders/phase22-content-loader";
import FaqAccordion from "@/components/modules/consent/patient-education/FaqAccordion";
import PatientEducationSummary from "@/components/modules/consent/patient-education/PatientEducationSummary";
import UnderstandingCheck from "@/components/modules/consent/patient-education/UnderstandingCheck";

interface Props {
  bundle: Phase22TemplateBundle;
}

/**
 * Parent panel that mounts the three Phase 2.2 patient-education
 * components against a loaded template bundle. Used by the build-only
 * preview route. Re-usable from any future patient-facing surface.
 */
export default function PatientEducationPanel({ bundle }: Props) {
  const summary = bundle.sections.find((section) => section.kind === "patient-education");
  const faq = bundle.sections.find((section) => section.kind === "faq");
  const understanding = bundle.sections.find((section) => section.kind === "understanding-check");
  const scoring = understanding?.meta?.scoring;

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {bundle.metadata.consentType} · risk {bundle.metadata.riskLevel}
        </div>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{bundle.metadata.titleEn}</h1>
        <h2 className="text-lg font-semibold text-slate-800" dir="rtl">
          {bundle.metadata.titleAr}
        </h2>
      </header>

      {summary ? <PatientEducationSummary section={summary} /> : null}

      {faq ? (
        <FaqAccordion
          titleEn={faq.titleEn}
          titleAr={faq.titleAr}
          items={bundle.faqItems}
        />
      ) : null}

      {understanding && scoring ? (
        <UnderstandingCheck
          titleEn={understanding.titleEn}
          titleAr={understanding.titleAr}
          questions={bundle.understandingQuestions}
          scoring={scoring}
        />
      ) : null}
    </div>
  );
}
