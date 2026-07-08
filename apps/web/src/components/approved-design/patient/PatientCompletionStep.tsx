"use client";

import { AlertCircle, CheckCircle, Download, FileCheck2, Shield } from "lucide-react";
import { Alert, Card, cls, type Lang } from "../shared";
import { formatTimestamp, shortHash, type SignatureResult } from "./types";

export function PatientCompletionStep({
  lang,
  mode,
  signResult,
  consentRef,
  token,
  onDone,
}: {
  lang: Lang;
  mode: "consent" | "refusal";
  signResult: SignatureResult;
  consentRef: string;
  token: string;
  onDone: () => void;
}) {
  const isAr = lang === "ar";
  const isRefusal = mode === "refusal";

  const pdfHref =
    `/api/public/informed-consents/signing/${encodeURIComponent(token)}/final-pdf` +
    `?lang=${encodeURIComponent(lang)}&copy=PATIENT_COPY&disposition=attachment`;

  return (
    <div className="flex flex-col gap-5 items-center text-center">
      <div
        className={cls(
          "flex h-24 w-24 items-center justify-center rounded-[30px] shadow-[0_18px_36px_rgba(12,39,74,0.10)]",
          isRefusal ? "bg-orange-100" : "bg-emerald-100",
        )}
      >
        {isRefusal ? (
          <AlertCircle size={40} className="text-orange-600" />
        ) : (
          <CheckCircle size={40} className="text-emerald-600" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[#102c56]">
          {isRefusal
            ? isAr
              ? "تم تسجيل قرار الرفض"
              : "Refusal Recorded"
            : isAr
              ? "تمت الموافقة بنجاح"
              : "Consent Recorded Successfully"}
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          {isRefusal
            ? isAr
              ? "تم حفظ قرارك في السجل الطبي مع سلسلة مراجعة قانونية كاملة."
              : "Your decision is stored in the medical record with a full legal audit chain."
            : isAr
              ? "شكراً لك. تم حفظ موافقتك في السجل الطبي مع سلسلة مراجعة كاملة."
              : "Thank you. Your consent is stored in the medical record with a full audit chain."}
        </p>
      </div>

      <Card className="w-full rounded-[24px] border border-[#dbe7f4] bg-[linear-gradient(135deg,#0e2f5a_0%,#184675_100%)] p-5 text-start text-white shadow-[0_24px_50px_rgba(10,31,63,0.16)]">
        <div className={cls("mb-3 flex items-center gap-3", isAr ? "flex-row-reverse" : "flex-row")}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#f3d792]">
            <FileCheck2 size={19} />
          </div>
          <div className={isAr ? "text-right" : "text-left"}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              {isAr ? "ملخص الجلسة" : "Session summary"}
            </p>
            <p className="mt-1 text-sm text-white/82">
              {isRefusal
                ? isAr
                  ? "تم إغلاق جلسة الرفض بنجاح وربطها بسجل المراجعة."
                  : "The refusal session has been closed successfully and linked to the audit trail."
                : isAr
                  ? "تم حفظ موافقة المريض وربطها بالتحقق والوثيقة النهائية."
                  : "The patient consent has been recorded and linked to verification and the final document."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/8 p-4">
        <div
          className={cls(
            "flex justify-between items-center gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-xs text-white/65">
            {isAr ? "رقم المرجع" : "Reference"}
          </span>
          <span
            className={cls(
              "font-mono text-xs font-bold break-all",
              isRefusal ? "text-[#ffd6ae]" : "text-[#f3d792]",
            )}
          >
            {consentRef || signResult.documentId.slice(0, 12)}
          </span>
        </div>
        <div className="h-px bg-white/10" />
        <div
          className={cls(
            "flex justify-between items-center gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-xs text-white/65">
            {isAr ? "معرّف التوقيع" : "Signature ID"}
          </span>
          <span className="font-mono text-xs text-white/82 break-all">
            {signResult.signatureId}
          </span>
        </div>
        <div className="h-px bg-white/10" />
        <div
          className={cls(
            "flex justify-between items-center gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-xs text-white/65">
            {isAr ? "وقت التسجيل" : "Recorded At"}
          </span>
          <span className="font-mono text-xs text-white/78">
            {formatTimestamp(signResult.signedAt, lang)}
          </span>
        </div>
        {signResult.evidence?.documentHash ? (
          <>
            <div className="h-px bg-white/10" />
            <div
              className={cls(
                "flex justify-between items-center gap-3",
                isAr ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span className="text-xs text-white/65">
                {isAr ? "بصمة المستند" : "Document Hash"}
              </span>
              <span className="font-mono text-[10px] text-white/70">
                {shortHash(signResult.evidence.documentHash)}
              </span>
            </div>
          </>
        ) : null}
        {signResult.evidence?.otpHash ? (
          <>
            <div className="h-px bg-white/10" />
            <div
              className={cls(
                "flex justify-between items-center gap-3",
                isAr ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span className="text-xs text-white/65">
                {isAr ? "بصمة OTP" : "OTP Hash"}
              </span>
              <span className="font-mono text-[10px] text-white/70">
                {shortHash(signResult.evidence.otpHash)}
              </span>
            </div>
          </>
        ) : null}
        <div className="h-px bg-white/10" />
        <div
          className={cls(
            "flex justify-between items-center gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-xs text-white/65">
            {isAr ? "حالة التحقق" : "Verification"}
          </span>
          <div className="flex items-center gap-1">
            <Shield size={12} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-300">
              OTP + Signature
            </span>
          </div>
        </div>
        </div>
      </Card>

      {!isRefusal && (
        <Alert type="info" lang={lang}>
          {isAr
            ? "تم تسجيل توقيعك. سيقوم الطبيب المعالج بالتوقيع المضاد لإنهاء الوثيقة."
            : "Your signature has been recorded. The treating physician will countersign to finalize the document."}
        </Alert>
      )}

      {!isRefusal && (
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cls(
            "w-full rounded-[18px] border border-[#1f5fae] bg-white py-4 text-sm font-semibold text-[#1f5fae] shadow-[0_12px_24px_rgba(12,39,74,0.05)] transition-colors hover:bg-[#f6faff] flex items-center justify-center gap-2",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <Download size={15} />
          {isAr ? "تحميل نسخة PDF" : "Download PDF Copy"}
        </a>
      )}

      {isRefusal && (
        <Alert type="warning" lang={lang}>
          {isAr
            ? "تم إبلاغ الفريق الطبي بقرار الرفض."
            : "The medical team has been notified of the refusal."}
        </Alert>
      )}

      <button
        type="button"
        onClick={onDone}
        className="w-full rounded-[18px] bg-[#1f5fae] py-4 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(31,95,174,0.24)] transition-colors hover:bg-[#184d90]"
      >
        {isAr ? "إنهاء" : "Done"}
      </button>
    </div>
  );
}
