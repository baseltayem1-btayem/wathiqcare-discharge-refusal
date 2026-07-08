"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowRight, Clock3, Phone, ShieldCheck } from "lucide-react";
import { Alert, cls, type Lang } from "../shared";
import { formatTimestamp } from "./types";

export function OtpVerificationStep({
  lang,
  mobile,
  setMobile,
  otpDigits,
  setOtpDigits,
  otpStage,
  setOtpStage,
  maskedPhone,
  otpExpiresAt,
  attemptsRemaining,
  otpError,
  otpRequesting,
  otpVerifying,
  onRequest,
  onVerify,
}: {
  lang: Lang;
  mobile: string;
  setMobile: (v: string) => void;
  otpDigits: string[];
  setOtpDigits: (digits: string[]) => void;
  otpStage: "request" | "verify";
  setOtpStage: (stage: "request" | "verify") => void;
  maskedPhone: string | null;
  otpExpiresAt: string | null;
  attemptsRemaining: number | null;
  otpError: string | null;
  otpRequesting: boolean;
  otpVerifying: boolean;
  onRequest: () => void;
  onVerify: () => void;
}) {
  const isAr = lang === "ar";
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const secureNote = isAr
    ? "تتم حماية التحقق عبر جلسة آمنة وسجل تدقيق مشفّر."
    : "Verification is protected by a secure session and encrypted audit trail.";
  const timerLabel = useMemo(() => {
    if (!otpExpiresAt) return null;
    return formatTimestamp(otpExpiresAt, lang);
  }, [otpExpiresAt, lang]);

  useEffect(() => {
    if (otpStage === "verify") {
      const t = setTimeout(() => otpInputsRef.current[0]?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [otpStage]);

  const handleChange = useCallback(
    (idx: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const ch = value.slice(-1);
      const next = [...otpDigits];
      next[idx] = ch;
      setOtpDigits(next);
      if (ch && idx < 5) otpInputsRef.current[idx + 1]?.focus();
    },
    [otpDigits, setOtpDigits],
  );

  const handleKey = useCallback(
    (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
        otpInputsRef.current[idx - 1]?.focus();
      }
    },
    [otpDigits],
  );

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#dbe7f4] bg-[linear-gradient(180deg,#edf4fd_0%,#dfeefc_100%)] shadow-[0_14px_30px_rgba(14,41,78,0.08)]">
        <Phone size={26} className="text-[#1b4f8a]" />
      </div>
      <div
        className={cls(
          "flex w-full flex-col gap-2",
          isAr ? "items-end text-right" : "items-start text-left",
        )}
      >
        <h1 className="text-2xl font-bold text-[#102c56]">
          {isAr ? "التحقق من هويتك" : "Verify Your Identity"}
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          {otpStage === "request"
            ? isAr
              ? "أدخل رقم الجوال المسجل لاستلام رمز التحقق الآمن ثم متابعة رحلة الموافقة."
              : "Enter your registered mobile number to receive the secure verification code and continue the consent journey."
            : isAr
              ? "أدخل الرمز المرسل إلى رقمك المسجل للتحقق من الهوية قبل المتابعة."
              : "Enter the code sent to your registered mobile number before continuing."}
        </p>
        {otpStage === "verify" && maskedPhone ? (
          <p className="text-sm font-mono font-semibold text-[#1b4f8a]">
            {maskedPhone}
          </p>
        ) : null}
      </div>

      {otpStage === "request" ? (
        <div className="w-full rounded-[24px] border border-[#dbe7f4] bg-white p-4 shadow-[0_14px_34px_rgba(12,39,74,0.06)] sm:p-5">
          <div className="flex flex-col gap-4">
            <label className={cls("text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", isAr ? "text-right" : "text-left")}>
              {isAr ? "رقم الجوال" : "Mobile number"}
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder={isAr ? "+9665XXXXXXXX" : "+9665XXXXXXXX"}
              className="w-full rounded-[18px] border border-[#cfe0f0] bg-[#f8fbff] px-4 py-4 text-base text-slate-900 shadow-inner focus:border-[#2d68b2] focus:outline-none"
              dir="ltr"
              aria-label={isAr ? "رقم الجوال" : "Mobile number"}
            />
            <div className="flex items-center gap-2 rounded-[18px] border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
              <ShieldCheck size={14} className="shrink-0" />
              <span>{secureNote}</span>
            </div>
          </div>
          {otpError ? <Alert type="warning" lang={lang}>{otpError}</Alert> : null}
          <button
            type="button"
            onClick={onRequest}
            disabled={otpRequesting}
            className={cls(
              "mt-4 w-full rounded-[18px] py-4 text-sm font-semibold transition-colors",
              otpRequesting
                ? "bg-slate-200 text-slate-500"
                : "bg-[#1f5fae] text-white shadow-[0_16px_28px_rgba(31,95,174,0.24)] hover:bg-[#184d90]",
            )}
          >
            {otpRequesting
              ? isAr
                ? "جارٍ الإرسال…"
                : "Sending…"
              : isAr
                ? "إرسال الرمز"
                : "Send Code"}
          </button>
        </div>
      ) : (
        <div className="w-full rounded-[24px] border border-[#dbe7f4] bg-white p-4 shadow-[0_14px_34px_rgba(12,39,74,0.06)] sm:p-5">
          <div className="flex flex-col gap-4 items-center">
          <div className="flex gap-2 justify-center" dir="ltr">
            {otpDigits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpInputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
                aria-label={`${isAr ? "رقم التحقق" : "OTP digit"} ${i + 1}`}
                className={cls(
                  "h-14 w-11 rounded-2xl border-2 bg-[#f8fbff] text-center text-xl font-bold focus:outline-none transition-colors sm:h-16 sm:w-12",
                  d ? "border-[#2d68b2] text-[#1f5fae]" : "border-[#d3dfed] text-slate-800",
                )}
              />
            ))}
          </div>

          <div className={cls("flex w-full items-center justify-between gap-3 rounded-[18px] border border-[#ebf1f8] bg-[#f8fbff] px-3 py-3", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className={cls("flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
              <Clock3 size={14} className="text-[#1f5fae]" />
              <span className="text-xs font-medium text-slate-600">
                {isAr ? "صالح حتى" : "Valid until"}
              </span>
            </div>
            <span className="text-xs font-semibold text-[#1f5fae]">{timerLabel}</span>
          </div>

          {attemptsRemaining !== null && attemptsRemaining > 0 ? (
            <p className="text-xs text-slate-500">
              {isAr
                ? `محاولات متبقية: ${attemptsRemaining}`
                : `Attempts remaining: ${attemptsRemaining}`}
            </p>
          ) : null}

          {otpError ? <Alert type="warning" lang={lang}>{otpError}</Alert> : null}

          <div className={cls("flex w-full items-center justify-between gap-3", isAr ? "flex-row-reverse" : "flex-row")}>
            <button
              type="button"
              onClick={() => {
                setOtpStage("request");
                setOtpDigits(["", "", "", "", "", ""]);
              }}
              className="text-sm font-medium text-[#1f5fae] underline-offset-2 hover:underline"
            >
              {isAr ? "إعادة إرسال الرمز" : "Resend code"}
            </button>

            <div
              className={cls(
                "flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700",
                isAr ? "flex-row-reverse" : "flex-row",
              )}
            >
              <ShieldCheck size={12} />
              <span>{isAr ? "تحقق آمن" : "Secure check"}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onVerify}
            disabled={otpVerifying}
            className={cls(
              "w-full rounded-[18px] py-4 text-sm font-semibold transition-colors",
              otpVerifying
                ? "bg-slate-200 text-slate-500"
                : "bg-[#1f5fae] text-white shadow-[0_16px_28px_rgba(31,95,174,0.24)] hover:bg-[#184d90]",
            )}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {otpVerifying
                ? isAr
                  ? "جارٍ التحقق…"
                  : "Verifying…"
                : isAr
                  ? "تحقق ومتابعة"
                  : "Verify and continue"}
              {!otpVerifying ? <ArrowRight size={15} className={isAr ? "rotate-180" : ""} /> : null}
            </span>
          </button>
          <p className="text-center text-xs leading-6 text-slate-500">{secureNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}
