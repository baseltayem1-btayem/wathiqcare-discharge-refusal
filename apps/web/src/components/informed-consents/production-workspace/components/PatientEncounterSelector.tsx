"use client";

import { useState } from "react";
import { Search, UserRound, Calendar, ChevronDown, Stethoscope } from "lucide-react";
import { Button, Input } from "@/components/design-system";
import { cn } from "@/components/design-system";
import type { ProductionPatient, ProductionEncounter } from "../types";
import { WorkspaceBadge, WorkspaceCard, WorkspaceField } from "./WorkspaceAtoms";

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
  const [expanded, setExpanded] = useState(true);

  return (
    <WorkspaceCard id="section-patient" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-label={expanded ? "Collapse patient and encounter details" : "Expand patient and encounter details"}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Patient &amp; encounter</h2>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {selectedPatient ? `${selectedPatient.name} · ${selectedEncounter?.department || "Encounter pending"}` : "Locate the patient and confirm the encounter context."}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {selectedPatient ? <WorkspaceBadge tone="green">Verified</WorkspaceBadge> : null}
          <ChevronDown className={cn("size-4 text-slate-400 transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-slate-200">
          <div className="space-y-5 px-5 py-5">
            {selectedPatient ? (
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <WorkspaceField label="Full name" value={selectedPatient.name} />
                <WorkspaceField label="MRN" value={selectedPatient.mrn} mono />
                <WorkspaceField label="Encounter" value={selectedEncounter?.encounterId || "Pending"} mono />
                <WorkspaceField label="DOB" value={selectedPatient.dateOfBirth} />
                <WorkspaceField label="Mobile" value={selectedPatient.mobileNumber || "Not provided"} mono />
                <WorkspaceField label="Email" value={selectedPatient.email || "Not provided"} />
                <WorkspaceField
                  label="Attending"
                  value={selectedEncounter?.physician ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Stethoscope className="size-3.5 text-blue-700" />
                      {selectedEncounter.physician}
                    </span>
                  ) : (
                    "Pending"
                  )}
                />
                <WorkspaceField
                  label="Consent status"
                  value={selectedEncounter ? <WorkspaceBadge tone="gold">Draft ready</WorkspaceBadge> : <WorkspaceBadge tone="slate">Awaiting encounter</WorkspaceBadge>}
                />
              </div>
            ) : null}

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
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Search results
                </div>
                <div className="space-y-2">
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
                      className="h-auto w-full justify-start rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-semibold text-slate-900">{patient.name}</div>
                          <div className="text-xs text-slate-500">
                            {patient.mrn} • {patient.dateOfBirth}
                          </div>
                        </div>
                        <div className="text-xs text-right text-slate-500">
                          <div>{patient.mobileNumber}</div>
                          {patient.email && <div className="text-[10px]">{patient.email}</div>}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedPatient && (
              <div className="space-y-4">
                <div className="flex items-start justify-between rounded-xl border border-blue-100 bg-blue-50/60 p-4 shadow-sm">
                  <div>
                    <div className="font-bold text-slate-900">{selectedPatient.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {selectedPatient.mrn} • DOB {selectedPatient.dateOfBirth} • {selectedPatient.mobileNumber}
                      {selectedPatient.email && <span> • {selectedPatient.email}</span>}
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
                    className="rounded-full border border-blue-100 bg-white px-3 text-blue-700 hover:bg-blue-50"
                  >
                    Change
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Encounters
                  </div>
                  {encountersLoading ? (
                    <div className="text-sm text-slate-500">Loading encounters…</div>
                  ) : (
                    <div className="space-y-2">
                      {encounters.map((encounter) => (
                        <Button
                          key={encounter.id}
                          variant="ghost"
                          uppercase={false}
                          onClick={() => onSelectEncounter(encounter)}
                          className={`h-auto w-full justify-start rounded-xl px-4 py-4 text-left border shadow-sm transition-colors ${
                            selectedEncounter?.id === encounter.id
                              ? "border-blue-200 bg-blue-50/60"
                              : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-700" />
                            <div className="font-semibold text-slate-900">{encounter.encounterId}</div>
                          </div>
                          <div className="mt-1 text-left text-xs text-slate-500">
                            {encounter.department} • {encounter.diagnosis} • {encounter.physician}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </WorkspaceCard>
  );
}
