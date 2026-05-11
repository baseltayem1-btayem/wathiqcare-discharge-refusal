"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { type LegalReadinessCheck } from "./types";

type LegalReadinessCardProps = {
  checks: LegalReadinessCheck[];
};

export default function LegalReadinessCard({ checks }: LegalReadinessCardProps) {
  const ready = checks.every((check) => check.passed);

  return (
    <section className="wc-panel border-slate-200 bg-white">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="wc-panel-heading !mb-0">جاهزية قانونية | Legal Readiness</h2>
          <p className="text-[11px] text-slate-500">Automatic legal quality gate before final PDF generation.</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ready ? "wc-status-ready" : "wc-status-warning"}`}>
          {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {ready ? "Ready" : "Pending"}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {checks.map((check) => (
          <div key={check.key} className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs">
            {check.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />}
            <div>
              <p className="font-medium text-slate-800">{check.label.ar}</p>
              <p className="text-[10px] text-slate-500">{check.label.en}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-3 py-2 text-xs text-[var(--primary-pressed)]">
        <div className="mb-1 flex items-center gap-1 font-semibold"><ShieldCheck className="h-3.5 w-3.5" /> Compliance Controls</div>
        <ul className="list-disc space-y-0.5 ps-5">
          <li>Saudi PDPL compliance</li>
          <li>Immutable final PDF record & version history</li>
          <li>Role-based access control and full audit trail</li>
          <li>Bilingual consent output and court-ready legal package generation</li>
        </ul>
      </div>
    </section>
  );
}
