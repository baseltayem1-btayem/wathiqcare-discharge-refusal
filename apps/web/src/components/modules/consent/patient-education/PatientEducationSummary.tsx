import type { DynamicConsentSection } from "@/modules/consent-engine/engine/types";

interface Props {
  section: DynamicConsentSection;
}

/**
 * Renders the Phase 2.2 PATIENT_EDUCATION section as a bilingual summary
 * card. Server component — no client state required.
 */
export default function PatientEducationSummary({ section }: Props) {
  return (
    <article
      data-section-kind="PATIENT_EDUCATION"
      data-section-key={section.key}
      className="rounded-[24px] border border-[rgba(0,43,92,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(237,247,253,0.9))] p-5 shadow-[var(--shadow-md)]"
    >
      <header className="mb-4 flex flex-col gap-1.5">
        <span className="inline-flex w-fit items-center rounded-full bg-[rgba(75,156,211,0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
          Patient Education / ملخّص التثقيف للمريض
        </span>
        <h2 className="text-[18px] font-semibold leading-tight text-[var(--foreground)]">{section.titleEn}</h2>
        <h3 className="text-[15px] font-semibold text-[var(--foreground-secondary)]" dir="rtl">
          {section.titleAr}
        </h3>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <p className="rounded-2xl border border-[rgba(0,43,92,0.06)] bg-white/80 p-4 text-[13px] leading-6 text-[var(--foreground-secondary)] shadow-sm">{section.bodyEn}</p>
        <p className="rounded-2xl border border-[rgba(0,43,92,0.06)] bg-white/80 p-4 text-[13px] leading-7 text-[var(--foreground)] shadow-sm" dir="rtl">
          {section.bodyAr}
        </p>
      </div>
    </article>
  );
}
