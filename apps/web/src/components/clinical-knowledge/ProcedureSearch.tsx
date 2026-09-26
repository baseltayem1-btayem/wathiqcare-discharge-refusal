"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import type { ClinicalKnowledgeProcedure } from "@/lib/clinical-knowledge/types";

export interface ProcedureSearchProps {
  tenantId: string;
  onSelect: (procedure: ClinicalKnowledgeProcedure) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProcedureSearch({
  tenantId,
  onSelect,
  placeholder = "Search procedures (e.g. Appendectomy)...",
  disabled = false,
}: ProcedureSearchProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClinicalKnowledgeProcedure[]>([]);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const response = await fetch(
          `/api/modules/clinical-knowledge/procedures?tenantId=${encodeURIComponent(
            tenantId,
          )}&q=${encodeURIComponent(q)}&limit=10`,
          { signal: controller.signal },
        );
        const payload = await response.json().catch(() => null);
        if (payload?.ok && Array.isArray(payload.items)) {
          setResults(payload.items);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [tenantId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (procedure: ClinicalKnowledgeProcedure) => {
    setQuery(procedure.nameEn);
    setOpen(false);
    onSelect(procedure);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {open && (results.length > 0 || loading) && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((procedure) => (
            <button
              key={procedure.id}
              type="button"
              onClick={() => handleSelect(procedure)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 focus:bg-slate-50"
            >
              <div className="font-medium text-slate-900">{procedure.nameEn}</div>
              {procedure.nameAr && (
                <div className="text-xs text-slate-500" dir="rtl">
                  {procedure.nameAr}
                </div>
              )}
              <div className="mt-1 text-xs text-slate-400">
                {procedure.departmentName} · {procedure.categoryCode}
                {procedure.anesthesiaRequired && " · Anesthesia"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
