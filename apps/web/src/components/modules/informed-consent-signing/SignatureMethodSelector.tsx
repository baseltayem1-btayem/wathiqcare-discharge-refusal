"use client";

import type { SignatureState } from "@/components/modules/informed-consent-issuance/types";

type SignatureMethodSelectorProps = {
  biometricEnabled: boolean;
  tabletEnabled: boolean;
  value: SignatureState["selectedMethod"];
  onChange: (method: SignatureState["selectedMethod"]) => void;
};

const METHOD_OPTIONS: Array<{
  value: SignatureState["selectedMethod"];
  title: string;
  subtitle: string;
  requiresTablet?: boolean;
  requiresBiometric?: boolean;
}> = [
  { value: "otp", title: "OTP only", subtitle: "Remote-safe patient approval with existing OTP flow." },
  { value: "tablet-drawn-signature", title: "Tablet handwritten signature", subtitle: "In-hospital bedside signature captured on tablet.", requiresTablet: true },
  { value: "combined-tablet-and-otp", title: "Tablet + OTP", subtitle: "Handwritten bedside signature plus OTP confirmation.", requiresTablet: true },
  { value: "biometric-fingerprint", title: "Biometric verification", subtitle: "Mock verification-only flow for approved fingerprint devices.", requiresBiometric: true },
  { value: "combined-biometric-and-otp", title: "Biometric + OTP", subtitle: "Biometric verification with OTP fallback evidence.", requiresBiometric: true },
];

export default function SignatureMethodSelector({ biometricEnabled, tabletEnabled, value, onChange }: SignatureMethodSelectorProps) {
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {METHOD_OPTIONS.map((option) => {
        const disabled = (option.requiresTablet && !tabletEnabled) || (option.requiresBiometric && !biometricEnabled);
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-xl border p-3 text-left transition ${value === option.value ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"} ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-sky-300"}`}
          >
            <div className="text-sm font-semibold text-slate-900">{option.title}</div>
            <div className="mt-1 text-xs text-slate-600">{option.subtitle}</div>
            {disabled ? <div className="mt-2 text-[11px] text-amber-700">Disabled by feature flag.</div> : null}
          </button>
        );
      })}
    </div>
  );
}