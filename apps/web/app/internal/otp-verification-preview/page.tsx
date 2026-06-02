"use client";

import { useRef, useState } from "react";

import { OtpVerificationShell } from "@/components/public-signing/OtpVerificationShell";
import type { Lang } from "@/components/approved-design/shared";

function previewFormatTimestamp(): string {
  return "06/01/2026, 01:59:15 AM";
}

export default function OtpVerificationPreviewPage() {
  const [lang] = useState<Lang>("ar");
  const [mobile, setMobile] = useState("*********7771");
  const [otpDigits, setOtpDigits] = useState(["1", "2", "3", "4", "5", "6"]);
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <OtpVerificationShell
        lang={lang}
        mobile={mobile}
        maskedPhone="*********7771"
        otpStage="verify"
        otpDigits={otpDigits}
        otpRequesting={false}
        otpVerifying={false}
        otpExpiresAt="2026-06-01T01:59:15.000Z"
        otpError="رمز غير صحيح. حاول مرة أخرى"
        attemptsRemaining={null}
        onMobileChange={setMobile}
        onOtpDigitChange={(index, value) => {
          setOtpDigits((current) => {
            const next = [...current];
            next[index] = value.replace(/[^0-9]/g, "").slice(0, 1);
            return next;
          });
        }}
        onOtpKeyDown={() => {}}
        onRequestOtp={() => {}}
        onVerifyOtp={() => {}}
        onResendOtp={() => {}}
        otpInputRefs={otpInputsRef}
        formatTimestamp={previewFormatTimestamp as (iso: string, lang: Lang) => string}
        heroTitleAr="التحقق من هوية المستفيد"
        heroTitleEn="Beneficiary identity verification"
      />
      <div className="mx-auto -mt-10 max-w-2xl px-4 pb-10 text-center text-sm text-slate-500" dir="ltr">
        <p>Time remaining 07:59</p>
      </div>
    </div>
  );
}"use client";

import { useState } from "react";

import { MobileHeader, cls, type Lang } from "@/components/approved-design/shared";
import { OtpVerificationShell } from "@/components/public-signing/OtpVerificationShell";

const PREVIEW_OTP_DIGITS = ["1", "2", "3", "4", "5", "6"];
const PREVIEW_VALID_UNTIL = "06/01/2026, 01:59:15 AM";

export default function OtpVerificationPreviewPage() {
  const [lang, setLang] = useState<Lang>("ar");

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-sans" : "font-sans")}
    >
      <MobileHeader
        lang={lang}
        onLangToggle={() => setLang((current) => (current === "ar" ? "en" : "ar"))}
        step={2}
        totalSteps={7}
      />
      <div className="flex-1 px-4 py-6 flex flex-col gap-5 max-w-6xl mx-auto w-full">
        <OtpVerificationShell
          lang={lang}
          procedureTitle={lang === "ar" ? "موافقة ولي الأمر / القاصر / فاقد الأهلية" : "Guardian / Minor / Incapacitated Patient Consent"}
          versionLabel="PREVIEW-OTP-SHELL"
          mobile="*********7771"
          maskedPhone="*********7771"
          otpStage="verify"
          otpDigits={PREVIEW_OTP_DIGITS}
          attemptsRemaining={1}
          otpExpiresAt={PREVIEW_VALID_UNTIL}
          otpError={lang === "ar" ? "رمز غير صحيح. حاول مرة أخرى" : "Incorrect code. Please try again."}
          otpRequesting={false}
          otpVerifying={false}
          timeRemainingLabel="07:59"
          onMobileChange={() => {}}
          onRequestOtp={() => {}}
          onOtpDigitChange={() => {}}
          onOtpKeyDown={() => {}}
          onResetToRequest={() => {}}
          onVerifyOtp={() => {}}
