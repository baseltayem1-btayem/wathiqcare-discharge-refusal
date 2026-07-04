"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronRight,
  ImageIcon,
  Info,
  MoreVertical,
} from "lucide-react";
import { Card, cls, type Lang } from "../shared";
import { pickLocalized, type FullDocument } from "./types";

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
  const benefits = (ed?.benefits || []).map((b) =>
    pickLocalized(lang, b.ar, b.en),
  );
  const risks = (ed?.risks || []).map((r) =>
    pickLocalized(lang, r.ar, r.en),
  );
  const faq = ed?.faq || [];
  const preInstructions = ed?.preProcedureInstructions || [];
  const postInstructions = ed?.postProcedureInstructions || [];
  const illustrations = doc.illustrations ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cls(
          "flex flex-col gap-1",
          isAr ? "items-end text-right" : "items-start text-left",
        )}
      >
        <h1 className="text-lg font-bold text-foreground">
          {title || (isAr ? "فهم الإجراء الطبي" : "Understanding Your Procedure")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? "اطلع على المعلومات التالية بتمعن. يحق لك طرح أي أسئلة قبل اتخاذ قرارك."
            : "Please read the following carefully. You have the right to ask any questions before deciding."}
        </p>
      </div>

      {summary ? (
        <Card className="p-4 flex flex-col gap-2">
          <div
            className={cls(
              "flex items-center gap-2",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
              <Info size={13} className="text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "ما هو الإجراء؟" : "What is the procedure?"}
            </h2>
          </div>
          <p
            className={cls(
              "text-sm text-muted-foreground leading-relaxed whitespace-pre-line",
              isAr ? "text-right" : "text-left",
            )}
          >
            {summary}
          </p>
        </Card>
      ) : null}

      {illustrations.length === 0 ? null : (
        <div className="flex flex-col gap-3">
          {illustrations.map((illustration) => (
            <Card key={illustration.id} className="overflow-hidden">
              <div
                className={cls(
                  "px-4 py-3 border-b border-border",
                  isAr ? "text-right" : "text-left",
                )}
              >
                <h2 className="text-sm font-semibold text-foreground">
                  {isAr ? "صور توضيحية تعليمية" : "Educational Illustrations"}
                </h2>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {illustration.anatomyImageUrl && (
                  <div>
                    <div
                      className={cls(
                        "text-xs font-semibold text-muted-foreground mb-1",
                        isAr ? "text-right" : "text-left",
                      )}
                    >
                      {isAr ? "التشريح" : "Anatomy"}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={illustration.anatomyImageUrl}
                      alt={
                        illustration.anatomyPromptEn ||
                        illustration.procedureNameEn ||
                        ""
                      }
                      className="w-full max-h-48 object-contain rounded"
                    />
                    {illustration.anatomyPromptAr && isAr ? (
                      <p className="text-sm text-foreground/80 text-right mt-1">
                        {illustration.anatomyPromptAr}
                      </p>
                    ) : illustration.anatomyPromptEn ? (
                      <p className="text-sm text-foreground/80 mt-1">
                        {illustration.anatomyPromptEn}
                      </p>
                    ) : null}
                  </div>
                )}
                {illustration.procedureImageUrl && (
                  <div>
                    <div
                      className={cls(
                        "text-xs font-semibold text-muted-foreground mb-1",
                        isAr ? "text-right" : "text-left",
                      )}
                    >
                      {isAr ? "الإجراء" : "Procedure"}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={illustration.procedureImageUrl}
                      alt={
                        illustration.procedurePromptEn ||
                        illustration.procedureNameEn ||
                        ""
                      }
                      className="w-full max-h-48 object-contain rounded"
                    />
                    {illustration.procedurePromptAr && isAr ? (
                      <p className="text-sm text-foreground/80 text-right mt-1">
                        {illustration.procedurePromptAr}
                      </p>
                    ) : illustration.procedurePromptEn ? (
                      <p className="text-sm text-foreground/80 mt-1">
                        {illustration.procedurePromptEn}
                      </p>
                    ) : null}
                  </div>
                )}
                {(isAr
                  ? illustration.patientDisplayDisclaimerAr
                  : illustration.patientDisplayDisclaimerEn) && (
                  <p
                    className={cls(
                      "text-xs text-muted-foreground italic",
                      isAr ? "text-right" : "text-left",
                    )}
                  >
                    {isAr
                      ? illustration.patientDisplayDisclaimerAr
                      : illustration.patientDisplayDisclaimerEn}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {illustrations.length === 0 && !summary ? (
        <Card className="p-4 flex items-start gap-3">
          <ImageIcon size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "الصور التوضيحية التعليمية بانتظار الموافقة الطبية."
              : "Educational illustration pending medical approval."}
          </p>
        </Card>
      ) : null}

      {benefits.length > 0 ? (
        <Card className="p-4 flex flex-col gap-2.5">
          <div
            className={cls(
              "flex items-center gap-2",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
              <Check size={13} className="text-emerald-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "الفوائد المتوقعة" : "Expected Benefits"}
            </h2>
          </div>
          {benefits.map((b, i) => (
            <div
              key={i}
              className={cls(
                "flex items-start gap-2",
                isAr ? "flex-row-reverse" : "flex-row",
              )}
            >
              <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <span
                className={cls(
                  "text-sm text-foreground/80",
                  isAr ? "text-right" : "text-left",
                )}
              >
                {b}
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      {risks.length > 0 ? (
        <Card className="p-4 flex flex-col gap-2.5">
          <div
            className={cls(
              "flex items-center gap-2",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center">
              <AlertCircle size={13} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "المخاطر المحتملة" : "Potential Risks"}
            </h2>
          </div>
          {risks.map((r, i) => (
            <div
              key={i}
              className={cls(
                "flex items-start gap-2",
                isAr ? "flex-row-reverse" : "flex-row",
              )}
            >
              <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <span
                className={cls(
                  "text-sm text-foreground/80",
                  isAr ? "text-right" : "text-left",
                )}
              >
                {r}
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      {preInstructions.length > 0 ? (
        <Card className="p-4 flex flex-col gap-2">
          <div
            className={cls(
              "flex items-center gap-2",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
              <MoreVertical size={13} className="text-purple-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "تعليمات قبل الإجراء" : "Pre-Procedure Instructions"}
            </h2>
          </div>
          <ul className="list-disc ps-5 text-sm text-muted-foreground leading-relaxed space-y-1">
            {preInstructions.map((item, idx) => (
              <li key={idx}>{pickLocalized(lang, item.ar, item.en)}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {postInstructions.length > 0 ? (
        <Card className="p-4 flex flex-col gap-2">
          <div
            className={cls(
              "flex items-center gap-2",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
              <MoreVertical size={13} className="text-purple-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "تعليمات بعد الإجراء" : "Post-Procedure Instructions"}
            </h2>
          </div>
          <ul className="list-disc ps-5 text-sm text-muted-foreground leading-relaxed space-y-1">
            {postInstructions.map((item, idx) => (
              <li key={idx}>{pickLocalized(lang, item.ar, item.en)}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {faq.length > 0 ? (
        <Card className="overflow-hidden">
          <div
            className={cls(
              "px-4 py-3 border-b border-border",
              isAr ? "text-right" : "text-left",
            )}
          >
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "أسئلة شائعة" : "Frequently Asked Questions"}
            </h2>
          </div>
          {faq.map((item, i) => {
            const q = pickLocalized(lang, item.questionAr, item.questionEn);
            const a = pickLocalized(lang, item.answerAr, item.answerEn);
            if (!q) return null;
            return (
              <div key={i} className="border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={cls(
                    "w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/50 transition-colors",
                    isAr
                      ? "flex-row-reverse text-right"
                      : "flex-row text-left",
                  )}
                >
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {q}
                  </span>
                  <ChevronRight
                    size={14}
                    className={cls(
                      "text-muted-foreground transition-transform shrink-0",
                      openFaq === i ? "rotate-90" : "",
                    )}
                  />
                </button>
                {openFaq === i ? (
                  <div
                    className={cls(
                      "px-4 pb-3 text-sm text-muted-foreground leading-relaxed",
                      isAr ? "text-right" : "text-left",
                    )}
                  >
                    {a}
                  </div>
                ) : null}
              </div>
            );
          })}
        </Card>
      ) : null}

      <button
        type="button"
        onClick={onComplete}
        disabled={completing}
        className={cls(
          "w-full py-3.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors",
          isAr ? "flex-row-reverse" : "flex-row",
          completing
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {completing
          ? isAr
            ? "جارٍ المتابعة…"
            : "Continuing…"
          : isAr
            ? "متابعة للمراجعة"
            : "Continue to Review"}
        <ChevronRight size={16} className={isAr ? "rotate-180" : ""} />
      </button>
    </div>
  );
}
