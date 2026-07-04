/**
 * Governance Event Service
 *
 * Immutable audit chain for clinical knowledge entities.
 */

import { getPrisma } from "@/lib/server/prisma";
import type { Prisma } from "@prisma/client";
import type { ClinicalKnowledgeGovernanceEvent, ClinicalKnowledgeGovernanceEntityType } from "@/lib/clinical-knowledge/types";

export interface ListGovernanceEventsInput {
  tenantId: string;
  entityType?: ClinicalKnowledgeGovernanceEntityType;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export interface ListGovernanceEventsResult {
  items: ClinicalKnowledgeGovernanceEvent[];
  total: number;
}

export async function listGovernanceEvents(
  input: ListGovernanceEventsInput,
): Promise<ListGovernanceEventsResult> {
  const { tenantId, entityType, entityId, limit = 50, offset = 0 } = input;
  const prisma = getPrisma();

  const where: Record<string, unknown> = { tenantId };
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  const [items, total] = await Promise.all([
    prisma.governanceEvent.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    }),
    prisma.governanceEvent.count({ where }),
  ]);

  return {
    items: items.map(mapGovernanceEvent),
    total,
  };
}

export async function recordGovernanceEvent(
  tenantId: string,
  entityType: ClinicalKnowledgeGovernanceEntityType,
  entityId: string,
  eventType: ClinicalKnowledgeGovernanceEvent["eventType"],
  actorUserId: string,
  actorRole: string,
  comment?: string,
  metadata?: Record<string, unknown>,
): Promise<ClinicalKnowledgeGovernanceEvent> {
  const prisma = getPrisma();
  const now = new Date();
  const payload = `${tenantId}:${entityType}:${entityId}:${eventType}:${now.toISOString()}:${actorUserId}`;

  const item = await prisma.governanceEvent.create({
    data: {
      tenantId,
      entityType,
      entityId,
      eventType,
      actorUserId,
      actorRole,
      comment: comment ?? null,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      eventHash: simpleHash(payload),
      createdAt: now,
    },
  });

  return mapGovernanceEvent(item);
}

function mapGovernanceEvent(item: {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  actorUserId: string;
  actorRole: string;
  comment: string | null;
  metadata: unknown;
  previousHash: string | null;
  eventHash: string;
  createdAt: Date;
}): ClinicalKnowledgeGovernanceEvent {
  return {
    id: item.id,
    tenantId: item.tenantId,
    entityType: item.entityType as ClinicalKnowledgeGovernanceEntityType,
    entityId: item.entityId,
    eventType: item.eventType as ClinicalKnowledgeGovernanceEvent["eventType"],
    actorUserId: item.actorUserId,
    actorRole: item.actorRole,
    comment: item.comment,
    metadata: item.metadata as Record<string, unknown> | null,
    previousHash: item.previousHash,
    eventHash: item.eventHash,
    createdAt: item.createdAt.toISOString(),
  };
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
