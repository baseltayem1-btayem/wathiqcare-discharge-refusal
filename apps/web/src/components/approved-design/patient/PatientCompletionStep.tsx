"use client";

import { AlertCircle, CheckCircle, Download, Shield } from "lucide-react";
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
          "w-20 h-20 rounded-full flex items-center justify-center",
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
        <h1 className="text-xl font-bold text-foreground">
          {isRefusal
            ? isAr
              ? "تم تسجيل قرار الرفض"
              : "Refusal Recorded"
            : isAr
              ? "تمت الموافقة بنجاح"
              : "Consent Recorded Successfully"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isRefusal
            ? isAr
              ? "تم حفظ قرارك في السجل الطبي مع سلسلة مراجعة قانونية كاملة."
              : "Your decision is stored in the medical record with a full legal audit chain."
            : isAr
              ? "شكراً لك. تم حفظ موافقتك في السجل الطبي مع سلسلة مراجعة كاملة."
              : "Thank you. Your consent is stored in the medical record with a full audit chain."}
        </p>
      </div>

      <Card className="p-4 w-full flex flex-col gap-3 text-start">
        <div
          className={cls(
            "flex justify-between items-center gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-xs text-muted-foreground">
            {isAr ? "رقم المرجع" : "Reference"}
          </span>
          <span
            className={cls(
              "font-mono text-xs font-bold break-all",
              isRefusal ? "text-orange-600" : "text-primary",
            )}
          >
            {consentRef || signResult.documentId.slice(0, 12)}
          </span>
        </div>
        <div className="h-px bg-border" />
        <div
          className={cls(
            "flex justify-between items-center gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-xs text-muted-foreground">
            {isAr ? "معرّف التوقيع" : "Signature ID"}
          </span>
          <span className="font-mono text-xs text-foreground/80 break-all">
            {signResult.signatureId}
          </span>
        </div>
        <div className="h-px bg-border" />
        <div
          className={cls(
            "flex justify-between items-center gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-xs text-muted-foreground">
            {isAr ? "وقت التسجيل" : "Recorded At"}
          </span>
          <span className="font-mono text-xs text-foreground/70">
            {formatTimestamp(signResult.signedAt, lang)}
          </span>
        </div>
        {signResult.evidence?.documentHash ? (
          <>
            <div className="h-px bg-border" />
            <div
              className={cls(
                "flex justify-between items-center gap-3",
                isAr ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span className="text-xs text-muted-foreground">
                {isAr ? "بصمة المستند" : "Document Hash"}
              </span>
              <span className="font-mono text-[10px] text-foreground/60">
                {shortHash(signResult.evidence.documentHash)}
              </span>
            </div>
          </>
        ) : null}
        {signResult.evidence?.otpHash ? (
          <>
            <div className="h-px bg-border" />
            <div
              className={cls(
                "flex justify-between items-center gap-3",
                isAr ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span className="text-xs text-muted-foreground">
                {isAr ? "بصمة OTP" : "OTP Hash"}
              </span>
              <span className="font-mono text-[10px] text-foreground/60">
                {shortHash(signResult.evidence.otpHash)}
              </span>
            </div>
          </>
        ) : null}
        <div className="h-px bg-border" />
        <div
          className={cls(
            "flex justify-between items-center gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-xs text-muted-foreground">
            {isAr ? "حالة التحقق" : "Verification"}
          </span>
          <div className="flex items-center gap-1">
            <Shield size={12} className="text-emerald-600" />
            <span className="text-xs text-emerald-600 font-semibold">
              OTP + Signature
            </span>
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
            "w-full py-3 rounded-lg border border-primary text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors",
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
        className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        {isAr ? "إنهاء" : "Done"}
      </button>
    </div>
  );
}
