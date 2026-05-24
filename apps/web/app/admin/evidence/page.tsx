"use client";

export const dynamic = "force-dynamic";

import { FormEvent, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/utils/api";

type EvidenceEventRow = {
  id: string;
  eventType: string;
  eventTimestamp: string;
  sequenceNo: number | null;
  signerIdentity: string | null;
  otpVerificationStatus: string | null;
};

type EvidenceAssetRow = {
  id: string;
  assetType: string;
  assetCategory: string | null;
  title: string | null;
  language: string | null;
  sortOrder: number;
};

type EvidenceTimelineRow = {
  id: string;
  summaryText: string | null;
  timelineJson: {
    steps?: Array<{ key?: string; label?: string; occurredAt?: string }>;
  } | null;
};

type EvidencePackageRow = {
  id: string;
  mrn: string | null;
  procedureName: string | null;
  consentTemplate: string | null;
  consentVersion: string | null;
  generatedAt: string;
  educationSummary: string | null;
  consentSummary: string | null;
  timelineSummary: string | null;
  otpVerificationStatus: string | null;
  maskedMobileNumber: string | null;
  events: EvidenceEventRow[];
  assetRecords: EvidenceAssetRow[];
  timeline: EvidenceTimelineRow | null;
};

type EvidenceApiResponse = {
  total: number;
  items: EvidencePackageRow[];
};

export default function AdminEvidencePage() {
  const [mrn, setMrn] = useState("");
  const [consent, setConsent] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EvidencePackageRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => rows.find((item) => item.id === selectedId) || rows[0] || null, [rows, selectedId]);

  async function searchEvidence(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (mrn.trim()) query.set("mrn", mrn.trim());
      if (consent.trim()) query.set("consent", consent.trim());
      if (dateFrom) query.set("dateFrom", dateFrom);
      if (dateTo) query.set("dateTo", dateTo);

      const data = await apiFetch<EvidenceApiResponse>(`/api/admin/evidence?${query.toString()}`, {
        cache: "no-store",
        authFailureMode: "inline",
      });

      setRows(data.items || []);
      setSelectedId((data.items || [])[0]?.id || null);
    } catch {
      setError("Unable to load evidence packages");
      setRows([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title="Evidence Package 2.0"
        subtitle="Legal evidence observability with MRN, consent, and date search"
      >
        <form onSubmit={searchEvidence} className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5">
          <input
            value={mrn}
            onChange={(event) => setMrn(event.target.value)}
            placeholder="MRN"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={consent}
            onChange={(event) => setConsent(event.target.value)}
            placeholder="Consent template/version"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            title="From date"
            aria-label="From date"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            title="To date"
            aria-label="To date"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</div> : null}

        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-2">
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                No evidence packages found. Apply filters and run search.
              </div>
            ) : null}
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selected?.id === row.id
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">{row.mrn || "No MRN"}</div>
                <div className="text-xs text-slate-600">{row.procedureName || "Procedure not set"}</div>
                <div className="mt-1 text-xs text-slate-500">{new Date(row.generatedAt).toLocaleString()}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {row.consentTemplate || "template n/a"} {row.consentVersion ? `(${row.consentVersion})` : ""}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {selected ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Education Summary</div>
                    <div className="mt-2 text-sm text-slate-800">{selected.educationSummary || "No education summary"}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consent Summary</div>
                    <div className="mt-2 text-sm text-slate-800">{selected.consentSummary || "No consent summary"}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline Summary</div>
                  <div className="mt-2 text-sm text-slate-800">{selected.timelineSummary || "No timeline summary"}</div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(selected.timeline?.timelineJson?.steps || []).map((step, idx) => (
                      <div key={`${step.key || "STEP"}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                        <div className="font-semibold text-slate-700">{step.label || step.key || "Step"}</div>
                        <div className="text-slate-600">{step.occurredAt ? new Date(step.occurredAt).toLocaleString() : "n/a"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">OTP Evidence</div>
                    <div className="mt-2 text-sm text-slate-800">Status: {selected.otpVerificationStatus || "n/a"}</div>
                    <div className="text-sm text-slate-800">Mobile: {selected.maskedMobileNumber || "n/a"}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assets Presented</div>
                    <div className="mt-2 text-sm text-slate-800">{selected.assetRecords.length} record(s)</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selected.assetRecords.slice(0, 8).map((asset) => (
                        <span key={asset.id} className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-700">
                          {asset.assetType}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence Events</div>
                  <div className="space-y-2">
                    {selected.events.map((event) => (
                      <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        <div className="font-semibold">{event.eventType}</div>
                        <div>{new Date(event.eventTimestamp).toLocaleString()}</div>
                        <div>
                          Sequence: {event.sequenceNo ?? "n/a"} | Signer: {event.signerIdentity || "n/a"} | OTP: {event.otpVerificationStatus || "n/a"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
