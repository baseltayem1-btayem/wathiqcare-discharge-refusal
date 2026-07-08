"use client";

import { useState } from "react";
import { Check, CheckCircle, ExternalLink, FileText, Hash, Shield, ShieldCheck, XCircle } from "lucide-react";
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
  const approvedPdfUrl = doc.approvedPdfUrl?.trim() || "";
  const approvedContentAvailable = Boolean(doc.approvedContentAvailable);
  const approvedReady = approvedContentAvailable && Boolean(approvedPdfUrl);

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cls(
          "flex flex-col gap-2",
          isAr ? "items-end text-right" : "items-start text-left",
        )}
      >
        <h1 className="text-2xl font-bold text-[#102c56]">
          {isAr ? "مراجعة الموافقة المعتمدة" : "Review approved consent"}
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          {isAr
            ? "راجع نموذج الموافقة الطبي المعتمد نفسه قبل اتخاذ قرار القبول أو الرفض."
            : "Review the approved medical consent itself before making an accept or refuse decision."}
        </p>
      </div>

      <Card className="rounded-[24px] border border-[#dbe7f4] p-4 shadow-[0_18px_36px_rgba(12,39,74,0.08)] flex flex-col gap-4">
        <div
          className={cls(
            "flex items-start justify-between gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <div className={cls("flex items-center gap-3", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf4fd] text-[#1f5fae]">
              <FileText size={18} />
            </div>
            <div className={isAr ? "text-right" : "text-left"}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4f78a6]">
                {isAr ? "النموذج المعتمد" : "Approved document"}
              </p>
              <h2 className="mt-1 text-base font-semibold text-[#12345f]">{procedureTitle}</h2>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={13} />
            {isAr ? "معتمد" : "Approved"}
          </div>
        </div>

        <div className="rounded-[22px] border border-[#dbe7f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fd_100%)] p-3">
          <div className={cls("mb-3 flex items-center justify-between gap-3", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className={cls("flex items-center gap-2 text-[#325a89]", isAr ? "flex-row-reverse" : "flex-row")}>
              <FileText size={14} />
              <span className="text-xs font-semibold">{isAr ? "عرض نسخة المريض المعتمدة" : "Viewing approved patient copy"}</span>
            </div>
            {approvedReady ? (
              <a
                href={approvedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className={cls("inline-flex items-center gap-1 text-xs font-semibold text-[#1f5fae] underline underline-offset-2", isAr ? "flex-row-reverse" : "flex-row")}
              >
                {isAr ? "فتح في نافذة جديدة" : "Open in new tab"}
                <ExternalLink size={12} />
              </a>
            ) : null}
          </div>

          {approvedReady ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-[18px] border border-[#d4e1f0] bg-white shadow-[0_14px_30px_rgba(12,39,74,0.06)]">
                <iframe
                  title={isAr ? "الموافقة المعتمدة" : "Approved consent PDF"}
                  src={approvedPdfUrl}
                  className="h-[620px] w-full"
                />
              </div>
            </div>
          ) : (
            <div className={cls("rounded-[18px] border border-red-200 bg-red-50 p-4", isAr ? "text-right" : "text-left")}>
              <p className="text-sm font-semibold text-red-700">
                {isAr ? "لا يمكن المتابعة لأن نموذج الموافقة المعتمد غير متاح." : "You cannot continue because the approved consent form is unavailable."}
              </p>
              <p className="mt-2 text-sm leading-7 text-red-700/80">
                {isAr
                  ? "يرجى التواصل مع المنشأة الطبية لإعادة إصدار الرابط بعد التأكد من توفر النسخة المعتمدة." 
                  : "Please contact the medical facility to reissue the link after the approved version becomes available."}
              </p>
            </div>
          )}
        </div>

        {legalText ? <Alert type="info" lang={lang}>{legalText}</Alert> : null}
      </Card>

      {pdplText ? (
        <Card className="rounded-[22px] border border-[#dbe7f4] p-3 shadow-[0_12px_28px_rgba(12,39,74,0.05)]">
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
        <Card className="rounded-[22px] border border-[#dbe7f4] p-3 flex flex-col gap-1 shadow-[0_12px_28px_rgba(12,39,74,0.05)]">
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
        disabled={!approvedReady}
        className={cls(
          "flex items-start gap-3 rounded-[20px] border p-4 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          isAr ? "flex-row-reverse text-right" : "flex-row text-left",
          acked ? "border-[#1f5fae] bg-[#f1f7fe]" : "border-[#dbe7f4] bg-white",
        )}
      >
        <div
          className={cls(
            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
            acked ? "border-[#1f5fae] bg-[#1f5fae]" : "border-border bg-white",
          )}
        >
          {acked ? <Check size={12} className="text-white" /> : null}
        </div>
        <span className="text-sm text-foreground leading-relaxed">
          {isAr
            ? "أؤكد أنني قرأت وفهمت نموذج الموافقة المعتمد المعروض أعلاه."
            : "I confirm that I have read and understood the approved consent form shown above."}
        </span>
      </button>

      {error ? <Alert type="warning" lang={lang}>{error}</Alert> : null}

      <div className="flex flex-col gap-3 mt-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={!acked || submitting || !approvedReady}
          className={cls(
            "w-full rounded-[22px] border-2 p-4 flex flex-col items-center gap-1 transition-colors active:scale-[0.99] disabled:opacity-60",
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
          disabled={!acked || submitting || !approvedReady}
          className={cls(
            "w-full rounded-[22px] border-2 p-4 flex flex-col items-center gap-1 transition-colors active:scale-[0.99] disabled:opacity-60",
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
