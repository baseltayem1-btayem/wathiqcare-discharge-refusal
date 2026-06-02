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
}
