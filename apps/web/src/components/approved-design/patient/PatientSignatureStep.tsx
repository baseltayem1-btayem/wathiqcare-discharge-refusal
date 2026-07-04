"use client";

import { Lock } from "lucide-react";
import { Alert, cls, PatientIdentityCard, type Lang } from "../shared";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

export function PatientSignatureStep({
  lang,
  patientName,
  patientMrn,
  signerName,
  setSignerName,
  padRef,
  hasInk,
  setHasInk,
  onSubmit,
  submitting,
  error,
  mode = "consent",
  onBack,
}: {
  lang: Lang;
  patientName: string;
  patientMrn: string;
  signerName: string;
  setSignerName: (v: string) => void;
  padRef: React.MutableRefObject<SignaturePadHandle | null>;
  hasInk: boolean;
  setHasInk: (v: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  mode?: "consent" | "refusal";
  onBack?: () => void;
}) {
  const isAr = lang === "ar";
  const isRefusal = mode === "refusal";

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cls(
          "flex flex-col gap-1",
          isAr ? "items-end text-right" : "items-start text-left",
        )}
      >
        <h1 className="text-lg font-bold text-foreground">
          {isRefusal
            ? isAr
              ? "توقيع نموذج الرفض"
              : "Sign Refusal Form"
            : isAr
              ? "توقيع الموافقة"
              : "Sign Consent"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRefusal
            ? isAr
              ? "ارسم توقيعك أدناه لتأكيد قرار الرفض."
              : "Draw your signature below to confirm the refusal."
            : isAr
              ? "ارسم توقيعك في المربع أدناه."
              : "Draw your signature in the pad below."}
        </p>
      </div>

      <PatientIdentityCard lang={lang} name={patientName} mrn={patientMrn} />

      <label
        className={cls(
          "text-xs font-semibold text-muted-foreground uppercase tracking-wide",
          isAr ? "text-right" : "text-left",
        )}
      >
        {isAr ? "الاسم الكامل للموقّع" : "Signer Full Name"}
      </label>
      <input
        type="text"
        value={signerName}
        onChange={(e) => setSignerName(e.target.value)}
        placeholder={isAr ? "أدخل اسمك الكامل" : "Enter full name"}
        className="w-full px-3 py-2.5 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
      />

      <SignaturePad lang={lang} padRef={padRef} onChange={setHasInk} />

      {hasInk ? (
        <button
          type="button"
          onClick={() => padRef.current?.clear()}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline self-center"
        >
          {isAr ? "مسح التوقيع" : "Clear signature"}
        </button>
      ) : null}

      <div
        className={cls(
          "flex items-start gap-2 text-xs text-muted-foreground",
          isAr ? "flex-row-reverse text-right" : "flex-row",
        )}
      >
        <Lock size={12} className="shrink-0 mt-0.5" />
        <span>
          {isAr
            ? "توقيعك مرتبط ببصمة OTP وسلسلة مراجعة قانونية."
            : "Your signature is bound to the OTP hash and a legal audit chain."}
        </span>
      </div>

      {error ? <Alert type="warning" lang={lang}>{error}</Alert> : null}

      <div className="flex flex-col gap-2 mt-auto">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="w-full py-3 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
          >
            {isAr ? "رجوع" : "Back"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !hasInk || !signerName.trim()}
          className={cls(
            "w-full py-3.5 rounded-lg font-semibold text-sm transition-colors",
            submitting || !hasInk || !signerName.trim()
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : isRefusal
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {submitting
            ? isAr
              ? "جارٍ التسجيل…"
              : "Submitting…"
            : isRefusal
              ? isAr
                ? "تأكيد الرفض"
                : "Confirm Refusal"
              : isAr
                ? "تأكيد التوقيع"
                : "Confirm Signature"}
        </button>
      </div>
    </div>
  );
}
