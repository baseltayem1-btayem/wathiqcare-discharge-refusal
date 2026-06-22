"use client";

type StepPreviewProps = {
  lang?: "en" | "ar";
  builderState?: unknown;
  linkedDocumentId?: string | null;
  documentReady?: boolean;
  onNext?: () => void;
  onBack?: () => void;
  onPrevious?: () => void;
  [key: string]: unknown;
};

export function StepPreview({
  lang = "ar",
  builderState,
  linkedDocumentId,
  documentReady,
  onNext,
  onBack,
  onPrevious,
}: StepPreviewProps) {
  const isArabic = lang === "ar";
  const documentId =
    typeof linkedDocumentId === "string" && linkedDocumentId.trim()
      ? linkedDocumentId.trim()
      : "";

  const draftPdfUrl = documentId
    ? `/api/modules/informed-consents/documents/${encodeURIComponent(
        documentId,
      )}/pdf?copyType=PHYSICIAN_REVIEW_DRAFT&status=DRAFT_REVIEW&preview=1`
    : "";

  const handleBack = onBack || onPrevious;

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <section className="rounded-2xl border border-[#D8DCE3] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4B9CD3]">
              {isArabic ? "مراجعة قبل الإرسال" : "Pre-Send Review"}
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#002B5C]">
              {isArabic ? "معاينة مسودة الموافقة" : "Consent Draft Preview"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              {isArabic
                ? "هذه نسخة مسودة لمراجعة الطبيب قبل إرسال رابط الموافقة للمريض. لا تعتبر نسخة نهائية ولا تحمل أثر توقيع المريض."
                : "This is a physician review draft before sending the consent link to the patient. It is not the final signed patient copy."}
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            {isArabic ? "DRAFT / مسودة" : "DRAFT REVIEW"}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D8DCE3] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-[#002B5C]">
              {isArabic ? "مسودة PDF للمراجعة" : "Draft PDF for Review"}
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              {documentId
                ? isArabic
                  ? `رقم المستند المرتبط: ${documentId}`
                  : `Linked document ID: ${documentId}`
                : isArabic
                  ? "سيظهر ملف PDF بعد إنشاء وربط المستند."
                  : "The PDF will appear after the consent document is generated and linked."}
            </p>
          </div>

          {draftPdfUrl ? (
            <a
              href={draftPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-[#D8DCE3] bg-white px-4 py-2 text-xs font-bold text-[#002B5C] transition hover:bg-[#F4F7FB]"
            >
              {isArabic ? "فتح PDF في نافذة جديدة" : "Open PDF"}
            </a>
          ) : null}
        </div>

        {draftPdfUrl ? (
          <div className="overflow-hidden rounded-2xl border border-[#D8DCE3] bg-[#F4F7FB]">
            <iframe
              key={draftPdfUrl}
              title={isArabic ? "مسودة PDF للموافقة" : "Consent Draft PDF"}
              src={draftPdfUrl}
              className="h-[760px] w-full bg-white"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
            {isArabic
              ? "لم يتم ربط مستند الموافقة بعد. انتقل خطوة للخلف ثم ارجع إلى المعاينة، أو تحقق من نجاح إنشاء المسودة."
              : "No linked consent document is available yet. Go back and return to preview, or verify that generate-draft completed successfully."}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#D8DCE3] bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-[#002B5C]">
          {isArabic ? "ملخص المراجعة" : "Review Summary"}
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-[#F4F7FB] p-4">
            <p className="text-xs font-semibold text-[#6B7280]">
              {isArabic ? "حالة المستند" : "Document Status"}
            </p>
            <p className="mt-1 text-sm font-bold text-[#2F2F2F]">
              {documentReady
                ? isArabic
                  ? "جاهز للمراجعة"
                  : "Ready for review"
                : isArabic
                  ? "قيد الإنشاء"
                  : "Generating / pending"}
            </p>
          </div>

          <div className="rounded-xl bg-[#F4F7FB] p-4">
            <p className="text-xs font-semibold text-[#6B7280]">
              {isArabic ? "نوع النسخة" : "Copy Type"}
            </p>
            <p className="mt-1 text-sm font-bold text-[#2F2F2F]">
              PHYSICIAN_REVIEW_DRAFT
            </p>
          </div>
        </div>

        {builderState ? (
          <details className="mt-4 rounded-xl border border-[#E5E7EB] bg-white p-4">
            <summary className="cursor-pointer text-xs font-bold text-[#002B5C]">
              {isArabic ? "عرض بيانات المراجعة الفنية" : "Show technical review data"}
            </summary>
            <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-[#0F172A] p-3 text-xs text-white">
              {JSON.stringify(builderState, null, 2)}
            </pre>
          </details>
        ) : null}
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
          disabled={!onNext || !documentId}
        >
          {isArabic ? "اعتماد المسودة والمتابعة" : "Approve Draft and Continue"}
        </button>
      </div>
    </div>
  );
}
