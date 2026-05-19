import { createHash } from "node:crypto";

import type { EvidenceAccessAction } from "@/lib/pdf-engine/access-control/evidence-access";
import type { EvidenceRole } from "@/lib/pdf-engine/access-control/role-policy";

export interface AccessAuditEvent {
  action: EvidenceAccessAction;
  actorId: string;
  actorTenantId: string | null;
  createdAt: string;
  department: string | null;
  evidenceId: string;
  eventId: string;
  outcome: "allowed" | "denied";
  reason: string;
  role: EvidenceRole;
}

const accessAuditTrail: AccessAuditEvent[] = [];

export function buildAccessAuditEvent(input: Omit<AccessAuditEvent, "createdAt" | "eventId">): AccessAuditEvent {
  const createdAt = new Date().toISOString();
  const eventId = createHash("sha256")
    .update([input.actorId, input.evidenceId, input.action, input.outcome, createdAt].join("|"), "utf8")
    .digest("hex")
    .slice(0, 16);

  return {
    ...input,
    createdAt,
    eventId,
  };
}

export function logEvidenceAccess(input: Omit<AccessAuditEvent, "createdAt" | "eventId">): AccessAuditEvent {
  const event = buildAccessAuditEvent(input);
  accessAuditTrail.push(event);
  return event;
}

export function retrieveAccessAuditTrail(query: {
  actorId?: string;
  evidenceId?: string;
  outcome?: "allowed" | "denied";
} = {}): AccessAuditEvent[] {
  return accessAuditTrail
    .filter((event) => (query.actorId ? event.actorId === query.actorId : true))
    .filter((event) => (query.evidenceId ? event.evidenceId === query.evidenceId : true))
    .filter((event) => (query.outcome ? event.outcome === query.outcome : true))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.eventId.localeCompare(right.eventId));
}