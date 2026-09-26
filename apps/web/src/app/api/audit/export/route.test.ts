import assert from "node:assert/strict";
import test from "node:test";
import type { NextRequest } from "next/server";

import { handleAuditExport, type AuditExportDependencies } from "./route";

function makeRequest(query: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/audit/export");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return { url: url.toString() } as unknown as NextRequest;
}

function buildDeps(overrides: Partial<AuditExportDependencies> = {}): AuditExportDependencies {
  const consentDocumentFindFirstCalls: unknown[] = [];
  const chainEventFindManyCalls: unknown[] = [];
  const consentEventFindManyCalls: unknown[] = [];

  const prisma = {
    consentDocument: {
      findFirst: async (args: unknown) => {
        consentDocumentFindFirstCalls.push(args);
        return {
          id: "doc-1",
          tenantId: "tenant-a",
          caseId: "enc-1",
          templateId: "template-1",
          consentReference: "IC-1",
          status: "DRAFT",
          documentVersion: "1",
          patientName: "Test Patient",
          mrn: "MRN-1",
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
          updatedAt: new Date("2026-06-01T00:00:00.000Z"),
        };
      },
    },
    auditChainEvent: {
      findMany: async (args: unknown) => {
        chainEventFindManyCalls.push(args);
        return [
          {
            id: "chain-1",
            eventType: "CONSENT_CREATED",
            actorId: "user-1",
            actorRole: "doctor",
            payloadSummary: "Created",
            currentHash: "hash-1",
            previousHash: null,
            createdAt: new Date("2026-06-01T00:00:00.000Z"),
            metadataJson: { documentId: "doc-1" },
          },
        ];
      },
    },
    consentAuditEvent: {
      findMany: async (args: unknown) => {
        consentEventFindManyCalls.push(args);
        return [
          {
            id: "audit-1",
            consentDocumentId: "doc-1",
            action: "consent_sent",
            actorUserId: "user-1",
            actorRole: "doctor",
            summary: "Sent",
            source: "unit-test",
            createdAt: new Date("2026-06-01T00:00:00.000Z"),
            metadata: { documentId: "doc-1" },
          },
        ];
      },
    },
  };

  const deps = {
    requireModuleOperationalAccess: async () => ({
      sub: "user-1",
      tenant_id: "tenant-a",
      role: "legal_admin",
      user_type: "tenant_admin",
      email: "legalreviewer@wathiqcare.med.sa",
      platform_role: null,
    }),
    requireInformedConsentPermission: () => undefined,
    writeConsentAudit: async () => undefined,
    getPrisma: () => prisma as never,
    resolveTemplateFromProcedure: ((async () => ({
      template: { id: "template-1" },
      version: { id: "version-1" },
    })) as unknown) as AuditExportDependencies["resolveTemplateFromProcedure"],
    ...overrides,
  } as AuditExportDependencies;

  Object.assign(deps, {
    __calls: {
      consentDocumentFindFirstCalls,
      chainEventFindManyCalls,
      consentEventFindManyCalls,
    },
  });

  return deps;
}

test("audit export scopes consent audit events to the resolved document", async () => {
  const deps = buildDeps();

  const response = await handleAuditExport(
    makeRequest({ encounterId: "enc-1", procedureId: "procedure-1" }),
    deps,
  );

  const body = JSON.parse(await response.text());
  const calls = (deps as AuditExportDependencies & {
    __calls: {
      consentDocumentFindFirstCalls: Array<Record<string, unknown>>;
      chainEventFindManyCalls: Array<Record<string, unknown>>;
      consentEventFindManyCalls: Array<Record<string, unknown>>;
    };
  }).__calls;

  assert.equal(response.status, 200);
  assert.equal(body.document.id, "doc-1");
  assert.equal(body.procedureId, "procedure-1");
  assert.equal(body.templateId, "template-1");
  assert.equal(body.consentEvents.length, 1);
  assert.equal(body.consentEvents[0].consentDocumentId, "doc-1");
  assert.deepEqual(calls.consentDocumentFindFirstCalls[0], {
    where: {
      tenantId: "tenant-a",
      caseId: "enc-1",
      templateId: "template-1",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tenantId: true,
      caseId: true,
      templateId: true,
      consentReference: true,
      status: true,
      documentVersion: true,
      patientName: true,
      mrn: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  assert.deepEqual(calls.consentEventFindManyCalls[0], {
    where: {
      tenantId: "tenant-a",
      consentDocumentId: "doc-1",
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      consentDocumentId: true,
      action: true,
      actorUserId: true,
      actorRole: true,
      summary: true,
      source: true,
      createdAt: true,
      metadata: true,
    },
  });
  assert.deepEqual(calls.chainEventFindManyCalls[0], {
    where: {
      tenantId: "tenant-a",
      caseId: "enc-1",
      metadataJson: { path: ["documentId"], equals: "doc-1" },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      eventType: true,
      actorId: true,
      actorRole: true,
      payloadSummary: true,
      currentHash: true,
      previousHash: true,
      createdAt: true,
      metadataJson: true,
    },
  });
});

test("audit export returns 404 when no consent document matches the encounter", async () => {
  const deps = buildDeps({
    getPrisma: () => ({
      consentDocument: {
        findFirst: async () => null,
      },
    }) as ReturnType<AuditExportDependencies["getPrisma"]>,
  });

  const response = await handleAuditExport(makeRequest({ encounterId: "missing-encounter" }), deps);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(body, { ok: false, error: "Consent document not found for this encounter" });
});

test("audit export rejects requests without encounterId before querying prisma", async () => {
  let queried = false;
  const deps = buildDeps({
    getPrisma: () => {
      queried = true;
      return {} as ReturnType<AuditExportDependencies["getPrisma"]>;
    },
  });

  const response = await handleAuditExport(makeRequest({}), deps);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "Missing required query parameter: encounterId");
  assert.equal(queried, false);
});