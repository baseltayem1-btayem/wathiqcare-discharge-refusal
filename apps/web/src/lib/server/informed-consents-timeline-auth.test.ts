import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import {
  handleTimelineRequest,
  type TimelineDependencies,
  type TimelineEvent,
} from "@/app/api/modules/informed-consents/timeline/route-handler";
import type { AuthContext } from "@/lib/server/auth";

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

function buildDeps(overrides: Partial<TimelineDependencies> = {}): TimelineDependencies {
  const auth: AuthContext = {
    sub: "user-1",
    tenant_id: "tenant-a",
    role: "PHYSICIAN",
    platform_role: null,
    email: "doc@example.com",
  };

  return {
    requireModuleOperationalAccess: async () => auth,
    getPrisma: () => ({
      auditChainEvent: {
        findMany: async () => [],
      },
    }),
    ...overrides,
  } as unknown as TimelineDependencies;
}

test("anonymous timeline request returns 401, not 500", async () => {
  let dbAccessed = false;

  const deps = buildDeps({
    requireModuleOperationalAccess: async () => {
      throw new ApiError(401, "Missing access token");
    },
    getPrisma: () => ({
      auditChainEvent: {
        findMany: async () => {
          dbAccessed = true;
          return [];
        },
      },
    }),
  });

  const response = await handleTimelineRequest(
    makeRequest("http://localhost/api/modules/informed-consents/timeline"),
    deps,
  );

  assert.equal(response.status, 401);
  assert.equal(dbAccessed, false);

  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error, "Missing access token");
});

test("timeline authorization occurs before database access", async () => {
  const callOrder: string[] = [];

  const deps = buildDeps({
    requireModuleOperationalAccess: async () => {
      callOrder.push("auth");
      return {
        sub: "user-1",
        tenant_id: "tenant-a",
        role: "PHYSICIAN",
        platform_role: null,
      } as AuthContext;
    },
    getPrisma: () => ({
      auditChainEvent: {
        findMany: async () => {
          callOrder.push("db");
          return [];
        },
      },
    }),
  });

  const response = await handleTimelineRequest(
    makeRequest("http://localhost/api/modules/informed-consents/timeline"),
    deps,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(callOrder, ["auth", "db"]);
});

test("authenticated unauthorized role returns 403", async () => {
  const deps = buildDeps({
    requireModuleOperationalAccess: async () => {
      throw new ApiError(403, "Module access denied");
    },
  });

  const response = await handleTimelineRequest(
    makeRequest("http://localhost/api/modules/informed-consents/timeline"),
    deps,
  );

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error, "Module access denied");
});

test("authorized timeline request returns expected shape", async () => {
  const deps = buildDeps({
    getPrisma: () => ({
      auditChainEvent: {
        findMany: async () => [
          {
            id: "event-1",
            eventType: "CONSENT_SEND",
            actorId: "user-1",
            actorRole: "physician",
            payloadSummary: "Consent sent to patient",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
      },
    }),
  });

  const response = await handleTimelineRequest(
    makeRequest("http://localhost/api/modules/informed-consents/timeline?caseId=case-1"),
    deps,
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as TimelineEvent[];
  assert.equal(Array.isArray(body), true);
  assert.equal(body.length, 1);
  assert.equal(body[0].id, "event-1");
  assert.equal(body[0].type, "consent_dispatched");
  assert.equal(body[0].actor, "physician");
  assert.equal(body[0].status, "completed");
});

test("tenant isolation is enforced", async () => {
  let queryTenantId = "";

  const deps = buildDeps({
    requireModuleOperationalAccess: async () =>
      ({
        sub: "user-1",
        tenant_id: "tenant-c",
        role: "PHYSICIAN",
        platform_role: null,
      }) as AuthContext,
    getPrisma: () => ({
      auditChainEvent: {
        findMany: async (args) => {
          queryTenantId = args.where.tenantId;
          return [];
        },
      },
    }),
  });

  await handleTimelineRequest(
    makeRequest("http://localhost/api/modules/informed-consents/timeline?documentId=doc-1"),
    deps,
  );

  assert.equal(queryTenantId, "tenant-c");
});

test("missing tenant context returns 400 after successful auth", async () => {
  const deps = buildDeps({
    requireModuleOperationalAccess: async () =>
      ({
        sub: "user-1",
        tenant_id: "",
        role: "PHYSICIAN",
        platform_role: null,
      }) as AuthContext,
  });

  const response = await handleTimelineRequest(
    makeRequest("http://localhost/api/modules/informed-consents/timeline"),
    deps,
  );

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, "Missing tenant context");
});
