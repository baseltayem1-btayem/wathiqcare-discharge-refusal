import type { DataClassificationKey } from "./data-classification-policy";

export type ResidencyRule = {
  residency: "KSA_ONLY" | "CONTROLLED_EXPORT" | "GLOBAL_NON_PERSONAL";
  exportRequiresAnonymization: boolean;
  notes: string;
};

export const dataResidencyPolicy: Record<DataClassificationKey, ResidencyRule> = {
  PATIENT_SENSITIVE: {
    residency: "KSA_ONLY",
    exportRequiresAnonymization: true,
    notes: "Patient records, consent, signatures, attachments, and legal evidence must remain in Saudi-hosted storage.",
  },
  OPERATIONAL: {
    residency: "KSA_ONLY",
    exportRequiresAnonymization: false,
    notes: "Operational workflow state remains tenant-scoped and hosted in KSA by default.",
  },
  AUDIT_LOG: {
    residency: "KSA_ONLY",
    exportRequiresAnonymization: true,
    notes: "Legal and privileged access logs are treated as regulated evidence and retained in KSA.",
  },
  ANALYTICS: {
    residency: "CONTROLLED_EXPORT",
    exportRequiresAnonymization: true,
    notes: "Telemetry may leave KSA only after anonymization or explicit control approval.",
  },
  BACKUP: {
    residency: "KSA_ONLY",
    exportRequiresAnonymization: false,
    notes: "Encrypted disaster-recovery and legal backup material remains in KSA.",
  },
};

export const data_residency_policy = dataResidencyPolicy;

const KSA_REGION_PATTERNS = [
  /sa/i,
  /saudi/i,
  /riyadh/i,
  /jeddah/i,
  /dammam/i,
  /me-central/i,
];

export function isKsaRegion(region: string | null | undefined): boolean {
  const normalized = (region ?? "").trim();
  if (!normalized) {
    return false;
  }

  return KSA_REGION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getDefaultResidencyRegion(): string {
  return (
    process.env.PRIMARY_DATA_REGION ||
    process.env.PATIENT_DATA_REGION ||
    process.env.VERCEL_REGION ||
    "saudi-arabia-riyadh"
  );
}
