"use client";

import { useState } from "react";
import { Search, User, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Stack } from "@/components/design-system";
import type { ProductionPatient, ProductionEncounter } from "../types";

interface PatientEncounterSelectorProps {
  selectedPatient?: ProductionPatient;
  selectedEncounter?: ProductionEncounter;
  onSelectPatient: (patient: ProductionPatient) => void;
  onSelectEncounter: (encounter: ProductionEncounter) => void;
  patients: ProductionPatient[];
  encounters: ProductionEncounter[];
  patientsLoading?: boolean;
  encountersLoading?: boolean;
  error?: string;
  onSearchQueryChange?: (query: string) => void;
}

export function PatientEncounterSelector({
  selectedPatient,
  selectedEncounter,
  onSelectPatient,
  onSelectEncounter,
  patients,
  encounters,
  patientsLoading = false,
  encountersLoading = false,
  error,
  onSearchQueryChange,
}: PatientEncounterSelectorProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(!selectedPatient);

  return (
    <Card variant="default" className="overflow-hidden" id="section-patient">
      <CardHeader className="workspace-card-header">
        <Stack direction="row" align="center" justify="between">
          <Stack direction="row" align="center" gap={2}>
            <User className="w-5 h-5 text-[var(--wc-blue)]" />
            <CardTitle className="workspace-section-title">1. Patient & Encounter</CardTitle>
          </Stack>
          <Button
            variant="ghost"
            size="sm"
            uppercase={false}
            aria-label={expanded ? "Collapse patient selector" : "Expand patient selector"}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </Stack>
      </CardHeader>

      {expanded && (
        <CardContent className="p-5 space-y-5">
          <Input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearchQueryChange?.(e.target.value);
            }}
            placeholder="Search patient name, MRN, or mobile"
            startIcon={<Search className="w-4 h-4" />}
            disabled={patientsLoading}
          />

          {patientsLoading && (
            <div className="text-sm text-[var(--wc-text-muted)]">Searching patients…</div>
          )}

          {!patientsLoading && query.length >= 2 && patients.length === 0 && (
            <div className="text-sm text-[var(--wc-text-muted)]">No patients match.</div>
          )}

          {error && (
            <div className="text-sm text-[var(--wc-danger)]">{error}</div>
          )}

          {patients.length > 0 && !selectedPatient && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">
                Search results
              </div>
              <Stack direction="column" gap={2}>
                {patients.map((patient) => (
                  <Button
                    key={patient.id}
                    variant="ghost"
                    uppercase={false}
                    onClick={() => {
                      onSelectPatient(patient);
                      setQuery("");
                      setExpanded(false);
                    }}
                    className="h-auto w-full justify-start px-4 py-3 text-left border border-[var(--wc-border)] hover:border-[var(--wc-blue-light)] hover:bg-[var(--wc-blue-soft)]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-semibold text-[var(--wc-text)]">{patient.name}</div>
                        <div className="text-xs text-[var(--wc-text-muted)]">
                          {patient.mrn} • {patient.dateOfBirth}
                        </div>
                      </div>
                      <div className="text-xs text-[var(--wc-text-muted)]">{patient.mobileNumber}</div>
                    </div>
                  </Button>
                ))}
              </Stack>
            </div>
          )}

          {selectedPatient && (
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 rounded-lg bg-[var(--wc-blue-soft)] border border-[var(--wc-blue-light)]">
                <div>
                  <div className="font-bold text-[var(--wc-navy)]">{selectedPatient.name}</div>
                  <div className="text-xs text-[var(--wc-text-muted)]">
                    {selectedPatient.mrn} • DOB {selectedPatient.dateOfBirth} • {selectedPatient.mobileNumber}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  uppercase={false}
                  onClick={() => {
                    setExpanded(true);
                    setQuery("");
                  }}
                  className="text-[var(--wc-blue)] hover:underline"
                >
                  Change
                </Button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">
                  Encounters
                </div>
                {encountersLoading ? (
                  <div className="text-sm text-[var(--wc-text-muted)]">Loading encounters…</div>
                ) : (
                  <Stack direction="column" gap={2}>
                    {encounters.map((encounter) => (
                      <Button
                        key={encounter.id}
                        variant="ghost"
                        uppercase={false}
                        onClick={() => onSelectEncounter(encounter)}
                        className={`h-auto w-full justify-start px-4 py-3 text-left border transition-colors ${
                          selectedEncounter?.id === encounter.id
                            ? "border-[var(--wc-blue)] bg-[var(--wc-blue-soft)]"
                            : "border-[var(--wc-border)] hover:border-[var(--wc-blue-light)] hover:bg-[var(--wc-surface-2)]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[var(--wc-blue)]" />
                          <div className="font-semibold text-[var(--wc-text)]">{encounter.encounterId}</div>
                        </div>
                        <div className="text-xs text-[var(--wc-text-muted)] mt-1 text-left">
                          {encounter.department} • {encounter.diagnosis} • {encounter.physician}
                        </div>
                      </Button>
                    ))}
                  </Stack>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
