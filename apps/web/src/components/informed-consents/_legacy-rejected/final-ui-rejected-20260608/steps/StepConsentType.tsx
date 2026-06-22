"use client";

type ConsentTypeOption = {
  key: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  requiresProcedure: boolean;
  requiresAnesthesia: boolean;
  requiresEducation: boolean;
};

const CONSENT_TYPE_OPTIONS: ConsentTypeOption[] = [
  {
    key: "SURGERY_CONSENT",
    labelEn: "Surgical Procedure Consent",
    labelAr: "موافقة إجراء جراحي",
    descriptionEn: "For surgical procedures requiring physician disclosure, procedure risks, alternatives, anesthesia linkage, and patient signature.",
    descriptionAr: "للإجراءات الجراحية التي تتطلب إفصاح الطبيب عن الإجراء والمخاطر والبدائل وربط التخدير وتوقيع المريض.",
    requiresProcedure: true,
    requiresAnesthesia: true,
    requiresEducation: true,
  },
  {
    key: "ANESTHESIA_CONSENT",
    labelEn: "Anesthesia Consent",
    labelAr: "موافقة التخدير",
    descriptionEn: "For general, regional, sedation, or local anesthesia consent review.",
    descriptionAr: "لمراجعة موافقة التخدير العام أو النصفي أو الموضعي أو التهدئة.",
    requiresProcedure: true,
    requiresAnesthesia: true,
    requiresEducation: true,
  },
  {
    key: "BLOOD_TRANSFUSION_CONSENT",
    labelEn: "Blood Transfusion Consent",
    labelAr: "موافقة نقل الدم",
    descriptionEn: "For transfusion, blood products, risks, alternatives, and refusal implications.",
    descriptionAr: "لنقل الدم ومشتقاته والمخاطر والبدائل وآثار الرفض.",
    requiresProcedure: false,
    requiresAnesthesia: false,
    requiresEducation: true,
  },
  {
    key: "ENDOSCOPY_CONSENT",
    labelEn: "Endoscopy Consent",
    labelAr: "موافقة المنظار",
    descriptionEn: "For endoscopy procedures with optional sedation/anesthesia linkage.",
    descriptionAr: "لإجراءات المناظير مع إمكانية ربط التهدئة أو التخدير.",
    requiresProcedure: true,
    requiresAnesthesia: true,
    requiresEducation: true,
  },
  {
    key: "REFUSAL_OF_TREATMENT",
    labelEn: "Refusal of Treatment / Procedure",
    labelAr: "رفض العلاج أو الإجراء",
    descriptionEn: "For documenting informed refusal, consequences, alternatives, and patient acknowledgment.",
    descriptionAr: "لتوثيق الرفض المستنير والنتائج والبدائل وإقرار المريض.",
    requiresProcedure: true,
    requiresAnesthesia: false,
    requiresEducation: false,
  },
  {
    key: "RESEARCH_CLINICAL_TRIAL_CONSENT",
    labelEn: "Research / Clinical Trial Consent",
    labelAr: "موافقة بحث أو تجربة سريرية",
    descriptionEn: "For research participation consent requiring enhanced ethics, withdrawal, data, and study-specific disclosure.",
    descriptionAr: "لموافقة المشاركة البحثية التي تتطلب إفصاحات أخلاقية وبيانات وحق الانسحاب.",
    requiresProcedure: false,
    requiresAnesthesia: false,
    requiresEducation: true,
  },
];

type StepConsentTypeProps = {
  lang?: "en" | "ar";
  builderState?: Record<string, unknown>;
  updateBuilderState?: (patch: Record<string, unknown>) => void;
  onNext?: () => void;
  onBack?: () => void;
  onPrevious?: () => void;
  [key: string]: unknown;
};

export function StepConsentType({
  lang = "ar",
  builderState,
  updateBuilderState,
  onNext,
  onBack,
  onPrevious,
}: StepConsentTypeProps) {
  const isArabic = lang === "ar";
  const selectedConsentType =
    (builderState?.consentType as string | undefined) ||
    ((builderState?.template as Record<string, unknown> | undefined)?.consentType as string | undefined) ||
    ((builderState?.selectedTemplate as Record<string, unknown> | undefined)?.consentType as string | undefined) ||
    "";

  const handleSelect = (option: ConsentTypeOption) => {
    updateBuilderState?.({
      consentType: option.key,
      consentTypeLabelEn: option.labelEn,
      consentTypeLabelAr: option.labelAr,
      consentTypeRequiresProcedure: option.requiresProcedure,
      consentTypeRequiresAnesthesia: option.requiresAnesthesia,
      consentTypeRequiresEducation: option.requiresEducation,
    });
  };

  const handleBack = onBack || onPrevious;

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <section className="rounded-2xl border border-[#D8DCE3] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4B9CD3]">
          {isArabic ? "تحديد نوع الموافقة" : "Consent Type Selection"}
        </p>
        <h2 className="mt-1 text-xl font-bold text-[#002B5C]">
          {isArabic ? "اختر نوع الموافقة المطلوبة" : "Select the required consent type"}
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[#4B5563]">
          {isArabic
            ? "هذه الخطوة تحدد القالب المعتمد، ومسار الإفصاح، واحتياج التخدير، ومتطلبات التثقيف والتوقيع."
            : "This step determines the approved template, disclosure pathway, anesthesia requirements, education requirements, and signing workflow."}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {CONSENT_TYPE_OPTIONS.map((option) => {
          const selected = selectedConsentType === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => handleSelect(option)}
              className={[
                "rounded-2xl border bg-white p-5 text-start shadow-sm transition",
                selected
                  ? "border-[#002B5C] ring-4 ring-[#4B9CD3]/20"
                  : "border-[#D8DCE3] hover:border-[#4B9CD3]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#002B5C]">
                    {isArabic ? option.labelAr : option.labelEn}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                    {isArabic ? option.descriptionAr : option.descriptionEn}
                  </p>
                </div>

                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-bold",
                    selected
                      ? "bg-[#002B5C] text-white"
                      : "bg-[#F4F7FB] text-[#4B5563]",
                  ].join(" ")}
                >
                  {selected ? (isArabic ? "مختار" : "Selected") : option.key}
                </span>
              </div>
            </button>
          );
        })}
      </section>

      <div className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-xl border border-[#D8DCE3] bg-white px-5 py-2.5 text-sm font-bold text-[#2F2F2F] hover:bg-[#F4F7FB] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!handleBack}
        >
          {isArabic ? "السابق" : "Back"}
        </button>

        <button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-[#002B5C] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#001F42] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!onNext || !selectedConsentType}
        >
          {isArabic ? "متابعة إلى الإجراء" : "Continue to Procedure"}
        </button>
      </div>
    </div>
  );
}
