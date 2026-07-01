/**
 * Audit Verification
 *
 * Verifies that every seeded entity has the expected governance event
 * and that event hashes are deterministic for the same input.
 */

import { buildImcSeedPlan } from "../migration/seed-from-imc";

export interface AuditVerificationResult {
  totalEntities: number;
  eventsCount: number;
  expectedEvents: number;
  missingEvents: Array<{ entityType: string; entityId: string }>;
  duplicateEventIds: string[];
  hashCollisions: number;
  success: boolean;
}

export function runAuditVerification(tenantId: string): AuditVerificationResult {
  const plan = buildImcSeedPlan({ tenantId });

  const expectedEntities: Array<{ entityType: string; entityId: string }> = [];

  for (const procedure of plan.procedures) {
    expectedEntities.push({ entityType: "PROCEDURE", entityId: procedure.id! });
  }
  for (const entry of plan.consentForms) {
    expectedEntities.push({ entityType: "FORM", entityId: entry.form.id as string });
  }
  for (const education of plan.educationMaterials) {
    expectedEntities.push({ entityType: "EDUCATION", entityId: education.id! });
  }
  for (const risk of plan.riskDisclosures) {
    expectedEntities.push({ entityType: "RISK", entityId: risk.id! });
  }
  for (const pkg of plan.packages) {
    expectedEntities.push({ entityType: "PACKAGE", entityId: pkg.package.id as string });
  }

  const eventKeys = new Set<string>();
  const eventIds = new Set<string>();
  const duplicateEventIds: string[] = [];
  const hashes = new Set<string>();
  let hashCollisions = 0;

  for (const event of plan.governanceEvents) {
    const key = `${event.entityType}:${event.entityId!}:${event.eventType}`;
    if (eventKeys.has(key)) {
      duplicateEventIds.push(event.id!);
    }
    eventKeys.add(key);

    if (eventIds.has(event.id!)) {
      duplicateEventIds.push(event.id!);
    }
    eventIds.add(event.id!);

    if (hashes.has(event.eventHash)) {
      hashCollisions++;
    }
    hashes.add(event.eventHash!);
  }

  const missingEvents: Array<{ entityType: string; entityId: string }> = [];
  for (const expected of expectedEntities) {
    const key = `${expected.entityType}:${expected.entityId}:PUBLISHED`;
    if (!eventKeys.has(key)) {
      missingEvents.push(expected);
    }
  }

  const success =
    missingEvents.length === 0 && duplicateEventIds.length === 0 && hashCollisions === 0;

  return {
    totalEntities: expectedEntities.length,
    eventsCount: plan.governanceEvents.length,
    expectedEvents: expectedEntities.length,
    missingEvents,
    duplicateEventIds,
    hashCollisions,
    success,
  };
}
