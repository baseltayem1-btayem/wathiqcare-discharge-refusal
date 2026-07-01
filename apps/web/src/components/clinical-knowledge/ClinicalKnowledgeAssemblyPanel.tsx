"use client";

import { useState, useCallback } from "react";
import { ProcedureSearch } from "./ProcedureSearch";
import { KnowledgePackagePreview } from "./KnowledgePackagePreview";
import type { ClinicalKnowledgeProcedure, ClinicalKnowledgeAssembly } from "@/lib/clinical-knowledge/types";

export interface ClinicalKnowledgeAssemblyPanelProps {
  tenantId: string;
  onAssemblyReady?: (assembly: ClinicalKnowledgeAssembly) => void;
  onAssemblyBlocked?: (assembly: ClinicalKnowledgeAssembly) => void;
}

export function ClinicalKnowledgeAssemblyPanel({
  tenantId,
  onAssemblyReady,
  onAssemblyBlocked,
}: ClinicalKnowledgeAssemblyPanelProps) {
  const [assembly, setAssembly] = useState<ClinicalKnowledgeAssembly | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = useCallback(
    async (procedure: ClinicalKnowledgeProcedure) => {
      setLoading(true);
      setError(null);
      setAssembly(null);

      try {
        const response = await fetch("/api/modules/clinical-knowledge/assembly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            procedureCode: procedure.code,
            patientContext: { capacityStatus: "competent", languagePreference: "bilingual" },
          }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to assemble knowledge package");
        }

        if (!payload.found) {
          setError(payload.fallbackReason || "No published package found for this procedure.");
          return;
        }

        const assembled: ClinicalKnowledgeAssembly = payload.assembly;
        setAssembly(assembled);

        if (assembled.status === "ready") {
          onAssemblyReady?.(assembled);
        } else if (assembled.status === "blocked") {
          onAssemblyBlocked?.(assembled);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Assembly failed");
      } finally {
        setLoading(false);
      }
    },
    [tenantId, onAssemblyReady, onAssemblyBlocked],
  );

  return (
    <div className="space-y-4">
      <ProcedureSearch tenantId={tenantId} onSelect={handleSelect} />

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <KnowledgePackagePreview assembly={assembly} loading={loading} />
    </div>
  );
}
