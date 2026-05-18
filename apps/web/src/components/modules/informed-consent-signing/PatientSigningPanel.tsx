"use client";

import { LoaderCircle } from "lucide-react";
import { captureFingerprintVerification, detectDigitalPersona4500, DIGITALPERSONA_LOCAL_AGENT_ENDPOINT } from "@/lib/signature/digitalpersona-local-agent-client";
import TabletSignaturePad from "./TabletSignaturePad";
import type { SignatureState } from "@/components/modules/informed-consent-issuance/types";

type PatientSigningPanelProps = {
  value: SignatureState;
  onChange: (next: SignatureState) => void;
};

export default function PatientSigningPanel({ value, onChange }: PatientSigningPanelProps) {
  const usesTablet = value.selectedMethod === "tablet-drawn-signature" || value.selectedMethod === "combined-tablet-and-otp";
  const usesBiometric = value.selectedMethod === "biometric-fingerprint" || value.selectedMethod === "combined-biometric-and-otp";

  async function handleDetectLocalAgent() {
    onChange({ ...value, biometricLocalAgentStatus: "detecting", biometricLocalAgentMessage: "Checking HID DigitalPersona local agent..." });

    try {
      const detection = await detectDigitalPersona4500();
      onChange({
        ...value,
        biometricLocalAgentStatus: detection.available ? "ready" : "unavailable",
        biometricLocalAgentMessage: detection.available
          ? `Local agent available for ${detection.sdkProvider} ${detection.deviceModel}.`
          : "Local agent unavailable. UAT mock mode can be used until the HID SDK is installed.",
        biometricSdkProvider: detection.sdkProvider,
        biometricDeviceModel: detection.deviceModel,
      });
    } catch (error) {
      onChange({
        ...value,
        biometricLocalAgentStatus: "error",
        biometricLocalAgentMessage: error instanceof Error ? error.message : "Failed to detect local biometric agent.",
      });
    }
  }

  async function handleCaptureBiometricVerification() {
    onChange({ ...value, biometricLocalAgentStatus: "verifying", biometricLocalAgentMessage: "Requesting verification from HID DigitalPersona local agent..." });

    try {
      const verification = await captureFingerprintVerification({
        method: value.selectedMethod === "combined-biometric-and-otp" ? "combined-biometric-and-otp" : "biometric-fingerprint",
      });

      onChange({
        ...value,
        biometricVerified: verification.verified,
        biometricDeviceReference: verification.deviceReference,
        biometricTransactionId: verification.transactionId,
        biometricVerificationHash: verification.verificationHash,
        biometricTimestamp: verification.timestamp,
        biometricSdkProvider: verification.sdkProvider,
        biometricDeviceModel: verification.deviceModel,
        biometricLocalAgentStatus: verification.verified ? "verified" : "error",
        biometricLocalAgentMessage: verification.verified
          ? `${verification.sdkProvider} ${verification.deviceModel} verification captured through local agent.`
          : "Biometric verification was not completed.",
      });
    } catch (error) {
      onChange({
        ...value,
        biometricLocalAgentStatus: "error",
        biometricLocalAgentMessage: error instanceof Error ? error.message : "Biometric verification failed.",
      });
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="space-y-1 text-xs text-slate-700">
          <span className="font-medium">Patient acknowledgment</span>
          <span className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
            <input
              type="checkbox"
              checked={value.acknowledgmentAccepted}
              onChange={(event) => onChange({ ...value, acknowledgmentAccepted: event.target.checked })}
              className="h-4 w-4"
            />
            I confirm the patient reviewed the explanation and agreed to sign.
          </span>
        </label>

        <label className="space-y-1 text-xs text-slate-700">
          <span className="font-medium">OTP verification</span>
          <span className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
            <input
              type="checkbox"
              checked={value.otpVerified}
              onChange={(event) => onChange({ ...value, otpVerified: event.target.checked })}
              className="h-4 w-4"
            />
            OTP challenge verified for patient or guardian.
          </span>
        </label>
      </div>

      {usesTablet ? (
        <div className="space-y-3">
          <TabletSignaturePad value={value.signatureDataUrl} onChange={(signatureDataUrl) => onChange({ ...value, signatureDataUrl })} />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-700">
              <span className="mb-1 block font-medium">Tablet device label</span>
              <input
                type="text"
                value={value.deviceLabel}
                onChange={(event) => onChange({ ...value, deviceLabel: event.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-xs text-slate-700">
              <span className="mb-1 block font-medium">Witness / staff confirmation</span>
              <input
                type="text"
                value={value.staffWitnessName}
                onChange={(event) => onChange({ ...value, staffWitnessName: event.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2"
                placeholder="Optional"
              />
            </label>
          </div>
        </div>
      ) : null}

      {usesBiometric ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDetectLocalAgent}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              disabled={value.biometricLocalAgentStatus === "detecting" || value.biometricLocalAgentStatus === "verifying"}
            >
              {value.biometricLocalAgentStatus === "detecting" ? <LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : null}
              Detect DigitalPersona 4500
            </button>
            <button
              type="button"
              onClick={handleCaptureBiometricVerification}
              className="rounded border border-sky-600 bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={value.biometricLocalAgentStatus === "detecting" || value.biometricLocalAgentStatus === "verifying"}
            >
              {value.biometricLocalAgentStatus === "verifying" ? <LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : null}
              Verify via HID Local Agent
            </button>
          </div>

          <div className="rounded border border-slate-200 bg-white p-3 text-[11px] text-slate-600">
            <div><strong>Local agent endpoint:</strong> {DIGITALPERSONA_LOCAL_AGENT_ENDPOINT}</div>
            <div><strong>Status:</strong> {value.biometricLocalAgentStatus}</div>
            <div><strong>Message:</strong> {value.biometricLocalAgentMessage || "Awaiting local agent verification."}</div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="text-xs text-slate-700">
              <span className="mb-1 block font-medium">Device reference</span>
              <div className="rounded border border-slate-300 bg-white px-3 py-2">{value.biometricDeviceReference || "-"}</div>
            </div>
            <div className="text-xs text-slate-700">
              <span className="mb-1 block font-medium">Transaction ID</span>
              <div className="rounded border border-slate-300 bg-white px-3 py-2">{value.biometricTransactionId || "-"}</div>
            </div>
            <div className="text-xs text-slate-700">
              <span className="mb-1 block font-medium">Verification hash</span>
              <div className="rounded border border-slate-300 bg-white px-3 py-2 break-all">{value.biometricVerificationHash || "-"}</div>
            </div>
            <div className="text-xs text-slate-700">
              <span className="mb-1 block font-medium">Provider / model</span>
              <div className="rounded border border-slate-300 bg-white px-3 py-2">{value.biometricSdkProvider || "-"} {value.biometricDeviceModel || ""}</div>
            </div>
          </div>

          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
            HID DigitalPersona SDK or approved HID driver is required. Windows Hello WBF driver alone is not sufficient for full WathiqCare evidence integration. Production activation requires Legal, PDPL, Cybersecurity, and vendor SDK approval.
          </div>
        </div>
      ) : null}
    </div>
  );
}