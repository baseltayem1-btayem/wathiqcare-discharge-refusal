"use client";

import { useState } from "react";
import { Check, CheckCircle, FileText, Hash, Shield, XCircle } from "lucide-react";
import { Alert, Card, cls, type Lang } from "../shared";
import { pickLocalized, type FullDocument } from "./types";

export function UnderstandingAcknowledgementStep({
  lang,
  doc,
  procedureTitle,
  consentRef,
  onAccept,
  onRefuse,
  submitting,
  error,
}: {
  lang: Lang;
  doc: FullDocument;
  procedureTitle: string;
  consentRef: string;
  onAccept: () => void;
  onRefuse: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const isAr = lang === "ar";
  const [acked, setAcked] = useState(false);

  const legalText = pickLocalized(lang, doc.legalTextAr, doc.legalTextEn);
  const pdplText = pickLocalized(lang, doc.pdplTextAr, doc.pdplTextEn);
  const sections = doc.sections || [];

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cls(
          "flex flex-col gap-1",
          isAr ? "items-end text-right" : "items-start text-left",
        )}
      >
        <h1 className="text-lg font-bold text-foreground">
          {isAr ? "مراجعة شروط الموافقة" : "Review Consent Terms"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? "اقرأ محتوى الموافقة بالكامل قبل الموافقة أو الرفض."
            : "Read the full consent content before accepting or refusing."}
        </p>
      </div>

      <Card className="p-4 flex flex-col gap-3">
        <div
          className={cls(
            "flex items-center gap-2",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <FileText size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            {procedureTitle}
          </h2>
        </div>
        <div className="h-px bg-border" />
        <div className="bg-muted/40 rounded p-3 max-h-72 overflow-y-auto space-y-3">
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isAr ? "لا يوجد محتوى." : "No content."}
            </p>
          ) : (
            sections.map((s) => {
              const title = pickLocalized(lang, s.titleAr, s.titleEn);
              const body = pickLocalized(lang, s.contentAr, s.contentEn);
              return (
                <div key={s.id}>
                  {title ? (
                    <p
                      className={cls(
                        "text-sm font-semibold text-foreground",
                        isAr ? "text-right" : "text-left",
                      )}
                    >
                      {title}
                    </p>
                  ) : null}
                  {body ? (
                    <p
                      className={cls(
                        "text-sm text-foreground/80 leading-relaxed whitespace-pre-line",
                        isAr ? "text-right" : "text-left",
                      )}
                    >
                      {body}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        {legalText ? <Alert type="info" lang={lang}>{legalText}</Alert> : null}
      </Card>

      {pdplText ? (
        <Card className="p-3">
          <div
            className={cls(
              "flex items-center gap-2 mb-1",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <Shield size={12} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {isAr ? "حماية البيانات" : "Data Protection"}
            </span>
          </div>
          <p
            className={cls(
              "text-xs text-muted-foreground leading-relaxed",
              isAr ? "text-right" : "text-left",
            )}
          >
            {pdplText}
          </p>
        </Card>
      ) : null}

      {consentRef ? (
        <Card className="p-3 flex flex-col gap-1">
          <div
            className={cls(
              "flex items-center gap-2",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <Hash size={12} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {isAr ? "رقم المرجع" : "Reference"}
            </span>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground break-all">
            {consentRef}
          </p>
        </Card>
      ) : null}

      <button
        type="button"
        onClick={() => setAcked((v) => !v)}
        className={cls(
          "flex items-start gap-3 p-3 rounded-lg border transition-colors",
          isAr ? "flex-row-reverse text-right" : "flex-row text-left",
          acked ? "border-primary bg-primary/5" : "border-border bg-card",
        )}
      >
        <div
          className={cls(
            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
            acked ? "bg-primary border-primary" : "border-border bg-white",
          )}
        >
          {acked ? <Check size={12} className="text-white" /> : null}
        </div>
        <span className="text-sm text-foreground leading-relaxed">
          {isAr
            ? "أؤكد أنني قرأت وفهمت محتوى هذه الوثيقة."
            : "I confirm that I have read and understood the content of this document."}
        </span>
      </button>

      {error ? <Alert type="warning" lang={lang}>{error}</Alert> : null}

      <div className="flex flex-col gap-3 mt-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={!acked || submitting}
          className={cls(
            "w-full rounded-xl border-2 p-4 flex flex-col items-center gap-1 transition-colors active:scale-[0.99] disabled:opacity-60",
            "border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100",
          )}
        >
          <CheckCircle size={28} className="text-emerald-600" />
          <span className="text-base font-bold text-emerald-700">
            {isAr ? "أوافق على الإجراء" : "I Accept the Procedure"}
          </span>
          <span className="text-xs text-emerald-600/70">
            {isAr ? "سيُطلب منك التوقيع مباشرة" : "You will sign next"}
          </span>
        </button>
        <button
          type="button"
          onClick={onRefuse}
          disabled={!acked || submitting}
          className={cls(
            "w-full rounded-xl border-2 p-4 flex flex-col items-center gap-1 transition-colors active:scale-[0.99] disabled:opacity-60",
            "border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100",
          )}
        >
          <XCircle size={28} className="text-red-600" />
          <span className="text-base font-bold text-red-700">
            {isAr ? "أرفض الإجراء" : "I Refuse the Procedure"}
          </span>
          <span className="text-xs text-red-600/70">
            {isAr
              ? "سيُسجَّل رفضك ويُبلَّغ الفريق الطبي"
              : "Your refusal is recorded and the team is notified"}
          </span>
        </button>
      </div>

      <Alert type="info" lang={lang}>
        {isAr
          ? "كلا القرارين مُسجَّل قانونياً بسلسلة مراجعة كاملة. لا يوجد ضغط على أي خيار."
          : "Both decisions are legally recorded with a full audit chain. There is no pressure on either choice."}
      </Alert>
    </div>
  );
}
