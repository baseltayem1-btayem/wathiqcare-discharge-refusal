import { resolveLegalHoldStatus as resolveBaseLegalHoldStatus } from "@/lib/pdf-engine/persistence/retention-policy";

export interface ManagedLegalHoldRecord {
  active: boolean;
  evidenceId: string;
  heldAt: string;
  heldBy: string;
  reason: string;
  releasedAt: string | null;
  releasedBy: string | null;
}

const legalHoldRegistry = new Map<string, ManagedLegalHoldRecord>();

export function applyLegalHold(input: {
  evidenceId: string;
  heldBy: string;
  reason: string;
}): ManagedLegalHoldRecord {
  const record: ManagedLegalHoldRecord = {
    active: true,
    evidenceId: input.evidenceId,
    heldAt: new Date().toISOString(),
    heldBy: input.heldBy,
    reason: input.reason,
    releasedAt: null,
    releasedBy: null,
  };
  legalHoldRegistry.set(input.evidenceId, record);
  return record;
}

export function releaseLegalHold(input: {
  evidenceId: string;
  reason?: string | null;
  releasedBy: string;
}): ManagedLegalHoldRecord | null {
  const existing = legalHoldRegistry.get(input.evidenceId);
  if (!existing) {
    return null;
  }

  const updated: ManagedLegalHoldRecord = {
    ...existing,
    active: false,
    reason: input.reason || existing.reason,
    releasedAt: new Date().toISOString(),
    releasedBy: input.releasedBy,
  };
  legalHoldRegistry.set(input.evidenceId, updated);
  return updated;
}

export function resolveLegalHoldStatus(input: {
  evidenceId: string;
  retentionClass?: "discharge-refusal" | "informed-consent" | "litigation-hold" | "medico-legal" | "promissory-note";
}) {
  const managedRecord = legalHoldRegistry.get(input.evidenceId);
  if (managedRecord?.active) {
    return {
      isOnLegalHold: true,
      managedRecord,
      reason: managedRecord.reason,
    };
  }

  const fallback = resolveBaseLegalHoldStatus({ retentionClass: input.retentionClass });
  return {
    ...fallback,
    managedRecord: managedRecord || null,
  };
}