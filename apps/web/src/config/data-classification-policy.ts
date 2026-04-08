export type DataClassificationKey =
  | "PATIENT_SENSITIVE"
  | "OPERATIONAL"
  | "AUDIT_LOG"
  | "ANALYTICS"
  | "BACKUP";

export type DataClassificationRule = {
  label: string;
  description: string;
  pdplCritical: boolean;
  examples: string[];
};

export const dataClassificationPolicy: Record<DataClassificationKey, DataClassificationRule> = {
  PATIENT_SENSITIVE: {
    label: "Patient Sensitive",
    description: "Patient, medico-legal, signature, consent, attachment, and clinical evidence data.",
    pdplCritical: true,
    examples: [
      "patient demographics",
      "medical refusal forms",
      "electronic signatures",
      "legal attachments",
      "primary database records",
    ],
  },
  OPERATIONAL: {
    label: "Operational",
    description: "Tenant workflow and non-patient operational metadata.",
    pdplCritical: false,
    examples: ["department routing", "case assignment", "status transitions"],
  },
  AUDIT_LOG: {
    label: "Audit Log",
    description: "Tamper-evident legal and security audit entries.",
    pdplCritical: true,
    examples: ["hash-chained events", "privileged access logs", "export records"],
  },
  ANALYTICS: {
    label: "Analytics",
    description: "Aggregated reporting, telemetry, and anonymized compliance metrics.",
    pdplCritical: false,
    examples: ["KPI totals", "latency telemetry", "non-identifying usage metrics"],
  },
  BACKUP: {
    label: "Backup",
    description: "Encrypted backup and restore verification metadata.",
    pdplCritical: true,
    examples: ["database snapshots", "restore test records", "retention archives"],
  },
};

export const data_classification_policy = dataClassificationPolicy;

export function classifyOperationTarget(target: string | null | undefined): DataClassificationKey {
  const normalized = (target ?? "").trim().toLowerCase();

  if (
    normalized.includes("patient") ||
    normalized.includes("signature") ||
    normalized.includes("consent") ||
    normalized.includes("document") ||
    normalized.includes("case") ||
    normalized.includes("medical") ||
    normalized.includes("legal")
  ) {
    return "PATIENT_SENSITIVE";
  }

  if (normalized.includes("backup") || normalized.includes("restore")) {
    return "BACKUP";
  }

  if (normalized.includes("audit") || normalized.includes("export") || normalized.includes("report")) {
    return "AUDIT_LOG";
  }

  if (normalized.includes("analytics") || normalized.includes("telemetry")) {
    return "ANALYTICS";
  }

  return "OPERATIONAL";
}