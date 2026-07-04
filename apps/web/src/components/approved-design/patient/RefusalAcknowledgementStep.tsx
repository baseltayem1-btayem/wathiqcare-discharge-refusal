"use client";

import { useState } from "react";
import { Check, XCircle } from "lucide-react";
import { Alert, Card, cls, type Lang } from "../shared";
import { pickLocalized, type FullDocument } from "./types";

export function RefusalAcknowledgementStep({
  lang,
  doc,
  onAck,
  submitting,
  error,
}: {
  lang: Lang;
  doc: FullDocument;
  onAck: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const isAr = lang === "ar";
  const [acked, setAcked] = useState(false);

  const statement = pickLocalized(
    lang,
    doc.decision?.refusalForm?.statementAr,
    doc.decision?.refusalForm?.statementEn,
  );
  const ackText = pickLocalized(
    lang,
    doc.decision?.refusalForm?.acknowledgementAr,
    doc.decision?.refusalForm?.acknowledgementEn,
  );

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cls(
          "flex flex-col gap-2",
          isAr ? "items-end text-right" : "items-start text-left",
        )}
      >
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle size={20} className="text-red-600" />
        </div>
        <h1 className="text-lg font-bold text-foreground">
          {isAr ? "تأكيد رفض الإجراء" : "Confirm Procedure Refusal"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isAr
            ? "أنت على وشك تسجيل رفضك لهذا الإجراء الطبي. قرارك مُحترم تماماً."
            : "You are about to record your refusal of this medical procedure. Your decision is fully respected."}
        </p>
      </div>

      {statement ? (
        <Card className="p-4">
          <p
            className={cls(
              "text-sm text-foreground leading-relaxed whitespace-pre-line",
              isAr ? "text-right" : "text-left",
            )}
          >
            {statement}
          </p>
        </Card>
      ) : null}

      <Alert type="warning" lang={lang}>
        {isAr
          ? "رفضك مُسجَّل قانونياً وسيُحفظ في ملفك الطبي مع بصمة زمنية معتمدة."
          : "Your refusal is legally recorded and stored in your medical file with a certified timestamp."}
      </Alert>

      <button
        type="button"
        onClick={() => setAcked((v) => !v)}
        className={cls(
          "flex items-start gap-3 p-3 rounded-lg border transition-colors",
          isAr ? "flex-row-reverse text-right" : "flex-row text-left",
          acked ? "border-orange-400 bg-orange-50" : "border-border bg-card",
        )}
      >
        <div
          className={cls(
            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
            acked ? "bg-orange-500 border-orange-500" : "border-border bg-white",
          )}
        >
          {acked ? <Check size={12} className="text-white" /> : null}
        </div>
        <span className="text-sm text-foreground leading-relaxed">
          {ackText ||
            (isAr
              ? "أؤكد أن هذا قراري الحر دون أي ضغط خارجي."
              : "I confirm this is my free decision without any external pressure.")}
        </span>
      </button>

      {error ? <Alert type="warning" lang={lang}>{error}</Alert> : null}

      <button
        type="button"
        onClick={onAck}
        disabled={!acked || submitting}
        className={cls(
          "w-full py-3.5 rounded-lg font-semibold text-sm transition-colors",
          !acked || submitting
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-red-700",
        )}
      >
        {submitting
          ? isAr
            ? "جارٍ التسجيل…"
            : "Submitting…"
          : isAr
            ? "تأكيد الرفض"
            : "Confirm Refusal"}
      </button>
    </div>
  );
}
