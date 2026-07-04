"use client";

import { useMemo, useState } from "react";
import { Stethoscope, Search, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Stack } from "@/components/design-system";
import type { Procedure, Encounter } from "../types/workspace";
import { MOCK_PROCEDURES } from "../lib/mock-data";

interface ProcedureSelectorProps {
  selectedProcedure?: Procedure;
  encounter?: Encounter;
  onSelectProcedure: (procedure: Procedure) => void;
}

export function ProcedureSelector({ selectedProcedure, encounter, onSelectProcedure }: ProcedureSelectorProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(!selectedProcedure);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return MOCK_PROCEDURES;
    return MOCK_PROCEDURES.filter(
      (p) =>
        p.nameEn.toLowerCase().includes(q) ||
        p.nameAr.includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.specialtyName.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Card variant="default" className="overflow-hidden" id="section-procedure">
      <CardHeader className="workspace-card-header">
        <Stack direction="row" align="center" justify="between">
          <Stack direction="row" align="center" gap={2}>
            <Stethoscope className="w-5 h-5 text-[var(--wc-blue)]" />
            <CardTitle className="workspace-section-title">2. Procedure</CardTitle>
          </Stack>
          <Button variant="ghost" size="sm" uppercase={false} onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </Stack>
      </CardHeader>

      {expanded && (
        <CardContent className="p-5 space-y-4">
          {encounter?.procedure && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--wc-surface-2)] border border-[var(--wc-border)]">
              <Check className="w-4 h-4 text-green-600" />
              <div className="text-sm">
                <span className="font-semibold text-[var(--wc-text)]">Suggested from encounter:</span>{" "}
                <span className="text-[var(--wc-text-muted)]">{encounter.procedure}</span>
              </div>
            </div>
          )}

          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search procedure or specialty"
            startIcon={<Search className="w-4 h-4" />}
          />

          <Stack direction="column" gap={2}>
            {filtered.map((procedure) => (
              <Button
                key={procedure.id}
                variant="ghost"
                uppercase={false}
                onClick={() => {
                  onSelectProcedure(procedure);
                  setExpanded(false);
                }}
                className={`h-auto w-full justify-start px-4 py-3 text-left border transition-colors ${
                  selectedProcedure?.id === procedure.id
                    ? "border-[var(--wc-blue)] bg-[var(--wc-blue-soft)]"
                    : "border-[var(--wc-border)] hover:border-[var(--wc-blue-light)] hover:bg-[var(--wc-surface-2)]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="font-semibold text-[var(--wc-text)]">{procedure.nameEn}</div>
                  <Badge variant="outline" size="sm">
                    {procedure.code}
                  </Badge>
                </div>
                <div className="text-xs text-[var(--wc-text-muted)] mt-1 text-left">
                  {procedure.specialtyName} • {procedure.departmentName} •{" "}
                  {procedure.anesthesiaRequired ? "Anesthesia required" : "No anesthesia"}
                </div>
              </Button>
            ))}
          </Stack>
        </CardContent>
      )}
    </Card>
  );
}
