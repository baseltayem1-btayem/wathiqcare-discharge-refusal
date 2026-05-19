import { stableSerializeRuntimeValue, type RuntimeValue } from "@/lib/pdf-engine/runtime/evidence-snapshot";
import { createHash } from "node:crypto";

export interface BuildForensicAuditEventInput {
  eventType: string;
  actor: string;
  timestamp?: string | Date;
  ipAddress?: string | null;
  sourceModule: string;
  evidenceId: string;
  previousChainHash?: string | null;
  details?: RuntimeValue | null;
}

export interface ForensicAuditEvent {
  actor: string;
  currentChainHash: string;
  details: RuntimeValue | null;
  evidenceId: string;
  eventType: string;
  ipAddress: string | null;
  previousChainHash: string | null;
  sourceModule: string;
  timestamp: string;
}

export function generateAuditChainHash(
  input: Omit<ForensicAuditEvent, "currentChainHash">,
): string {
  return createHash("sha256")
    .update(stableSerializeRuntimeValue(input as unknown as RuntimeValue), "utf8")
    .digest("hex");
}

export function buildForensicAuditEvent(
  input: BuildForensicAuditEventInput,
): ForensicAuditEvent {
  const timestamp = input.timestamp instanceof Date ? input.timestamp.toISOString() : input.timestamp || new Date().toISOString();
  const auditEventBase = {
    actor: input.actor,
    details: input.details || null,
    evidenceId: input.evidenceId,
    eventType: input.eventType,
    ipAddress: input.ipAddress ?? null,
    previousChainHash: input.previousChainHash ?? null,
    sourceModule: input.sourceModule,
    timestamp,
  };

  return {
    ...auditEventBase,
    currentChainHash: generateAuditChainHash(auditEventBase),
  };
}