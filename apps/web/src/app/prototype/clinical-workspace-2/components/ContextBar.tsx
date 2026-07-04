"use client";

import { User, Calendar, Stethoscope, ClipboardList, Languages, ShieldAlert, Baby } from "lucide-react";
import { Badge, Container, Stack } from "@/components/design-system";
import type { Patient, Encounter, Procedure, AnesthesiaDecision } from "../types/workspace";

interface ContextBarProps {
  patient?: Patient;
  encounter?: Encounter;
  procedure?: Procedure;
  anesthesia?: AnesthesiaDecision;
}

function ContextPill({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "default" | "warning" | "destructive";
}) {
  return (
    <Badge
      variant={tone}
      size="lg"
      className="gap-2 py-2 px-3 border shadow-sm font-normal normal-case tracking-normal"
    >
      <Icon className="w-4 h-4 text-[var(--wc-blue)] shrink-0" />
      <div className="flex flex-col min-w-0 items-start">
        <span className="text-[10px] uppercase tracking-wider text-[var(--wc-text-muted)] font-semibold leading-tight">
          {label}
        </span>
        <span className="text-sm font-semibold text-[var(--wc-text)] truncate leading-tight">{value}</span>
      </div>
    </Badge>
  );
}

export function ContextBar({ patient, encounter, procedure, anesthesia }: ContextBarProps) {
  const needsGuardian = patient?.capacityStatus === "minor" || patient?.capacityStatus === "incapacitated";
  const needsInterpreter = patient?.languagePreference === "en";

  return (
    <div className="workspace-context-bar">
      <Container as="div" size="full" className="!px-0">
        <Stack direction="row" align="center" gap={2} className="mb-3">
          <span className="text-xs font-bold text-[var(--wc-blue)] uppercase tracking-wider">Clinical Context</span>
          <span className="text-xs text-[var(--wc-text-muted)]">
            Patient → Encounter → Procedure → Knowledge Package
          </span>
        </Stack>
        <Stack direction="row" wrap gap={3}>
          <ContextPill
            icon={User}
            label="Patient"
            value={patient ? `${patient.name} (${patient.mrn})` : "Not selected"}
            tone={needsInterpreter ? "warning" : "default"}
          />
          <ContextPill icon={Calendar} label="Encounter" value={encounter ? encounter.encounterId : "—"} />
          <ContextPill icon={Stethoscope} label="Procedure" value={procedure ? procedure.nameEn : "—"} />
          <ContextPill
            icon={ClipboardList}
            label="Anesthesia"
            value={anesthesia ?? (procedure?.anesthesiaRequired ? "GENERAL (default)" : "NONE")}
            tone={anesthesia ? "warning" : "default"}
          />
          {patient?.languagePreference === "en" && (
            <ContextPill icon={Languages} label="Language" value="Interpreter required" tone="warning" />
          )}
          {needsGuardian && (
            <ContextPill icon={Baby} label="Guardian" value={patient.guardianName ?? "Required"} tone="destructive" />
          )}
          {patient?.capacityStatus === "incapacitated" && (
            <ContextPill icon={ShieldAlert} label="Capacity" value="Incapacitated" tone="destructive" />
          )}
        </Stack>
      </Container>
    </div>
  );
}
