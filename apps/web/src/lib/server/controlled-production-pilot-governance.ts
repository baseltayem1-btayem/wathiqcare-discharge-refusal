import { logRuntimeEvent, type RuntimeSeverity } from "@/lib/server/runtime-observability";

export type AuthoritativePilotFlow =
  | "physician_runtime"
  | "patient_runtime"
  | "pdf_projection"
  | "evidence_projection";

export type PilotClassification =
  | "STABLE"
  | "WARNING"
  | "DEGRADED"
  | "ROLLBACK_REQUIRED"
  | "READY_FOR_EXPANSION"
  | "READY_FOR_GENERAL_ROLLOUT";

export type PilotGovernanceSnapshot = {
  active: boolean;
  reasons: string[];
  flow: AuthoritativePilotFlow;
  productionAllowed: boolean;
  rollbackKillSwitch: boolean;
  allowlists: {
    physicians: string[];
    specialties: string[];
    procedures: string[];
    pilotGroups: string[];
  };
};

export type PilotObservationInput = {
  flow: AuthoritativePilotFlow;
  tenantId?: string | null;
  physicianId?: string | null;
  specialty?: string | null;
  procedure?: string | null;
  pilotGroup?: string | null;
};

export type PilotParityObservation = {
  mismatchSummary?: Record<string, number>;
  dimensionSummary?: {
    projection: number;
    runtime: number;
    pdf: number;
    evidence: number;
    bilingual: number;
    anesthesia: number;
  };
  projectionHashes?: {
    projectionHash: string;
    runtimeHash: string;
    pdfProjectionHash: string;
    evidenceProjectionHash: string;
    educationalTrackingHash: string;
  };
  shadowStatus?: "skipped" | "active_compare_only" | "error";
};

function parseBool(value: string | undefined): boolean {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function parseAllowList(value: string | undefined): string[] {
  return [...new Set(
    (value || "")
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length > 0),
  )].sort((a, b) => a.localeCompare(b));
}

function normalize(value: string | null | undefined): string {
  return String(value || "").trim().toUpperCase();
}

function matchesAllowList(allowed: string[], candidate: string): boolean {
  if (allowed.length === 0) return true;
  if (!candidate) return false;
  return allowed.some((item) => candidate.includes(item));
}

function flowFlag(flow: AuthoritativePilotFlow): boolean {
  if (flow === "physician_runtime") return parseBool(process.env.FEATURE_AUTHORITATIVE_PHYSICIAN_RUNTIME);
  if (flow === "patient_runtime") return parseBool(process.env.FEATURE_AUTHORITATIVE_PATIENT_RUNTIME);
  if (flow === "pdf_projection") return parseBool(process.env.FEATURE_AUTHORITATIVE_PDF_PROJECTION);
  return parseBool(process.env.FEATURE_AUTHORITATIVE_EVIDENCE_PROJECTION);
}

export function evaluateControlledAuthoritativePilot(input: PilotObservationInput): PilotGovernanceSnapshot {
  const globalEnabled = parseBool(process.env.FEATURE_CONTROLLED_PRODUCTION_PILOT_ENABLED);
  const authoritativeEnabled = parseBool(process.env.FEATURE_AUTHORITATIVE_UNIFIED_RUNTIME_PILOT);
  const rollbackKillSwitch = parseBool(process.env.FEATURE_AUTHORITATIVE_PILOT_ROLLBACK_KILL_SWITCH);
  const productionAllowed = parseBool(process.env.FEATURE_AUTHORITATIVE_PILOT_ALLOW_PRODUCTION);

  const allowlists = {
    physicians: parseAllowList(process.env.AUTHORITATIVE_PILOT_ALLOWED_PHYSICIANS),
    specialties: parseAllowList(process.env.AUTHORITATIVE_PILOT_ALLOWED_SPECIALTIES),
    procedures: parseAllowList(process.env.AUTHORITATIVE_PILOT_ALLOWED_PROCEDURES),
    pilotGroups: parseAllowList(process.env.AUTHORITATIVE_PILOT_ALLOWED_GROUPS),
  };

  const reasons: string[] = [];
  if (!globalEnabled) reasons.push("global_pilot_disabled");
  if (!authoritativeEnabled) reasons.push("authoritative_runtime_disabled");
  if (rollbackKillSwitch) reasons.push("rollback_kill_switch_active");
  if (!flowFlag(input.flow)) reasons.push(`flow_disabled:${input.flow}`);

  if (process.env.NODE_ENV === "production" && !productionAllowed) {
    reasons.push("production_not_allowed");
  }

  if (
    allowlists.physicians.length === 0 &&
    allowlists.specialties.length === 0 &&
    allowlists.procedures.length === 0 &&
    allowlists.pilotGroups.length === 0
  ) {
    reasons.push("allowlists_not_configured");
  }

  if (!matchesAllowList(allowlists.physicians, normalize(input.physicianId))) {
    reasons.push("physician_not_allowlisted");
  }
  if (!matchesAllowList(allowlists.specialties, normalize(input.specialty))) {
    reasons.push("specialty_not_allowlisted");
  }
  if (!matchesAllowList(allowlists.procedures, normalize(input.procedure))) {
    reasons.push("procedure_not_allowlisted");
  }
  if (!matchesAllowList(allowlists.pilotGroups, normalize(input.pilotGroup))) {
    reasons.push("pilot_group_not_allowlisted");
  }

  return {
    active: reasons.length === 0,
    reasons: [...new Set(reasons)].sort((a, b) => a.localeCompare(b)),
    flow: input.flow,
    productionAllowed,
    rollbackKillSwitch,
    allowlists,
  };
}

function sumMismatches(summary: Record<string, number> | undefined): number {
  if (!summary) return 0;
  return Object.values(summary).reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
}

export function classifyPilotStatus(observation: PilotParityObservation): PilotClassification {
  const mismatchTotal = sumMismatches(observation.mismatchSummary);
  const bilingual = observation.dimensionSummary?.bilingual ?? 0;
  const evidence = observation.dimensionSummary?.evidence ?? 0;
  const pdf = observation.dimensionSummary?.pdf ?? 0;

  if ((observation.shadowStatus === "error") || mismatchTotal >= 10 || evidence > 0 || pdf >= 4) {
    return "ROLLBACK_REQUIRED";
  }
  if (mismatchTotal >= 5 || bilingual > 0 || pdf > 0) {
    return "DEGRADED";
  }
  if (mismatchTotal >= 1) {
    return "WARNING";
  }
  if (observation.shadowStatus === "active_compare_only") {
    return "STABLE";
  }
  return "WARNING";
}

export function recordControlledPilotObservation(args: {
  governance: PilotGovernanceSnapshot;
  module: string;
  event: string;
  details?: Record<string, unknown>;
  parity?: PilotParityObservation;
}): void {
  const classification = classifyPilotStatus(args.parity ?? {});
  let severity: RuntimeSeverity = "info";
  if (classification === "WARNING") severity = "warn";
  if (classification === "DEGRADED") severity = "error";
  if (classification === "ROLLBACK_REQUIRED") severity = "critical";

  logRuntimeEvent({
    module: args.module,
    event: args.event,
    severity,
    details: {
      pilotFlow: args.governance.flow,
      pilotActive: args.governance.active,
      pilotReasons: args.governance.reasons,
      productionAllowed: args.governance.productionAllowed,
      rollbackKillSwitch: args.governance.rollbackKillSwitch,
      pilotClassification: classification,
      parity: args.parity,
      ...args.details,
    },
  });
}
