export type RetentionClass =
  | "informed-consent"
  | "discharge-refusal"
  | "promissory-note"
  | "medico-legal"
  | "litigation-hold";

export interface DetermineRetentionClassInput {
  documentType?: string | null;
  moduleKey?: string | null;
  medicoLegal?: boolean;
  litigationHold?: boolean;
}

export interface ResolveLegalHoldStatusInput {
  litigationHold?: boolean;
  overrideReason?: string | null;
  retentionClass?: RetentionClass;
}

export interface LegalHoldStatus {
  isOnLegalHold: boolean;
  reason: string | null;
}

const RETENTION_YEARS: Record<Exclude<RetentionClass, "litigation-hold">, number> = {
  "discharge-refusal": 10,
  "informed-consent": 10,
  "medico-legal": 15,
  "promissory-note": 7,
};

export function determineRetentionClass(input: DetermineRetentionClassInput): RetentionClass {
  if (input.litigationHold) {
    return "litigation-hold";
  }

  const moduleKey = input.moduleKey?.toLowerCase() || "";
  const documentType = input.documentType?.toLowerCase() || "";

  if (input.medicoLegal || moduleKey.includes("medico-legal") || documentType.includes("medico-legal")) {
    return "medico-legal";
  }

  if (moduleKey.includes("promissory") || documentType.includes("promissory")) {
    return "promissory-note";
  }

  if (moduleKey.includes("discharge") || documentType.includes("discharge")) {
    return "discharge-refusal";
  }

  return "informed-consent";
}

export function calculateRetentionExpiry(
  retentionClass: RetentionClass,
  generatedAt: string | Date,
  legalHoldStatus?: LegalHoldStatus,
): string | null {
  if (retentionClass === "litigation-hold" || legalHoldStatus?.isOnLegalHold) {
    return null;
  }

  const years = RETENTION_YEARS[retentionClass];
  const baseDate = new Date(generatedAt instanceof Date ? generatedAt.toISOString() : generatedAt);
  baseDate.setUTCFullYear(baseDate.getUTCFullYear() + years);
  return baseDate.toISOString();
}

export function resolveLegalHoldStatus(input: ResolveLegalHoldStatusInput = {}): LegalHoldStatus {
  if (input.litigationHold || input.retentionClass === "litigation-hold") {
    return {
      isOnLegalHold: true,
      reason: input.overrideReason || "Litigation hold override placeholder for Saudi healthcare and PDPL-aligned retention controls.",
    };
  }

  return {
    isOnLegalHold: false,
    reason: input.overrideReason || null,
  };
}