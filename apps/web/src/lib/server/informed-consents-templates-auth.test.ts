import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import {
  handleTemplatesRequest,
  readFormsFallback,
  type TemplatesDependencies,
} from "@/app/api/modules/informed-consents/templates/route-handler";
import type { AuthContext } from "@/lib/server/auth";

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

function buildDeps(overrides: Partial<TemplatesDependencies> = {}): TemplatesDependencies {
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
      consentTemplate: {
        findMany: async () => [],
      },
    }),
    readFormsFallback: async () => [],
    ...overrides,
  } as unknown as TemplatesDependencies;
}

test("anonymous templates request returns 401 and does not expose a payload", async () => {
  let dbAccessed = false;
  let fallbackAccessed = false;

  const deps = buildDeps({
    requireModuleOperationalAccess: async () => {
      throw new ApiError(401, "Missing access token");
    },
    getPrisma: () => ({
      consentTemplate: {
        findMany: async () => {
          dbAccessed = true;
          return [];
        },
      },
    }),
    readFormsFallback: async () => {
      fallbackAccessed = true;
      return [];
    },
  });

  const response = await handleTemplatesRequest(
    makeRequest("http://localhost/api/modules/informed-consents/templates"),
    deps,
  );

  assert.equal(response.status, 401);
  assert.equal(dbAccessed, false);
  assert.equal(fallbackAccessed, false);

  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error, "Missing access token");
  assert.equal(Array.isArray(body.data), false);
});

test("templates authorization occurs before catalog or service loading", async () => {
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
      consentTemplate: {
        findMany: async () => {
          callOrder.push("db");
          return [];
        },
      },
    }),
    readFormsFallback: async () => {
      callOrder.push("fallback");
      return [];
    },
  });

  const response = await handleTemplatesRequest(
    makeRequest("http://localhost/api/modules/informed-consents/templates"),
    deps,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(callOrder, ["auth", "db", "fallback"]);
});

test("unauthorized authenticated role returns 403", async () => {
  const deps = buildDeps({
    requireModuleOperationalAccess: async () => {
      throw new ApiError(403, "Module access denied");
    },
  });

  const response = await handleTemplatesRequest(
    makeRequest("http://localhost/api/modules/informed-consents/templates"),
    deps,
  );

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error, "Module access denied");
});

test("authorized role receives expected response shape without logging values", async () => {
  const deps = buildDeps({
    requireModuleOperationalAccess: async () =>
      ({
        sub: "user-1",
        tenant_id: "tenant-a",
        role: "PHYSICIAN",
        platform_role: null,
      }) as AuthContext,
    getPrisma: () => ({
      consentTemplate: {
        findMany: async () => [
          {
            id: "template-1",
            templateCode: "APPENDECTOMY_CONSENT",
            titleAr: "موافقة استئصال الزائدة",
            titleEn: "Appendectomy Consent",
            consentType: "PROCEDURE_CONSENT",
            specialty: "General Surgery",
            department: "Surgery",
            currentVersionId: "v1",
          },
        ],
      },
    }),
  });

  const response = await handleTemplatesRequest(
    makeRequest("http://localhost/api/modules/informed-consents/templates"),
    deps,
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(Array.isArray(body), true);
  assert.equal(body.length, 1);
  assert.equal(body[0].id, "template-1");
  assert.equal(body[0].tenantId, undefined);
});

test("tenant isolation is enforced", async () => {
  let queryTenantId = "";

  const deps = buildDeps({
    requireModuleOperationalAccess: async () =>
      ({
        sub: "user-1",
        tenant_id: "tenant-b",
        role: "PHYSICIAN",
        platform_role: null,
      }) as AuthContext,
    getPrisma: () => ({
      consentTemplate: {
        findMany: async (args) => {
          queryTenantId = args.where.tenantId;
          return [];
        },
      },
    }),
  });

  await handleTemplatesRequest(
    makeRequest("http://localhost/api/modules/informed-consents/templates"),
    deps,
  );

  assert.equal(queryTenantId, "tenant-b");
});

test("authorized request with empty tenant falls back to public forms library", async () => {
  let fallbackAccessed = false;

  const deps = buildDeps({
    requireModuleOperationalAccess: async () =>
      ({
        sub: "user-1",
        tenant_id: "",
        role: "PHYSICIAN",
        platform_role: null,
      }) as AuthContext,
    readFormsFallback: async () => {
      fallbackAccessed = true;
      return [{ id: "fallback-form" }];
    },
  });

  const response = await handleTemplatesRequest(
    makeRequest("http://localhost/api/modules/informed-consents/templates"),
    deps,
  );

  assert.equal(response.status, 200);
  assert.equal(fallbackAccessed, true);
  const body = await response.json();
  assert.equal(Array.isArray(body), true);
  assert.equal(body[0].id, "fallback-form");
});

test("readFormsFallback maps approved forms library shape", async () => {
  const request = new NextRequest(
    "http://localhost/api/modules/informed-consents/templates",
  );

  const originalFetch = global.fetch;
  try {
    global.fetch = async () =>
      ({
        ok: true,
        json: async () => ({
          templates: [
            {
              id: "form-1",
              titleEn: "Appendectomy Consent",
              titleAr: "موافقة استئصال الزائدة",
              category: "PROCEDURE_CONSENT",
              specialty: "General Surgery",
              department: "Surgery",
              version: "1.0",
              procedure: "Appendectomy",
              riskLevel: "MEDIUM",
              approvalStatus: "approved",
            },
          ],
        }),
      }) as Response;

    const result = await readFormsFallback(request);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 1);
    const first = result[0] as Record<string, unknown>;
    assert.equal(first.id, "form-1");
    assert.equal(first.source, "forms_fallback");
    assert.equal(first.templateCode, "form-1");
  } finally {
    global.fetch = originalFetch;
  }
});
