"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle, ChevronDown, HelpCircle, Sparkles } from "lucide-react";
import { Card, cls, type Lang } from "../shared";
import { pickLocalized, type FullDocument, type Section } from "./types";

function getAlternativeSections(lang: Lang, sections: Section[] | undefined): string[] {
  return (sections || [])
    .filter((section) => {
      const kind = (section.sectionKind || "").toLowerCase();
      const title = pickLocalized(lang, section.titleAr, section.titleEn).toLowerCase();
      return kind === "alternative" || title.includes("alternative") || title.includes("بديل") || title.includes("البدائل");
    })
    .map((section) => pickLocalized(lang, section.contentAr, section.contentEn))
    .filter((value) => value.trim().length > 0);
}

export function EducationDetailsStep({
  lang,
  doc,
  onContinue,
  completing,
}: {
  lang: Lang;
  doc: FullDocument;
  onContinue: () => void;
  completing: boolean;
}) {
  const isAr = lang === "ar";
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const benefits = (doc.education?.benefits || []).map((item) => pickLocalized(lang, item.ar, item.en)).filter(Boolean);
  const risks = (doc.education?.risks || []).map((item) => pickLocalized(lang, item.ar, item.en)).filter(Boolean);
  const faq = doc.education?.faq || [];
  const instructions = [
    ...(doc.education?.preProcedureInstructions || []),
    ...(doc.education?.postProcedureInstructions || []),
  ]
    .map((item) => pickLocalized(lang, item.ar, item.en))
    .filter(Boolean);

  const alternatives = useMemo(() => getAlternativeSections(lang, doc.sections), [lang, doc.sections]);

  return (
    <div className="flex flex-col gap-5">
      <div className={cls("flex flex-col gap-1", isAr ? "items-end text-right" : "items-start text-left")}>
        <h1 className="text-2xl font-bold text-[#102c56]">
          {isAr ? "المحاور الأساسية قبل الموافقة" : "Key points before consent"}
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          {isAr
            ? "راجع النقاط الأساسية التي يجب فهمها قبل الانتقال إلى وثيقة الموافقة الكاملة."
            : "Review the key points you should understand before opening the full consent document."}
        </p>
      </div>

      {benefits.length > 0 ? (
        <Card className="rounded-[22px] border border-[#dbe7f4] p-4 shadow-[0_12px_28px_rgba(12,39,74,0.05)] flex flex-col gap-2.5">
          <div className={cls("flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle size={15} className="text-emerald-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{isAr ? "الفوائد المتوقعة" : "Expected benefits"}</h2>
          </div>
          {benefits.map((item, index) => (
            <div key={index} className={cls("flex items-start gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-500" />
              <p className={cls("text-sm leading-relaxed text-foreground/80", isAr ? "text-right" : "text-left")}>{item}</p>
            </div>
          ))}
        </Card>
      ) : null}

      {risks.length > 0 ? (
        <Card className="rounded-[22px] border border-[#dbe7f4] p-4 shadow-[0_12px_28px_rgba(12,39,74,0.05)] flex flex-col gap-2.5">
          <div className={cls("flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle size={15} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{isAr ? "المخاطر المحتملة" : "Potential risks"}</h2>
          </div>
          {risks.map((item, index) => (
            <div key={index} className={cls("flex items-start gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <p className={cls("text-sm leading-relaxed text-foreground/80", isAr ? "text-right" : "text-left")}>{item}</p>
            </div>
          ))}
        </Card>
      ) : null}

      <Card className="rounded-[22px] border border-[#dbe7f4] p-4 shadow-[0_12px_28px_rgba(12,39,74,0.05)] flex flex-col gap-2.5">
        <div className={cls("flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100">
            <Sparkles size={15} className="text-sky-600" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">{isAr ? "البدائل المتاحة" : "Available alternatives"}</h2>
        </div>
        {alternatives.length > 0 ? (
          alternatives.map((item, index) => (
            <p key={index} className={cls("rounded-xl bg-muted/50 px-3 py-2 text-sm leading-relaxed text-foreground/80", isAr ? "text-right" : "text-left")}>
              {item}
            </p>
          ))
        ) : (
          <p className={cls("rounded-xl bg-muted/50 px-3 py-2 text-sm leading-relaxed text-muted-foreground", isAr ? "text-right" : "text-left")}>
            {isAr
              ? "سيشرح لك الفريق الطبي البدائل المناسبة لحالتك السريرية، بما في ذلك عدم الإجراء إذا كان ذلك خياراً طبياً مناسباً."
              : "Your care team will discuss the alternatives appropriate to your clinical situation, including non-procedural options when medically appropriate."}
          </p>
        )}
      </Card>

      {faq.length > 0 ? (
        <Card className="overflow-hidden rounded-[22px] border border-[#dbe7f4] shadow-[0_12px_28px_rgba(12,39,74,0.05)]">
          <div className={cls("border-b border-border px-4 py-3", isAr ? "text-right" : "text-left")}>
            <div className={cls("flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
              <HelpCircle size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{isAr ? "الأسئلة الشائعة" : "Frequently asked questions"}</h2>
            </div>
          </div>
          <div className="flex flex-col">
            {faq.map((item, index) => {
              const open = openFaq === index;
              const question = pickLocalized(lang, item.questionAr, item.questionEn);
              const answer = pickLocalized(lang, item.answerAr, item.answerEn);
              return (
                <div key={index} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className={cls("flex w-full items-center justify-between gap-3 px-4 py-3", isAr ? "flex-row-reverse text-right" : "flex-row text-left")}
                  >
                    <span className="text-sm font-medium text-foreground">{question}</span>
                    <ChevronDown size={16} className={cls("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                  </button>
                  {open ? <p className={cls("px-4 pb-4 text-sm leading-relaxed text-muted-foreground", isAr ? "text-right" : "text-left")}>{answer}</p> : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {instructions.length > 0 ? (
        <Card className="rounded-[22px] border border-[#dbe7f4] p-4 shadow-[0_12px_28px_rgba(12,39,74,0.05)]">
          <h2 className={cls("mb-2 text-sm font-semibold text-foreground", isAr ? "text-right" : "text-left")}>
            {isAr ? "تعليمات مهمة" : "Important instructions"}
          </h2>
          <ul className={cls("space-y-2 text-sm leading-relaxed text-muted-foreground", isAr ? "text-right" : "text-left")}>
            {instructions.map((item, index) => (
              <li key={index} className={cls("flex items-start gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4 shadow-[0_12px_28px_rgba(12,39,74,0.04)]">
        <p className={cls("text-sm leading-7 text-emerald-800", isAr ? "text-right" : "text-left")}>
          {isAr
            ? "يجب مراجعة الفوائد والمخاطر والبدائل والأسئلة الشائعة قبل فتح نموذج الموافقة النهائي والتوقيع الإلكتروني."
            : "Benefits, risks, alternatives, and common questions should be reviewed before opening the final consent form and e-signing."}
        </p>
      </Card>

      <button
        type="button"
        onClick={onContinue}
        disabled={completing}
        className="w-full rounded-[18px] bg-[#1f5fae] py-4 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(31,95,174,0.24)] transition-colors hover:bg-[#184d90] active:scale-[0.99] disabled:opacity-60"
      >
        {completing
          ? isAr
            ? "جارٍ حفظ المراجعة..."
            : "Saving review..."
          : isAr
            ? "مراجعة نموذج الموافقة"
            : "Review consent form"}
      </button>
    </div>
  );
}