"use client";

import { CalendarClock, Fingerprint, Languages, MonitorSmartphone, PenTool, UserCheck, UserRoundCog } from "lucide-react";
import { type ComponentType } from "react";
import { type SignatureState } from "./types";

type SignaturePanelProps = {
  value: SignatureState;
  onChange: (next: SignatureState) => void;
  timestamp: string;
};

type SignerKey = "patientSigned" | "physicianSigned" | "witnessSigned" | "interpreterSigned";

const SIGNATURE_CARDS: Array<{
  key: SignerKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  optional?: boolean;
}> = [
  { key: "patientSigned", label: "Patient Signature", icon: PenTool },
  { key: "physicianSigned", label: "Physician Signature", icon: UserCheck },
  { key: "witnessSigned", label: "Witness Signature", icon: UserRoundCog },
  { key: "interpreterSigned", label: "Interpreter Signature", icon: Languages, optional: true },
];

export default function SignaturePanel({ value, onChange, timestamp }: SignaturePanelProps) {
  return (
    <section className="wc-panel border-slate-200 bg-white">
      <div className="mb-3">
        <h2 className="wc-panel-heading !mb-0">التوقيع والمصادقة | Signature & Authentication</h2>
        <p className="text-[11px] text-slate-500">Multi-party signatures with OTP and audit metadata placeholders.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SIGNATURE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <label key={card.key} className="space-y-2 rounded border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-center">
              <Icon className="mx-auto h-4 w-4 text-slate-500" />
              <p className="text-[11px] font-semibold text-slate-700">{card.label}</p>
              <div className="flex h-16 items-center justify-center rounded border border-slate-200 bg-white text-[10px] text-slate-400">
                Signature pad placeholder
              </div>
              <label className="inline-flex items-center gap-1 text-[10px] text-slate-600">
                <input
                  type="checkbox"
                  checked={value[card.key]}
                  onChange={(event) => onChange({ ...value, [card.key]: event.target.checked })}
                  className="h-3.5 w-3.5"
                />
                Mark signed {card.optional ? "(if applicable)" : ""}
              </label>
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            // TODO: Integrate OTP verification API endpoint and challenge flow.
            onChange({ ...value, otpVerified: true });
          }}
          className="toolbar-btn toolbar-btn-primary"
        >
          <Fingerprint className="h-3.5 w-3.5" />
          OTP verification
        </button>

        <button
          type="button"
          onClick={() => {
            // TODO: Integrate digital signature API provider callback and signer certificate validation.
            onChange({ ...value, pdfFillerSelected: !value.pdfFillerSelected });
          }}
          className="toolbar-btn toolbar-btn-secondary"
        >
          <PenTool className="h-3.5 w-3.5" />
          PDF filler signing option
        </button>
      </div>

      <div className="mt-3 grid gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 sm:grid-cols-3">
        <div className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Date/time auto-stamp: {timestamp}</div>
        <div className="flex items-center gap-1"><MonitorSmartphone className="h-3.5 w-3.5" /> Device/IP placeholder: 10.0.0.1 / Chrome 136</div>
        <div className="flex items-center gap-1"><UserRoundCog className="h-3.5 w-3.5" /> Audit trail placeholder: Consent issuance log chain</div>
      </div>
      <div className="mt-2 grid gap-2 rounded border border-slate-200 bg-white p-3 text-[11px] text-slate-600 sm:grid-cols-2">
        <div><strong>Audit Event ID:</strong> EVT-IC-2026-000784</div>
        <div><strong>Legal Package ID:</strong> LPG-IC-889201</div>
        <div><strong>Immutable PDF Reference:</strong> IPFS://consent/legal/sha256-placeholder</div>
        <div><strong>Signer IP Placeholder:</strong> 10.0.0.1</div>
      </div>
    </section>
  );
}
