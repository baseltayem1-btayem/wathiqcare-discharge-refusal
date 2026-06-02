"use client";

import Image from "next/image";
import { Clock, Lock, Phone, Shield } from "lucide-react";

import { OTP_PAGE_BRANDING } from "@/lib/branding/otp-page-branding";
import { OtpVerificationBranding } from "@/components/public-signing/OtpVerificationBranding";
import { Alert, Card, cls, type Lang } from "@/components/approved-design/shared";

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
  heroTitleAr = "التحقق من هوية المستفيد",
  heroTitleEn = "Beneficiary identity verification",
}: OtpVerificationShellProps) {
  const isAr = lang === "ar";

  return (
    <OtpVerificationBranding className={cls("flex-1 px-4 py-6 md:px-6", className)}>
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col justify-center gap-6">
        <Card className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/95 shadow-[0_32px_90px_rgba(15,23,42,0.14)] backdrop-blur-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-800 via-cyan-600 to-slate-900" />
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-6 p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/90 px-5 py-3 shadow-sm">
                  <Image
                    src={OTP_PAGE_BRANDING.card.imcLogoSrc}
                    alt={OTP_PAGE_BRANDING.card.imcLogoAlt}
                    width={164}
                    height={56}
                    className="h-auto w-auto max-h-12 object-contain"
                  />
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  <Lock size={12} />
                  {isAr ? "اتصال محمي" : "Protected session"}
                </div>
              </div>

              <div className={cls("flex flex-col gap-3", isAr ? "items-end text-right" : "items-start text-left")}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/80">
                  {isAr ? "جلسة تحقق آمنة" : "Secure verification session"}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.25rem]">
                  {isAr ? "التحقق برمز OTP" : "OTP Verification"}
                </h1>
                <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                  {otpStage === "request"
                    ? isAr
                      ? "أدخل رقم الجوال المسجّل لاستلام رمز التحقق عبر رسالة SMS ومتابعة جلسة الموافقة الطبية المؤمنة."
                      : "Enter the registered mobile number to receive the OTP by SMS and continue the secured medical consent session."
                    : isAr
                      ? "أدخل الرمز المرسل إلى جوالك لإكمال التحقق والمتابعة إلى الخطوات التالية."
                      : "Enter the code sent to your mobile to complete verification and continue to the next steps."}
                </p>
              </div>

              {otpStage === "request" ? (
                <div className="flex flex-col gap-4">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                    <div className={cls("mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", isAr ? "flex-row-reverse" : "flex-row")}>
                      <Phone size={14} className="text-sky-700" />
                      <span>{isAr ? "رقم الجوال" : "Mobile number"}</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={mobile}
                      onChange={(e) => onMobileChange(e.target.value)}
                      placeholder="+9665XXXXXXXX"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      dir="ltr"
                    />
                  </div>

                  <div className={cls("rounded-[24px] border border-sky-100 bg-sky-50/75 px-5 py-4 text-sm leading-7 text-slate-600", isAr ? "text-right" : "text-left")}>
                    {isAr
                      ? "هذه الجلسة مخصصة للمريض أو الممثل النظامي فقط. لن يُطلب منك أي دفع أثناء التحقق، وسيتم استخدام الرمز لمرة واحدة ضمن هذه الجلسة فقط."
                      : "This session is intended only for the patient or legal representative. No payment will be requested during verification, and the code is valid only for this session."}
                  </div>

                  {otpError ? <Alert type="warning" lang={lang}>{otpError}</Alert> : null}

                  <button
                    onClick={onRequestOtp}
                    disabled={otpRequesting}
                    className={cls(
                      "w-full rounded-[22px] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(2,132,199,0.25)] transition-all",
                      otpRequesting
                        ? "bg-slate-300 shadow-none"
                        : "bg-gradient-to-r from-sky-800 via-cyan-600 to-slate-900 hover:translate-y-[-1px] hover:shadow-[0_24px_44px_rgba(2,132,199,0.28)]",
                    )}
                  >
                    {otpRequesting ? (isAr ? "جارٍ الإرسال..." : "Sending...") : isAr ? "إرسال الرمز" : "Send Code"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className={cls("inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-mono font-semibold text-sky-800", isAr ? "self-end flex-row-reverse" : "self-start flex-row")}>
                    <Shield size={14} />
                    <span>{maskedPhone || mobile}</span>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {isAr ? "أدخل الرمز" : "Enter code"}
                      </p>
                      {attemptsRemaining !== null && attemptsRemaining > 0 ? (
                        <span className="text-xs font-medium text-slate-500">
                          {isAr ? `محاولات متبقية: ${attemptsRemaining}` : `Attempts remaining: ${attemptsRemaining}`}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex justify-center gap-2" dir="ltr">
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            otpInputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => onOtpDigitChange(index, e.target.value)}
                          onKeyDown={(e) => onOtpKeyDown(index, e)}
                          aria-label={`OTP digit ${index + 1}`}
                          className={cls(
                            "h-14 w-12 rounded-2xl border bg-white text-center text-xl font-bold shadow-sm outline-none transition-all focus:ring-4 focus:ring-sky-100 sm:h-16 sm:w-14",
                            digit ? "border-sky-600 text-sky-800" : "border-slate-200 text-slate-900",
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {otpExpiresAt ? (
                    <div className={cls("inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm", isAr ? "self-end flex-row-reverse" : "self-start flex-row")}>
                      <Clock size={12} />
                      <span>
                        {isAr ? "صالح حتى" : "Valid until"}{" "}
                        {formatTimestamp(otpExpiresAt, lang)}
                      </span>
                    </div>
                  ) : null}

                  {otpError ? <Alert type="warning" lang={lang}>{otpError}</Alert> : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      onClick={onResendOtp}
                      className="text-sm font-medium text-sky-700 underline-offset-4 hover:underline"
                    >
                      {isAr ? "إعادة إرسال الرمز" : "Resend code"}
                    </button>
                    <button
                      onClick={onVerifyOtp}
                      disabled={otpVerifying}
                      className={cls(
                        "w-full rounded-[22px] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(2,132,199,0.25)] transition-all sm:ml-auto sm:w-auto sm:min-w-[220px]",
                        otpVerifying
                          ? "bg-slate-300 shadow-none"
                          : "bg-gradient-to-r from-sky-800 via-cyan-600 to-slate-900 hover:translate-y-[-1px] hover:shadow-[0_24px_44px_rgba(2,132,199,0.28)]",
                      )}
                    >
                      {otpVerifying ? (isAr ? "جارٍ التحقق..." : "Verifying...") : isAr ? "تحقق" : "Verify"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(2,132,199,0.05),rgba(15,23,42,0.02))] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div className="flex h-full flex-col justify-between gap-6">
                <div className={cls("flex flex-col gap-3", isAr ? "items-end text-right" : "items-start text-left")}>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">
                    <Phone size={22} />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {isAr ? heroTitleAr : heroTitleEn}
                  </h2>
                  <p className="text-sm leading-7 text-slate-600">
                    {isAr
                      ? "نستخدم رمز تحقق لمرة واحدة لربط الجلسة الحالية بالمريض أو الممثل النظامي المصرح له فقط، مع الحفاظ على سرية بيانات الموافقة الطبية."
                      : "A one-time verification code is used to bind this session to the intended patient or authorized legal representative while preserving consent confidentiality."}
                  </p>
                </div>

                <div className="space-y-3 rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                  <div className={cls("flex items-start gap-3", isAr ? "flex-row-reverse text-right" : "flex-row text-left")}>
                    <Shield size={18} className="mt-0.5 text-sky-700" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {isAr ? "جلسة موثقة وآمنة" : "Audited secure session"}
                      </p>
                      <p className="text-xs leading-6 text-slate-500">
                        {isAr
                          ? "كل خطوة في التحقق تُسجّل ضمن مسار التدقيق الخاص بالموافقة."
                          : "Each verification step is recorded in the consent audit trail."}
                      </p>
                    </div>
                  </div>
                  <div className={cls("flex items-start gap-3", isAr ? "flex-row-reverse text-right" : "flex-row text-left")}>
                    <Lock size={18} className="mt-0.5 text-sky-700" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {isAr ? "بدون أي دفع أو مشاركة خارجية" : "No payments or external sharing"}
                      </p>
                      <p className="text-xs leading-6 text-slate-500">
                        {isAr
                          ? "لن يُطلب منك أي دفع أو مشاركة بيانات خارج إطار جلسة الموافقة الحالية."
                          : "No payment or data sharing is requested outside this consent session."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </OtpVerificationBranding>
  );
}
                                <div className="flex flex-col gap-4">
                                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                                    <div
                                      className={cls(
                                        "mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500",
                                        lang === "ar" ? "flex-row-reverse" : "flex-row",
                                      )}
                                    >
                                      <Phone size={14} className="text-sky-700" />
                                      <span>{lang === "ar" ? "رقم الجوال" : "Mobile number"}</span>
                                    </div>
                                    <input
                                      type="tel"
                                      inputMode="tel"
                                      value={mobile}
                                      onChange={(event) => onMobileChange(event.target.value)}
                                      placeholder="+9665XXXXXXXX"
                                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                      dir="ltr"
                                    />
                                  </div>

                                  <div
                                    className={cls(
                                      "rounded-[24px] border border-sky-100 bg-sky-50/75 px-5 py-4 text-sm leading-7 text-slate-600",
                                      lang === "ar" ? "text-right" : "text-left",
                                    )}
                                  >
                                    {lang === "ar"
                                      ? "هذه الجلسة مخصصة للمريض أو الممثل النظامي فقط. لن يُطلب منك أي دفع أثناء التحقق، وسيتم استخدام الرمز لمرة واحدة ضمن هذه الجلسة فقط."
                                      : "This session is intended only for the patient or legal representative. No payment will be requested during verification, and the code is valid only for this session."}
                                  </div>

                                  {otpError ? <Alert type="warning" lang={lang}>{otpError}</Alert> : null}

                                  <button
                                    onClick={onRequestOtp}
                                    disabled={otpRequesting}
                                    className={cls(
                                      "w-full rounded-[22px] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(2,132,199,0.25)] transition-all",
                                      otpRequesting
                                        ? "bg-slate-300 shadow-none"
                                        : "bg-gradient-to-r from-sky-800 via-cyan-600 to-slate-900 hover:translate-y-[-1px] hover:shadow-[0_24px_44px_rgba(2,132,199,0.28)]",
                                    )}
                                  >
                                    {otpRequesting
                                      ? lang === "ar"
                                        ? "جارٍ الإرسال…"
                                        : "Sending…"
                                      : lang === "ar"
                                        ? "إرسال الرمز"
                                        : "Send Code"}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-5">
                                  <div
                                    className={cls(
                                      "inline-flex items-center gap-2 self-start rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-mono font-semibold text-sky-800",
                                      lang === "ar" ? "self-end flex-row-reverse" : "self-start flex-row",
                                    )}
                                  >
                                    <Shield size={14} />
                                    <span>{maskedPhone || mobile}</span>
                                  </div>

                                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-5 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        {lang === "ar" ? "أدخل الرمز" : "Enter code"}
                                      </p>
                                      {attemptsRemaining !== null && attemptsRemaining > 0 ? (
                                        <span className="text-xs font-medium text-slate-500">
                                          {lang === "ar"
                                            ? `محاولات متبقية: ${attemptsRemaining}`
                                            : `Attempts remaining: ${attemptsRemaining}`}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="flex justify-center gap-2" dir="ltr">
                                      {otpDigits.map((digit, index) => (
                                        <input
                                          key={index}
                                          ref={(element) => {
                                            setOtpInputRef(index, element);
                                          }}
                                          type="text"
                                          inputMode="numeric"
                                          maxLength={1}
                                          value={digit}
                                          onChange={(event) => onOtpDigitChange(index, event.target.value)}
                                          onKeyDown={(event) => onOtpKey(index, event)}
                                          aria-label={`OTP digit ${index + 1}`}
                                          className={cls(
                                            "h-14 w-12 rounded-2xl border bg-white text-center text-xl font-bold shadow-sm outline-none transition-all focus:ring-4 focus:ring-sky-100 sm:h-16 sm:w-14",
                                            digit ? "border-sky-600 text-sky-800" : "border-slate-200 text-slate-900",
                                          )}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  {(timeRemainingLabel || otpExpiresAt) ? (
                                    <div
                                      className={cls(
                                        "flex flex-col gap-2",
                                        lang === "ar" ? "items-end text-right" : "items-start text-left",
                                      )}
                                    >
                                      {timeRemainingLabel ? (
                                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                                          <Clock size={12} />
                                          <span>{timeRemainingLabel}</span>
                                        </div>
                                      ) : null}
                                      {otpExpiresAt ? (
                                        <div
                                          className={cls(
                                            "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm",
                                            lang === "ar" ? "flex-row-reverse" : "flex-row",
                                          )}
                                        >
                                          <Clock size={12} />
                                          <span>
                                            {lang === "ar" ? "صالح حتى" : "Valid until"}{" "}
                                            {formatTimestamp(otpExpiresAt, lang)}
                                          </span>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}

                                  {otpError ? <Alert type="warning" lang={lang}>{otpError}</Alert> : null}

                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <button
                                      onClick={onResetToRequest}
                                      className="text-sm font-medium text-sky-700 underline-offset-4 hover:underline"
                                    >
                                      {lang === "ar" ? "إعادة إرسال الرمز" : "Resend code"}
                                    </button>
                                    <button
                                      onClick={onVerifyOtp}
                                      disabled={otpVerifying}
                                      className={cls(
                                        "w-full rounded-[22px] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(2,132,199,0.25)] transition-all sm:ml-auto sm:w-auto sm:min-w-[220px]",
                                        otpVerifying
                                          ? "bg-slate-300 shadow-none"
                                          : "bg-gradient-to-r from-sky-800 via-cyan-600 to-slate-900 hover:translate-y-[-1px] hover:shadow-[0_24px_44px_rgba(2,132,199,0.28)]",
                                      )}
                                    >
                                      {otpVerifying
                                        ? lang === "ar"
                                          ? "جارٍ التحقق…"
                                          : "Verifying…"
                                        : lang === "ar"
                                          ? "تحقق"
                                          : "Verify"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(2,132,199,0.05),rgba(15,23,42,0.02))] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
                              <div className="flex h-full flex-col justify-between gap-6">
                                <div className={cls("flex flex-col gap-3", lang === "ar" ? "items-end text-right" : "items-start text-left")}>
                                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">
                                    <Phone size={22} />
                                  </div>
                                  <h2 className="text-xl font-semibold text-slate-950">
                                    {lang === "ar" ? "التحقق من هوية المستفيد" : "Beneficiary identity verification"}
                                  </h2>
                                  <p className="text-sm leading-7 text-slate-600">
                                    {lang === "ar"
                                      ? "نستخدم رمز تحقق لمرة واحدة لربط الجلسة الحالية بالمريض أو الممثل النظامي المصرح له فقط، مع الحفاظ على سرية بيانات الموافقة الطبية."
                                      : "A one-time verification code is used to bind this session to the intended patient or authorized legal representative while preserving consent confidentiality."}
                                  </p>
                                </div>

                                <div className="space-y-3 rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                                  <div className={cls("flex items-start gap-3", lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left")}>
                                    <Shield size={18} className="mt-0.5 text-sky-700" />
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">
                                        {lang === "ar" ? "جلسة موثقة وآمنة" : "Audited secure session"}
                                      </p>
                                      <p className="text-xs leading-6 text-slate-500">
                                        {lang === "ar"
                                          ? "كل خطوة في التحقق تُسجّل ضمن مسار التدقيق الخاص بالموافقة."
                                          : "Each verification step is recorded in the consent audit trail."}
                                      </p>
                                    </div>
                                  </div>
                                  <div className={cls("flex items-start gap-3", lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left")}>
                                    <Lock size={18} className="mt-0.5 text-sky-700" />
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">
                                        {lang === "ar" ? "بدون أي دفع أو مشاركة خارجية" : "No payments or external sharing"}
                                      </p>
                                      <p className="text-xs leading-6 text-slate-500">
                                        {lang === "ar"
                                          ? "لن يُطلب منك أي دفع أو مشاركة بيانات خارج إطار جلسة الموافقة الحالية."
                                          : "No payment or data sharing is requested outside this consent session."}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </OtpVerificationBranding>
                  );
                }
                          {lang === "ar" ? "أدخل الرمز" : "Enter code"}
                        </p>
                        {attemptsRemaining !== null && attemptsRemaining > 0 ? (
                          <span className="text-xs font-medium text-slate-500">
                            {lang === "ar"
                              ? `محاولات متبقية: ${attemptsRemaining}`
                              : `Attempts remaining: ${attemptsRemaining}`}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex gap-2 justify-center" dir="ltr">
                        {otpDigits.map((digit, index) => (
                          <input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(event) => onOtpDigitChange?.(index, event.target.value)}
                            onKeyDown={(event) => onOtpKeyDown?.(index, event)}
                            aria-label={`OTP digit ${index + 1}`}
                            className={cls(
                              "h-14 w-12 rounded-2xl border bg-white text-center text-xl font-bold shadow-sm outline-none transition-all focus:ring-4 focus:ring-sky-100 sm:h-16 sm:w-14",
                              digit ? "border-sky-600 text-sky-800" : "border-slate-200 text-slate-900",
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {(timeRemainingLabel || otpExpiresAt) ? (
                      <div className="flex flex-col gap-2">
                        {timeRemainingLabel ? (
                          <div
                            className={cls(
                              "inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800",
                              lang === "ar" ? "self-end flex-row-reverse" : "self-start flex-row",
                            )}
                          >
                            <Clock size={12} />
                            <span>
                              {lang === "ar"
                                ? `الوقت المتبقي ${timeRemainingLabel}`
                                : `Time remaining ${timeRemainingLabel}`}
                            </span>
                          </div>
                        ) : null}

                        {otpExpiresAt ? (
                          <div
                            className={cls(
                              "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm",
                              lang === "ar" ? "self-end flex-row-reverse" : "self-start flex-row",
                            )}
                          >
                            <Clock size={12} />
                            <span>
                              {lang === "ar" ? "صالح حتى" : "Valid until"}{" "}
                              {formatTimestamp(otpExpiresAt, lang)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {otpError ? <Alert type="warning" lang={lang}>{otpError}</Alert> : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button
                        onClick={onResetToRequest}
                        className="text-sm font-medium text-sky-700 underline-offset-4 hover:underline"
                      >
                        {lang === "ar" ? "إعادة إرسال الرمز" : "Resend code"}
                      </button>
                      <button
                        onClick={onVerifyOtp}
                        disabled={otpVerifying}
                        className={cls(
                          "w-full rounded-[22px] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(2,132,199,0.25)] transition-all sm:ml-auto sm:w-auto sm:min-w-[220px]",
                          otpVerifying
                            ? "bg-slate-300 shadow-none"
                            : "bg-gradient-to-r from-sky-800 via-cyan-600 to-slate-900 hover:translate-y-[-1px] hover:shadow-[0_24px_44px_rgba(2,132,199,0.28)]",
                        )}
                      >
                        {otpVerifying
                          ? lang === "ar"
                            ? "جارٍ التحقق…"
                            : "Verifying…"
                          : lang === "ar"
                            ? "تحقق"
                            : "Verify"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(2,132,199,0.05),rgba(15,23,42,0.02))] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
                <div className="flex h-full flex-col justify-between gap-6">
                  <div className={cls("flex flex-col gap-3", lang === "ar" ? "items-end text-right" : "items-start text-left")}>
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">
                      <Phone size={22} />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {lang === "ar" ? "التحقق من هوية المستفيد" : "Beneficiary identity verification"}
                    </h2>
                    <p className="text-sm leading-7 text-slate-600">
                      {lang === "ar"
                        ? "نستخدم رمز تحقق لمرة واحدة لربط الجلسة الحالية بالمريض أو الممثل النظامي المصرح له فقط، مع الحفاظ على سرية بيانات الموافقة الطبية."
                        : "A one-time verification code is used to bind this session to the intended patient or authorized legal representative while preserving consent confidentiality."}
                    </p>
                  </div>

                  <div className="space-y-3 rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                    <div className={cls("flex items-start gap-3", lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left")}>
                      <Shield size={18} className="mt-0.5 text-sky-700" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {lang === "ar" ? "جلسة موثقة وآمنة" : "Audited secure session"}
                        </p>
                        <p className="text-xs leading-6 text-slate-500">
                          {lang === "ar"
                            ? "كل خطوة في التحقق تُسجّل ضمن مسار التدقيق الخاص بالموافقة."
                            : "Each verification step is recorded in the consent audit trail."}
                        </p>
                      </div>
                    </div>
                    <div className={cls("flex items-start gap-3", lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left")}>
                      <Lock size={18} className="mt-0.5 text-sky-700" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {lang === "ar" ? "بدون أي دفع أو مشاركة خارجية" : "No payments or external sharing"}
                        </p>
                        <p className="text-xs leading-6 text-slate-500">
                          {lang === "ar"
                            ? "لن يُطلب منك أي دفع أو مشاركة بيانات خارج إطار جلسة الموافقة الحالية."
                            : "No payment or data sharing is requested outside this consent session."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </OtpVerificationBranding>
    </Card>
  );
}