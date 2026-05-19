import type { EvidenceSnapshot } from "@/lib/pdf-engine/runtime/evidence-snapshot";

export interface StoredEvidenceSnapshotRecord {
  backend: "memory-preview";
  evidenceId: string;
  snapshot: EvidenceSnapshot;
  storedAt: string;
}

export interface StoredEvidenceVerificationResult {
  backend: "memory-preview";
  evidenceId: string;
  exists: boolean;
  matches: boolean;
  storedAt: string | null;
}

const runtimeSnapshotStore = new Map<string, StoredEvidenceSnapshotRecord>();

export async function storeEvidenceSnapshot(
  snapshot: EvidenceSnapshot,
): Promise<StoredEvidenceSnapshotRecord> {
  const record: StoredEvidenceSnapshotRecord = {
    backend: "memory-preview",
    evidenceId: snapshot.evidenceId,
    snapshot,
    storedAt: new Date().toISOString(),
  };

  runtimeSnapshotStore.set(snapshot.evidenceId, record);
  return record;
}

export async function retrieveEvidenceSnapshot(
  evidenceId: string,
): Promise<StoredEvidenceSnapshotRecord | null> {
  return runtimeSnapshotStore.get(evidenceId) || null;
}

export async function verifyStoredEvidence(
  evidenceId: string,
  snapshot?: EvidenceSnapshot | null,
): Promise<StoredEvidenceVerificationResult> {
  const stored = runtimeSnapshotStore.get(evidenceId) || null;

  return {
    backend: "memory-preview",
    evidenceId,
    exists: Boolean(stored),
    matches: Boolean(stored && snapshot && stored.snapshot.snapshotHash === snapshot.snapshotHash),
    storedAt: stored?.storedAt || null,
  };
}