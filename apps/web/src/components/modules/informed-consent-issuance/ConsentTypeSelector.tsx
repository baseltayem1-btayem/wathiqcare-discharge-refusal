"use client";

import { AlertTriangle, Camera, Droplets, HeartPulse, Monitor, ShieldAlert, Syringe, Wifi } from "lucide-react";
import { type ComponentType } from "react";
import { type ConsentType } from "./types";

type ConsentTypeSelectorProps = {
  consentTypes: ConsentType[];
  selectedConsentTypeId: string;
  onSelect: (id: string) => void;
};

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  surgical: ShieldAlert,
  anesthesia: Syringe,
  blood: Droplets,
  "high-risk": AlertTriangle,
  ama: HeartPulse,
  telemedicine: Monitor,
  media: Camera,
  "data-sharing": Wifi,
};

const RISK_TONE: Record<ConsentType["riskLevel"], string> = {
  low: "wc-status-ready",
  moderate: "wc-status-warning",
  high: "wc-status-blocked",
};

export default function ConsentTypeSelector({ consentTypes, selectedConsentTypeId, onSelect }: ConsentTypeSelectorProps) {
  return (
    <section className="wc-panel border-slate-200 bg-white">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="wc-panel-heading !mb-0">نوع الموافقة</h2>
          <p className="text-[11px] text-slate-500">Select consent form family before explanation and signatures.</p>
        </div>
        <span className="wc-module-pill">{consentTypes.length} types</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {consentTypes.map((item) => {
          const Icon = ICONS[item.id] ?? ShieldAlert;
          const active = item.id === selectedConsentTypeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`rounded border p-2 text-start transition ${active ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <Icon className={`h-4 w-4 ${active ? "text-[var(--primary-pressed)]" : "text-slate-500"}`} />
                <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${RISK_TONE[item.riskLevel]}`}>
                  {item.riskLevel}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-900">{item.title.ar}</p>
              <p className="text-[11px] text-slate-600">{item.title.en}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
