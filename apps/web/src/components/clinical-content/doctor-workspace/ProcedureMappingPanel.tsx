"use client";

import { useEffect, useState } from "react";
import { Search, FileText, BookOpen, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import type { ProcedureMappingResult } from "@/lib/clinical-content/types";

export type ProcedureMappingPanelProps = {
  tenantId: string;
  onSelectProcedure?: (name: string) => void;
};

export default function ProcedureMappingPanel({ tenantId, onSelectProcedure }: ProcedureMappingPanelProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ProcedureMappingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!query.trim()) {
        setResult(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/modules/clinical-content/procedures?tenantId=${encodeURIComponent(tenantId)}&procedure=${encodeURIComponent(query)}`,
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to resolve procedure");
        }

        if (cancelled) return;
        setResult(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Resolve failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const handle = window.setTimeout(resolve, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, tenantId]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-slate-700">Procedure name</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Appendectomy"
            className="w-full rounded-md border border-slate-300 py-1.5 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mb-1 inline h-4 w-4" /> {error}
        </div>
      ) : null}

      {loading ? <div className="text-sm text-slate-500">Resolving procedure…</div> : null}

      {result && !loading ? (
        <div className="space-y-3">
          {result.found ? (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Mapping found for {result.procedure?.titleEn}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <FileText className="h-4 w-4 text-sky-600" /> Consent Forms ({result.consentForms.length})
                  </div>
                  <ul className="space-y-2">
                    {result.consentForms.map((form) => (
                      <li key={form.id} className="text-xs text-slate-600">
                        <button
                          onClick={() => onSelectProcedure?.(form.procedure)}
                          className="text-left text-sky-600 hover:underline"
                        >
                          {form.titleEn}
                        </button>
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5">{form.riskLevel}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <BookOpen className="h-4 w-4 text-sky-600" /> Education ({result.educationMaterials.length})
                  </div>
                  <ul className="space-y-2">
                    {result.educationMaterials.map((edu) => (
                      <li key={edu.id} className="text-xs text-slate-600">
                        {edu.titleEn}
                      </li>
                    ))}
                    {result.educationMaterials.length === 0 ? (
                      <li className="text-xs text-slate-400">No education material mapped.</li>
                    ) : null}
                  </ul>
                </div>
              </div>

              {result.anesthesiaRequired ? (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4" /> Anesthesia review is required for this procedure.
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              No mapping found for &quot;{query}&quot;. Try a different procedure name or use manual form selection.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
