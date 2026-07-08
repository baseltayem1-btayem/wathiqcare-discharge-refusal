"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  HeartPulse,
  ImageIcon,
  Info,
  MoreVertical,
  ShieldCheck,
} from "lucide-react";
import { Card, cls, type Lang } from "../shared";
import { pickLocalized, resolveProcedureTitles, type FullDocument } from "./types";

export function EducationMaterialsStep({
  lang,
  doc,
  onComplete,
  completing,
}: {
  lang: Lang;
  doc: FullDocument;
  onComplete: () => void;
  completing: boolean;
}) {
  const isAr = lang === "ar";
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const ed = doc.education;
  const title = pickLocalized(lang, ed?.titleAr, ed?.titleEn);
  const summary = pickLocalized(lang, ed?.summary?.ar, ed?.summary?.en);
  const benefits = (ed?.benefits || []).map((item) => pickLocalized(lang, item.ar, item.en)).filter(Boolean);
  const risks = (ed?.risks || []).map((item) => pickLocalized(lang, item.ar, item.en)).filter(Boolean);
  const faq = ed?.faq || [];
  const preInstructions = ed?.preProcedureInstructions || [];
  const postInstructions = ed?.postProcedureInstructions || [];
  const illustrations = doc.illustrations ?? [];
  const procedureTitles = resolveProcedureTitles({
    titleAr: doc.templateTitleAr,
    titleEn: doc.templateTitleEn,
    plannedProcedure: doc.plannedProcedure,
  });
  const chips = isAr
    ? ["نظرة عامة", "الفوائد", "المخاطر", "التعليمات", "الأسئلة الشائعة"]
    : ["Overview", "Benefits", "Risks", "Instructions", "FAQ"];

  return (
    <div className="flex flex-col gap-5">
      <div className={cls("flex flex-col gap-2", isAr ? "items-end text-right" : "items-start text-left")}>
        <h1 className="text-2xl font-bold text-[#102c56]">
          {isAr ? "شرح الإجراء" : "Procedure & Education"}
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          {isAr
            ? "راجع الشرح السريري والمعلومات التثقيفية بعناية قبل الانتقال إلى المراجعة النهائية للموافقة."
            : "Review the clinical explanation and educational material carefully before moving to the final consent review."}
        </p>
      </div>

      <Card className="overflow-hidden rounded-[24px] border border-[#dbe7f4] bg-[linear-gradient(135deg,#0e2f5a_0%,#184675_100%)] text-white shadow-[0_24px_50px_rgba(10,31,63,0.16)]">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className={cls("space-y-3", isAr ? "text-right" : "text-left")}>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#f3d792]">
              {isAr ? "محتوى سريري معتمد" : "Approved clinical content"}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                {isAr ? "الإجراء" : "Procedure"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold leading-snug text-white">{procedureTitles.en || title}</h2>
              <p className="mt-2 text-sm leading-7 text-[#dbe8f8]">{procedureTitles.ar || title}</p>
            </div>
            {summary ? <p className="max-w-2xl text-sm leading-7 text-white/82">{summary}</p> : null}
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur">
            <div className="flex h-[180px] items-center justify-center rounded-[18px] border border-white/10 bg-[radial-gradient(circle_at_top,#2b5f97_0%,#14355f_72%)]">
              {illustrations[0]?.anatomyImageUrl || illustrations[0]?.procedureImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={illustrations[0]?.anatomyImageUrl || illustrations[0]?.procedureImageUrl || ""}
                  alt={procedureTitles.en || title || "Procedure education"}
                  className="h-full w-full rounded-[18px] object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center text-white/90">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-[#f3d792]">
                    <HeartPulse size={26} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{isAr ? "شرح سريري منظم" : "Structured clinical overview"}</p>
                    <p className="mt-1 text-xs leading-6 text-white/65">{isAr ? "راجع الفوائد والمخاطر والتعليمات قبل المتابعة" : "Review benefits, risks, and instructions before continuing"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className={cls("flex flex-wrap gap-2", isAr ? "justify-end" : "justify-start")}>
        {chips.map((chip) => (
          <span key={chip} className="rounded-full border border-[#d8e4f2] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a4d87] shadow-sm">
            {chip}
          </span>
        ))}
      </div>

      {summary ? (
        <Card className="rounded-[22px] border border-[#dbe7f4] p-4 shadow-[0_12px_28px_rgba(12,39,74,0.05)]">
          <div className={cls("flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
              <Info size={15} className="text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{isAr ? "نبذة عن الإجراء" : "Procedure overview"}</h2>
          </div>
          <p className={cls("mt-3 text-sm leading-7 text-foreground/80 whitespace-pre-line", isAr ? "text-right" : "text-left")}>
            {summary}
          </p>
        </Card>
      ) : null}

      {illustrations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {illustrations.map((illustration) => (
            <Card key={illustration.id} className="overflow-hidden rounded-[22px] border border-[#dbe7f4] shadow-[0_12px_28px_rgba(12,39,74,0.05)]">
              <div className={cls("border-b border-border px-4 py-3", isAr ? "text-right" : "text-left")}>
                <h2 className="text-sm font-semibold text-foreground">{isAr ? "صور تعليمية" : "Educational illustrations"}</h2>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                {illustration.anatomyImageUrl ? (
                  <div>
                    <p className={cls("mb-2 text-xs font-semibold text-muted-foreground", isAr ? "text-right" : "text-left")}>
                      {isAr ? "التشريح" : "Anatomy"}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={illustration.anatomyImageUrl}
                      alt={illustration.anatomyPromptEn || illustration.procedureNameEn || "Anatomy illustration"}
                      className="w-full rounded-[18px] border border-[#e3edf7] bg-slate-50 object-contain p-2"
                    />
                  </div>
                ) : null}
                {illustration.procedureImageUrl ? (
                  <div>
                    <p className={cls("mb-2 text-xs font-semibold text-muted-foreground", isAr ? "text-right" : "text-left")}>
                      {isAr ? "الإجراء" : "Procedure"}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={illustration.procedureImageUrl}
                      alt={illustration.procedurePromptEn || illustration.procedureNameEn || "Procedure illustration"}
                      className="w-full rounded-[18px] border border-[#e3edf7] bg-slate-50 object-contain p-2"
                    />
                  </div>
                ) : null}
              </div>
              {((isAr ? illustration.patientDisplayDisclaimerAr : illustration.patientDisplayDisclaimerEn) ||
                (isAr ? illustration.anatomyPromptAr : illustration.anatomyPromptEn) ||
                (isAr ? illustration.procedurePromptAr : illustration.procedurePromptEn)) ? (
                <div className={cls("border-t border-border px-4 py-3 text-xs leading-6 text-muted-foreground", isAr ? "text-right" : "text-left")}>
                  {isAr
                    ? illustration.patientDisplayDisclaimerAr || illustration.anatomyPromptAr || illustration.procedurePromptAr
                    : illustration.patientDisplayDisclaimerEn || illustration.anatomyPromptEn || illustration.procedurePromptEn}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}

      {illustrations.length === 0 && !summary ? (
        <Card className="flex items-start gap-3 rounded-[22px] border border-[#dbe7f4] p-4 shadow-[0_12px_28px_rgba(12,39,74,0.05)]">
          <ImageIcon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isAr ? "الوسائط التعليمية غير متاحة حالياً، لكن بقية الشرح السريري متاح للمراجعة." : "Educational media is not currently available, but the remaining clinical explanation is available for review."}
          </p>
        </Card>
      ) : null}

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

      {preInstructions.length > 0 ? (
        <Card className="rounded-[22px] border border-[#dbe7f4] p-4 shadow-[0_12px_28px_rgba(12,39,74,0.05)] flex flex-col gap-2">
          <div className={cls("flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100">
              <MoreVertical size={15} className="text-violet-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{isAr ? "تعليمات قبل الإجراء" : "Pre-procedure instructions"}</h2>
          </div>
          <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted-foreground">
            {preInstructions.map((item, index) => (
              <li key={index}>{pickLocalized(lang, item.ar, item.en)}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {postInstructions.length > 0 ? (
        <Card className="rounded-[22px] border border-[#dbe7f4] p-4 shadow-[0_12px_28px_rgba(12,39,74,0.05)] flex flex-col gap-2">
          <div className={cls("flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100">
              <MoreVertical size={15} className="text-violet-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{isAr ? "تعليمات بعد الإجراء" : "Post-procedure instructions"}</h2>
          </div>
          <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted-foreground">
            {postInstructions.map((item, index) => (
              <li key={index}>{pickLocalized(lang, item.ar, item.en)}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {faq.length > 0 ? (
        <Card className="overflow-hidden rounded-[22px] border border-[#dbe7f4] shadow-[0_12px_28px_rgba(12,39,74,0.05)]">
          <div className={cls("border-b border-border px-4 py-3", isAr ? "text-right" : "text-left")}>
            <h2 className="text-sm font-semibold text-foreground">{isAr ? "أسئلة شائعة" : "Frequently asked questions"}</h2>
          </div>
          {faq.map((item, index) => {
            const question = pickLocalized(lang, item.questionAr, item.questionEn);
            const answer = pickLocalized(lang, item.answerAr, item.answerEn);
            if (!question) return null;
            return (
              <div key={index} className="border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className={cls(
                    "flex w-full items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/50",
                    isAr ? "flex-row-reverse text-right" : "text-left",
                  )}
                >
                  <span className="flex-1 text-sm font-medium text-foreground">{question}</span>
                  <ChevronRight size={14} className={cls("shrink-0 text-muted-foreground transition-transform", openFaq === index ? "rotate-90" : "")} />
                </button>
                {openFaq === index ? (
                  <div className={cls("px-4 pb-3 text-sm leading-relaxed text-muted-foreground", isAr ? "text-right" : "text-left")}>
                    {answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </Card>
      ) : null}

      <Card className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4 shadow-[0_12px_28px_rgba(12,39,74,0.04)]">
        <div className={cls("flex items-start gap-3", isAr ? "flex-row-reverse text-right" : "text-left")}>
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">{isAr ? "ملاحظة امتثال" : "Compliance note"}</p>
            <p className="mt-1 text-sm leading-7 text-emerald-800/80">
              {isAr ? "بعد مراجعة هذا الشرح، ستنتقل إلى المحاور الأساسية ثم إلى نموذج الموافقة المعتمد نفسه قبل اتخاذ قرارك." : "After reviewing this explanation, you will move to the key points and then to the approved consent form itself before making your decision."}
            </p>
          </div>
        </div>
      </Card>

      <button
        type="button"
        onClick={onComplete}
        disabled={completing}
        className="w-full rounded-[18px] bg-[#1f5fae] py-4 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(31,95,174,0.24)] transition-colors hover:bg-[#184d90] active:scale-[0.99] disabled:opacity-60"
      >
        <span className="inline-flex items-center justify-center gap-2">
          {completing
            ? isAr
              ? "جارٍ المتابعة..."
              : "Continuing..."
            : isAr
              ? "متابعة إلى المحاور الأساسية"
              : "Continue to key points"}
          {!completing ? <ChevronRight size={16} className={isAr ? "rotate-180" : ""} /> : null}
        </span>
      </button>
    </div>
  );
}
