"use client";

import { CalendarClock, Languages, MonitorSmartphone, PenTool, UserCheck, UserRoundCog } from "lucide-react";
import { type ComponentType } from "react";
import PatientSigningPanel from "@/components/modules/informed-consent-signing/PatientSigningPanel";
import SignatureEvidenceSummary from "@/components/modules/informed-consent-signing/SignatureEvidenceSummary";
import SignatureMethodSelector from "@/components/modules/informed-consent-signing/SignatureMethodSelector";
import { type SignatureState } from "./types";

type SignaturePanelProps = {
  biometricEnabled?: boolean;
  tabletEnabled?: boolean;
  value: SignatureState;
  onChange: (next: SignatureState) => void;
  timestamp: string;
};

type SignerKey = "physicianSigned" | "witnessSigned" | "interpreterSigned";

const SIGNATURE_CARDS: Array<{
  key: SignerKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  optional?: boolean;
}> = [
  { key: "physicianSigned", label: "Physician Signature", icon: UserCheck },
  { key: "witnessSigned", label: "Witness Signature", icon: UserRoundCog },
  { key: "interpreterSigned", label: "Interpreter Signature", icon: Languages, optional: true },
];

function computeEvidenceState(value: SignatureState): Pick<SignatureState, "patientSigned" | "signatureEvidenceReady" | "signatureEvidenceReference"> {
  const usesTablet = value.selectedMethod === "tablet-drawn-signature" || value.selectedMethod === "combined-tablet-and-otp";
  const usesBiometric = value.selectedMethod === "biometric-fingerprint" || value.selectedMethod === "combined-biometric-and-otp";
  const requiresOtp = value.selectedMethod === "otp" || value.selectedMethod === "combined-tablet-and-otp" || value.selectedMethod === "combined-biometric-and-otp";

  const ready = value.acknowledgmentAccepted && (
    (value.selectedMethod === "otp" && value.otpVerified) ||
    (usesTablet && value.signatureDataUrl.length > 0 && (!requiresOtp || value.otpVerified)) ||
    (
      usesBiometric &&
      value.biometricVerified &&
      value.biometricDeviceReference.trim().length > 0 &&
      value.biometricTransactionId.trim().length > 0 &&
      value.biometricVerificationHash.trim().length > 0 &&
      value.biometricSdkProvider === "HID DigitalPersona" &&
      value.biometricDeviceModel === "DigitalPersona 4500" &&
      (!requiresOtp || value.otpVerified)
    )
  );

  return {
    patientSigned: ready,
    signatureEvidenceReady: ready,
    signatureEvidenceReference: ready ? `PENDING-SAVE-${value.selectedMethod.toUpperCase()}` : "",
  };
}

export default function SignaturePanel({ biometricEnabled = false, tabletEnabled = true, value, onChange, timestamp }: SignaturePanelProps) {
  const applyChange = (next: SignatureState) => onChange({ ...next, ...computeEvidenceState(next) });

  return (
    <section className="wc-panel border-slate-200 bg-white">
      <div className="mb-3">
        <h2 className="wc-panel-heading !mb-0">التوقيع والمصادقة | Signature & Authentication</h2>
        <p className="text-[11px] text-slate-500">Production-readiness signing flow with bedside tablet capture, compliance-controlled biometric verification, and preserved OTP fallback.</p>
      </div>

      <div className="mb-3 space-y-3">
        <SignatureMethodSelector
          biometricEnabled={biometricEnabled}
          tabletEnabled={tabletEnabled}
          value={value.selectedMethod}
          onChange={(selectedMethod) => applyChange({ ...value, selectedMethod })}
        />
        <PatientSigningPanel value={value} onChange={applyChange} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
        {SIGNATURE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <label key={card.key} className="space-y-2 rounded border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-center">
              <Icon className="mx-auto h-4 w-4 text-slate-500" />
              <p className="text-[11px] font-semibold text-slate-700">{card.label}</p>
              <div className="flex h-16 items-center justify-center rounded border border-slate-200 bg-white text-[10px] text-slate-400">
                Staff confirmation ready
              </div>
              <label className="inline-flex items-center gap-1 text-[10px] text-slate-600">
                <input
                  type="checkbox"
                  checked={value[card.key]}
                  onChange={(event) => applyChange({ ...value, [card.key]: event.target.checked })}
                  className="h-3.5 w-3.5"
                />
                Mark signed {card.optional ? "(if applicable)" : ""}
              </label>
            </label>
          );
        })}
      </div>

      <div className="mt-3">
        <SignatureEvidenceSummary value={value} />
      </div>

      <div className="mt-3 grid gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 sm:grid-cols-3">
        <div className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Date/time auto-stamp: {timestamp}</div>
        <div className="flex items-center gap-1"><MonitorSmartphone className="h-3.5 w-3.5" /> Capture device: {value.deviceLabel || value.biometricDeviceReference || "Pending bedside device selection"}</div>
        <div className="flex items-center gap-1"><UserRoundCog className="h-3.5 w-3.5" /> Audit trail: server evidence routes available once a live consent document exists</div>
      </div>
      <div className="mt-2 grid gap-2 rounded border border-slate-200 bg-white p-3 text-[11px] text-slate-600 sm:grid-cols-2">
        <div><strong>Evidence route:</strong> /api/modules/informed-consents/signature/{value.selectedMethod.includes("biometric") ? "biometric" : "tablet"}</div>
        <div><strong>Legal package readiness:</strong> {value.signatureEvidenceReady ? "Signing evidence prepared" : "Signing evidence incomplete"}</div>
        <div><strong>Immutable PDF reference:</strong> generated on finalization only</div>
        <div><strong>Signer state:</strong> {value.patientSigned ? "Patient evidence captured" : "Patient evidence pending"}</div>
      </div>
    </section>
  );
}
