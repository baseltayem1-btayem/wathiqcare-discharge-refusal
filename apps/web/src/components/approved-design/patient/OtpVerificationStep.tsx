"use client";

import { useCallback, useEffect, useRef } from "react";
import { Clock, Phone } from "lucide-react";
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
    <div className="flex flex-col gap-5 items-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Phone size={24} className="text-primary" />
      </div>
      <div
        className={cls(
          "flex flex-col gap-1 w-full",
          isAr ? "items-end text-right" : "items-start text-left",
        )}
      >
        <h1 className="text-lg font-bold text-foreground">
          {isAr ? "التحقق من هويتك" : "Verify Your Identity"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {otpStage === "request"
            ? isAr
              ? "أدخل رقم جوالك لاستلام رمز التحقق عبر رسالة SMS."
              : "Enter your mobile number to receive the OTP via SMS."
            : isAr
              ? "أدخل الرمز المرسل إلى جوالك."
              : "Enter the code sent to your mobile."}
        </p>
        {otpStage === "verify" && maskedPhone ? (
          <p className="text-sm font-mono font-semibold text-primary">
            {maskedPhone}
          </p>
        ) : null}
      </div>

      {otpStage === "request" ? (
        <div className="w-full flex flex-col gap-3">
          <input
            type="tel"
            inputMode="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder={isAr ? "+9665XXXXXXXX" : "+9665XXXXXXXX"}
            className="w-full px-3 py-3 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
            dir="ltr"
            aria-label={isAr ? "رقم الجوال" : "Mobile number"}
          />
          {otpError ? <Alert type="warning" lang={lang}>{otpError}</Alert> : null}
          <button
            type="button"
            onClick={onRequest}
            disabled={otpRequesting}
            className={cls(
              "w-full py-3.5 rounded-lg font-semibold text-sm transition-colors",
              otpRequesting
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
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
        <div className="w-full flex flex-col gap-4 items-center">
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
                  "w-11 h-13 text-center text-xl font-bold rounded-lg border-2 bg-card focus:outline-none transition-colors",
                  d ? "border-primary text-primary" : "border-border text-foreground",
                )}
              />
            ))}
          </div>

          {otpExpiresAt ? (
            <div
              className={cls(
                "flex items-center gap-1 text-xs text-muted-foreground",
                isAr ? "flex-row-reverse" : "flex-row",
              )}
            >
              <Clock size={12} />
              <span>
                {isAr ? "صالح حتى" : "Valid until"}{" "}
                {formatTimestamp(otpExpiresAt, lang)}
              </span>
            </div>
          ) : null}

          {attemptsRemaining !== null && attemptsRemaining > 0 ? (
            <p className="text-xs text-muted-foreground">
              {isAr
                ? `محاولات متبقية: ${attemptsRemaining}`
                : `Attempts remaining: ${attemptsRemaining}`}
            </p>
          ) : null}

          {otpError ? <Alert type="warning" lang={lang}>{otpError}</Alert> : null}

          <button
            type="button"
            onClick={() => {
              setOtpStage("request");
              setOtpDigits(["", "", "", "", "", ""]);
            }}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            {isAr ? "إعادة إرسال الرمز" : "Resend code"}
          </button>

          <button
            type="button"
            onClick={onVerify}
            disabled={otpVerifying}
            className={cls(
              "w-full py-3.5 rounded-lg font-semibold text-sm transition-colors",
              otpVerifying
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {otpVerifying
              ? isAr
                ? "جارٍ التحقق…"
                : "Verifying…"
              : isAr
                ? "التحقق والمتابعة"
                : "Verify and Continue"}
          </button>
        </div>
      )}
    </div>
  );
}
