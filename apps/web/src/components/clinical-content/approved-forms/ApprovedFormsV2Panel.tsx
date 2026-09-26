"use client";

import { useEffect, useState } from "react";
import { FileText, Search, ShieldCheck, AlertCircle } from "lucide-react";
import type { ApprovedFormV2 } from "@/lib/clinical-content/types";

export type ApprovedFormsV2PanelProps = {
  tenantId: string;
  onSelectForm?: (form: ApprovedFormV2) => void;
};

type Filters = {
  q: string;
  category: string;
  specialty: string;
  riskLevel: string;
};

export default function ApprovedFormsV2Panel({ tenantId, onSelectForm }: ApprovedFormsV2PanelProps) {
  const [forms, setForms] = useState<ApprovedFormV2[]>([]);
  const [facets, setFacets] = useState<{ specialties: string[]; categories: string[]; riskLevels: string[] }>({
    specialties: [],
    categories: [],
    riskLevels: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ q: "", category: "", specialty: "", riskLevel: "" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("tenantId", tenantId);
        if (filters.q) params.set("q", filters.q);
        if (filters.category) params.set("category", filters.category);
        if (filters.specialty) params.set("specialty", filters.specialty);
        if (filters.riskLevel) params.set("riskLevel", filters.riskLevel);

        const response = await fetch(`/api/modules/clinical-content/forms?${params.toString()}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to load approved forms");
        }

        if (cancelled) return;

        setForms(Array.isArray(payload.items) ? payload.items : []);
        setFacets({
          specialties: payload.facets?.specialties || [],
          categories: payload.facets?.categories || [],
          riskLevels: payload.facets?.riskLevels || [],
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [tenantId, filters]);

  const riskBadge = (level: string) => {
    const tones: Record<string, string> = {
      standard: "bg-slate-100 text-slate-700",
      medium: "bg-amber-100 text-amber-700",
      high: "bg-rose-100 text-rose-700",
      critical: "bg-red-100 text-red-700",
    };
    return tones[level] || tones.standard;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Search approved forms..."
            className="w-full rounded-md border border-slate-300 py-1.5 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {facets.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.specialty}
          onChange={(e) => setFilters((f) => ({ ...f, specialty: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All specialties</option>
          {facets.specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.riskLevel}
          onChange={(e) => setFilters((f) => ({ ...f, riskLevel: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All risk levels</option>
          {facets.riskLevels.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mb-1 inline h-4 w-4" /> {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-500">Loading approved forms…</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <div
              key={form.id}
              onClick={() => onSelectForm?.(form)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-sky-600" />
                  <span className="font-semibold text-slate-800">{form.titleEn}</span>
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${riskBadge(form.riskLevel)}`}>
                  {form.riskLevel}
                </span>
              </div>
              <p className="mb-3 text-xs text-slate-500 line-clamp-2">{form.summaryEn}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="rounded bg-slate-100 px-2 py-0.5">{form.specialty}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5">{form.category}</span>
                <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">
                  <ShieldCheck className="h-3 w-3" /> {form.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && forms.length === 0 && !error ? (
        <div className="text-sm text-slate-500">No approved forms match your filters.</div>
      ) : null}
    </div>
  );
}
