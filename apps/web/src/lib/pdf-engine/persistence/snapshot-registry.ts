import type { EvidenceSnapshot } from "@/lib/pdf-engine/runtime/evidence-snapshot";

export interface SnapshotRegistryRecord {
  evidenceId: string;
  registeredAt: string;
  sequenceNumber: number;
  snapshot: EvidenceSnapshot;
  snapshotHash: string;
}

export interface SnapshotVerificationResult {
  evidenceId: string;
  expectedHash: string | null;
  registered: boolean;
  snapshotHash: string | null;
  valid: boolean;
}

const snapshotRegistry: SnapshotRegistryRecord[] = [];

export function registerSnapshot(snapshot: EvidenceSnapshot): SnapshotRegistryRecord {
  const record: SnapshotRegistryRecord = {
    evidenceId: snapshot.evidenceId,
    registeredAt: new Date().toISOString(),
    sequenceNumber: snapshotRegistry.length + 1,
    snapshot,
    snapshotHash: snapshot.snapshotHash,
  };

  snapshotRegistry.push(record);
  return record;
}

export function resolveSnapshot(evidenceId: string): SnapshotRegistryRecord | null {
  for (let index = snapshotRegistry.length - 1; index >= 0; index -= 1) {
    if (snapshotRegistry[index].evidenceId === evidenceId) {
      return snapshotRegistry[index];
    }
  }

  return null;
}

export function verifySnapshotHash(
  evidenceId: string,
  expectedHash?: string | null,
): SnapshotVerificationResult {
  const record = resolveSnapshot(evidenceId);
  const targetHash = expectedHash ?? record?.snapshotHash ?? null;

  return {
    evidenceId,
    expectedHash: targetHash,
    registered: Boolean(record),
    snapshotHash: record?.snapshotHash || null,
    valid: Boolean(record && targetHash && record.snapshotHash === targetHash),
  };
}