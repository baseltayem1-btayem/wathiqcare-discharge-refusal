"use client";

import type { SignatureState } from "@/components/modules/informed-consent-issuance/types";

type SignatureEvidenceSummaryProps = {
  value: SignatureState;
};

function methodLabel(method: SignatureState["selectedMethod"]): string {
  if (method === "tablet-drawn-signature") return "Tablet handwritten signature";
  if (method === "combined-tablet-and-otp") return "Tablet + OTP";
  if (method === "biometric-fingerprint") return "Biometric verification";
  if (method === "combined-biometric-and-otp") return "Biometric + OTP";
  return "OTP only";
}

export default function SignatureEvidenceSummary({ value }: SignatureEvidenceSummaryProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <div className="mb-2 font-semibold text-slate-900">Signature Evidence Summary</div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <div><strong>Method:</strong> {methodLabel(value.selectedMethod)}</div>
        <div><strong>Patient acknowledgment:</strong> {value.acknowledgmentAccepted ? "Accepted" : "Pending"}</div>
        <div><strong>OTP:</strong> {value.otpVerified ? "Verified" : "Not verified"}</div>
        <div><strong>Evidence state:</strong> {value.signatureEvidenceReady ? "Ready" : "Incomplete"}</div>
        <div><strong>Reference:</strong> {value.signatureEvidenceReference || "Will be assigned on server save"}</div>
        <div><strong>Tablet device:</strong> {value.deviceLabel || "-"}</div>
        <div><strong>Biometric device:</strong> {value.biometricDeviceReference || "-"}</div>
        <div><strong>Biometric transaction:</strong> {value.biometricTransactionId || "-"}</div>
        <div><strong>Verification hash:</strong> {value.biometricVerificationHash || "-"}</div>
        <div><strong>SDK provider:</strong> {value.biometricSdkProvider || "-"}</div>
        <div><strong>Device model:</strong> {value.biometricDeviceModel || "-"}</div>
      </div>
    </div>
  );
}