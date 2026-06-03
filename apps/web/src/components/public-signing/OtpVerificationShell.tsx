import type React from "react";
import Image from "next/image";
import { Clock, Lock, Phone, ShieldCheck } from "lucide-react";

import { Alert, Card, cls, type Lang } from "@/components/approved-design/shared";
import { OTP_PAGE_BRANDING } from "@/lib/branding/otp-page-branding";

type OtpVerificationShellProps = {
  lang: Lang;
  mobile: string;
  maskedPhone?: string | null;
  otpStage: "request" | "verify";
  otpDigits: string[];
  otpRequesting: boolean;
  otpVerifying: boolean;
  otpExpiresAt?: string | null;
  otpError?: string | null;
  attemptsRemaining?: number | null;
  onMobileChange: (value: string) => void;
  onOtpDigitChange: (index: number, value: string) => void;
  onOtpKeyDown: (index: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  onRequestOtp: () => void;
  onVerifyOtp: () => void;
  onResendOtp: () => void;
  otpInputRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  formatTimestamp: (iso: string, lang: Lang) => string;
  className?: string;
  heroTitleAr?: string;
  heroTitleEn?: string;
};

export function OtpVerificationShell({
  lang,
  mobile,
  maskedPhone,
  otpStage,
  otpDigits,
  otpRequesting,
  otpVerifying,
  otpExpiresAt = null,
  otpError = null,
  attemptsRemaining = null,
  onMobileChange,
  onOtpDigitChange,
  onOtpKeyDown,
  onRequestOtp,
  onVerifyOtp,
  onResendOtp,
  otpInputRefs,
  formatTimestamp,
  className = "",
}: OtpVerificationShellProps) {
  const isAr = lang === "ar";
  const direction = isAr ? "rtl" : "ltr";

  return (
    <section
      dir={direction}
      className={cls("w-full px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8", className)}
    >
      <Card className="mx-auto w-full max-w-[760px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-800 via-cyan-600 to-slate-950" />

        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <header
            className={cls(
              "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
              isAr ? "sm:flex-row-reverse text-right" : "text-left",
            )}
          >
            <div className="inline-flex w-fit items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 shadow-sm">
              <Image
                src={OTP_PAGE_BRANDING.card.imcLogoSrc}
                alt={OTP_PAGE_BRANDING.card.imcLogoAlt}
                width={150}
                height={52}
                className="h-auto max-h-12 w-auto object-contain"
                priority
              />
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              <Lock size={12} />
              <span>{isAr ? "???? ????" : "Secure Session"}</span>
            </div>
          </header>

          <div className={cls("flex flex-col gap-2", isAr ? "text-right" : "text-left")}>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
              {isAr ? "???? ???" : "Secure Verification"}
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {otpStage === "request"
                ? isAr
                  ? "????? ??? ??????"
                  : "Send Verification Code"
                : isAr
                  ? "?????? ???? OTP"
                  : "OTP Verification"}
            </h1>

            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              {otpStage === "request"
                ? isAr
                  ? "???? ??? ?????? ?????? ??????? ??? ?????? ??????? ???? ???????? ?????? ??????."
                  : "Enter the registered mobile number to receive the verification code and continue the secure medical consent session."
                : isAr
                  ? "???? ??? ?????? ?????? ??? ??? ?????? ?????? ?????? ?????? ?????????."
                  : "Enter the verification code sent to the registered mobile number to continue."}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
            <div
              className={cls(
                "mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500",
                isAr ? "flex-row-reverse" : "flex-row",
              )}
            >
              <Phone size={14} className="text-sky-700" />
              <span>{isAr ? "??? ??????" : "Mobile Number"}</span>
            </div>

            {otpStage === "request" ? (
              <input
                type="tel"
                inputMode="tel"
                value={mobile}
                onChange={(event) => onMobileChange(event.target.value)}
                placeholder="+9665XXXXXXXX"
                dir="ltr"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
              />
            ) : (
              <div className="grid grid-cols-6 gap-2" dir="ltr">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpInputRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => onOtpDigitChange(index, event.target.value)}
                    onKeyDown={(event) => onOtpKeyDown(index, event)}
                    aria-label={`OTP digit ${index + 1}`}
                    className={cls(
                      "h-12 min-w-0 rounded-xl border bg-white text-center text-lg font-bold shadow-sm outline-none transition focus:ring-4 focus:ring-sky-100 sm:h-14 sm:text-xl",
                      digit ? "border-sky-600 text-sky-800" : "border-slate-200 text-slate-900",
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            className={cls(
              "rounded-[22px] border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-7 text-slate-600 sm:px-5",
              isAr ? "text-right" : "text-left",
            )}
          >
            {isAr
              ? "??? ?????? ????? ?????? ?? ?????? ??????? ???. ?? ????? ??? ?? ??? ????? ??????? ??????? ????? ???? ????? ??? ??? ?????? ???."
              : "This session is intended only for the patient or legal representative. No payment will be requested, and the code is valid only for this session."}
          </div>

          {otpStage === "verify" && maskedPhone ? (
            <div
              className={cls(
                "inline-flex w-fit items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1.5 text-sm font-semibold text-sky-800 shadow-sm",
                isAr ? "self-end flex-row-reverse" : "self-start flex-row",
              )}
            >
              <ShieldCheck size={14} />
              <span dir="ltr">{maskedPhone}</span>
            </div>
          ) : null}

          {otpExpiresAt ? (
            <div
              className={cls(
                "inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm",
                isAr ? "self-end flex-row-reverse" : "self-start flex-row",
              )}
            >
              <Clock size={12} />
              <span>
                {isAr ? "???? ???" : "Valid until"} {formatTimestamp(otpExpiresAt, lang)}
              </span>
            </div>
          ) : null}

          {attemptsRemaining !== null && attemptsRemaining > 0 && otpStage === "verify" ? (
            <p className={cls("text-xs text-slate-500", isAr ? "text-right" : "text-left")}>
              {isAr ? `????????? ????????: ${attemptsRemaining}` : `Attempts remaining: ${attemptsRemaining}`}
            </p>
          ) : null}

          {otpError ? (
            <Alert type="warning" lang={lang}>
              {otpError}
            </Alert>
          ) : null}

          {otpStage === "request" ? (
            <button
              type="button"
              onClick={onRequestOtp}
              disabled={otpRequesting}
              className={cls(
                "h-14 w-full rounded-2xl px-5 text-sm font-bold text-white shadow-[0_18px_36px_rgba(2,132,199,0.25)] transition",
                otpRequesting
                  ? "bg-slate-300 shadow-none"
                  : "bg-gradient-to-r from-sky-800 via-cyan-600 to-slate-950 hover:translate-y-[-1px]",
              )}
            >
              {otpRequesting ? (isAr ? "???? ???????..." : "Sending...") : isAr ? "????? ?????" : "Send Code"}
            </button>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onResendOtp}
                className="text-sm font-semibold text-sky-700 underline-offset-4 hover:underline"
              >
                {isAr ? "????? ????? ?????" : "Resend Code"}
              </button>

              <button
                type="button"
                onClick={onVerifyOtp}
                disabled={otpVerifying}
                className={cls(
                  "h-14 w-full rounded-2xl px-5 text-sm font-bold text-white shadow-[0_18px_36px_rgba(2,132,199,0.25)] transition sm:w-[220px]",
                  otpVerifying
                    ? "bg-slate-300 shadow-none"
                    : "bg-gradient-to-r from-sky-800 via-cyan-600 to-slate-950 hover:translate-y-[-1px]",
                )}
              >
                {otpVerifying ? (isAr ? "???? ??????..." : "Verifying...") : isAr ? "????" : "Verify"}
              </button>
            </div>
          )}

          <footer className="flex items-center justify-center gap-3 border-t border-slate-100 pt-5 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
            <span>Secured by</span>
            <Image
              src="/images/wathiqcare-logo.png"
              alt="WathiqCare"
              width={92}
              height={32}
              className="h-7 w-auto object-contain"
            />
          </footer>
        </div>
      </Card>
    </section>
  );
}

export default OtpVerificationShell;
