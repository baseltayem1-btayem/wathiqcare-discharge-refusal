import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { createFieldMappingRouteHandlers, isConsentFormTableUnavailableError } from "@/lib/server/field-mapping-route-handler";

function createMockPrisma(overrides: {
  findFirst?: () => Promise<unknown>;
  update?: () => Promise<unknown>;
} = {}): unknown {
  return {
    consentForm: {
      findFirst: overrides.findFirst ?? (async () => null),
      update: overrides.update ?? (async () => ({})),
    },
  };
}

function createP2021ConsentFormError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "The table public.clinical_consent_forms does not exist in the current database.",
    { code: "P2021", clientVersion: "6.19.2" },
  );
}

function createUnrelatedP2021Error(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "The table public.some_other_table does not exist in the current database.",
    { code: "P2021", clientVersion: "6.19.2" },
  );
}

function createP2003Error(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "Foreign key constraint failed.",
    { code: "P2003", clientVersion: "6.19.2" },
  );
}

function makeRequest(formId: string): NextRequest {
  return new NextRequest(`http://localhost/api/modules/informed-consents/forms/${encodeURIComponent(formId)}/field-mapping`);
}

test("isConsentFormTableUnavailableError matches P2021 for clinical_consent_forms", () => {
  assert.equal(isConsentFormTableUnavailableError(createP2021ConsentFormError()), true);
});

test("isConsentFormTableUnavailableError rejects unrelated P2021", () => {
  assert.equal(isConsentFormTableUnavailableError(createUnrelatedP2021Error()), false);
});

test("isConsentFormTableUnavailableError rejects non-P2021 Prisma errors", () => {
  assert.equal(isConsentFormTableUnavailableError(createP2003Error()), false);
});

test("isConsentFormTableUnavailableError rejects ordinary errors", () => {
  assert.equal(isConsentFormTableUnavailableError(new Error("something else")), false);
});

test("GET returns 200 with static MR1135 mapping when ConsentForm table is unavailable", async () => {
  const handlers = createFieldMappingRouteHandlers({
    requireModuleOperationalAccess: async () => ({ sub: "user-1", tenant_id: "tenant-1" }),
    getPrisma: () => createMockPrisma({
      findFirst: async () => { throw createP2021ConsentFormError(); },
    }) as never,
  });

  const response = await handlers.GET(makeRequest("imc-approved-amputation"), { params: Promise.resolve({ formId: "imc-approved-amputation" }) });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.formId, "imc-approved-amputation");
  assert.equal(payload.slug, "amputation");
  assert.equal(payload.hasMapping, true);
  assert.equal(payload.verificationStatus, "VERIFIED");
  assert.equal(payload.mapping?.layoutFamily, "IMC_MR_1135_ACROFORM");
  assert.equal(payload.acroForm?.manifestState?.status, "READY");
  assert.equal(payload.requiredDoctorFields.length, 15);
  assert.equal(payload.requiredPatientFields.length, 2);
  assert.equal(payload.persistence?.available, false);
  assert.equal(payload.persistence?.reason, "CONSENT_FORM_TABLE_UNAVAILABLE");
});

test("GET returns 200 and uses persisted verification when ConsentForm table is available", async () => {
  const mappingHash = "abc123";
  const handlers = createFieldMappingRouteHandlers({
    requireModuleOperationalAccess: async () => ({ sub: "user-1", tenant_id: "tenant-1" }),
    getPrisma: () => createMockPrisma({
      findFirst: async () => ({
        id: "imc-approved-amputation",
        metadata: {
          fieldMappingVerification: {
            status: "VERIFIED",
            approvedAt: "2026-07-15T00:00:00.000Z",
            approvedByUserId: "user-1",
            mappingHash,
          },
        },
      }),
    }) as never,
  });

  const response = await handlers.GET(makeRequest("imc-approved-amputation"), { params: Promise.resolve({ formId: "imc-approved-amputation" }) });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.hasMapping, true);
  assert.equal(payload.verificationStatus, "VERIFIED");
  assert.equal(payload.persistence?.available, true);
  assert.equal(payload.persistedVerification?.mappingHash, mappingHash);
});

test("GET returns 500 for unrelated Prisma errors", async () => {
  const handlers = createFieldMappingRouteHandlers({
    requireModuleOperationalAccess: async () => ({ sub: "user-1", tenant_id: "tenant-1" }),
    getPrisma: () => createMockPrisma({
      findFirst: async () => { throw createP2003Error(); },
    }) as never,
  });

  const response = await handlers.GET(makeRequest("imc-approved-amputation"), { params: Promise.resolve({ formId: "imc-approved-amputation" }) });

  assert.equal(response.status, 500);
  const payload = await response.json();
  assert.equal(payload.ok, false);
});

test("GET enforces authentication unchanged", async () => {
  const handlers = createFieldMappingRouteHandlers({
    requireModuleOperationalAccess: async () => { throw Object.assign(new Error("Unauthorized"), { status: 401 }); },
    getPrisma: () => createMockPrisma() as never,
  });

  const response = await handlers.GET(makeRequest("imc-approved-amputation"), { params: Promise.resolve({ formId: "imc-approved-amputation" }) });

  assert.equal(response.status, 401);
});

test("GET returns missing mapping for unregistered form", async () => {
  const handlers = createFieldMappingRouteHandlers({
    requireModuleOperationalAccess: async () => ({ sub: "user-1", tenant_id: "tenant-1" }),
    getPrisma: () => createMockPrisma() as never,
  });

  const response = await handlers.GET(makeRequest("some-unregistered-form"), { params: Promise.resolve({ formId: "some-unregistered-form" }) });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.hasMapping, false);
  assert.equal(payload.verificationStatus, "MISSING");
  assert.equal(payload.acroForm, null);
});

test("GET resolves MR1135 aliases to canonical identity even when table is unavailable", async () => {
  const handlers = createFieldMappingRouteHandlers({
    requireModuleOperationalAccess: async () => ({ sub: "user-1", tenant_id: "tenant-1" }),
    getPrisma: () => createMockPrisma({
      findFirst: async () => { throw createP2021ConsentFormError(); },
    }) as never,
  });

  for (const alias of ["MR 1135", "MR1135", "imc-mr-1135"]) {
    const response = await handlers.GET(makeRequest(alias), { params: Promise.resolve({ formId: alias }) });
    const payload = await response.json();
    assert.equal(response.status, 200, `alias ${alias}`);
    assert.equal(payload.formId, "imc-approved-amputation", `alias ${alias}`);
    assert.equal(payload.requiredDoctorFields.length, 15, `alias ${alias}`);
    assert.equal(payload.acroForm?.manifestState?.status, "READY", `alias ${alias}`);
  }
});

test("POST verify remains fail-closed when ConsentForm table is unavailable", async () => {
  const handlers = createFieldMappingRouteHandlers({
    requireModuleOperationalAccess: async () => ({ sub: "user-1", tenant_id: "tenant-1" }),
    getPrisma: () => createMockPrisma({
      findFirst: async () => { throw createP2021ConsentFormError(); },
    }) as never,
  });

  const request = new NextRequest("http://localhost/api/modules/informed-consents/forms/imc-approved-amputation/field-mapping", {
    method: "POST",
    body: JSON.stringify({ action: "verify" }),
    headers: { "content-type": "application/json" },
  });

  const response = await handlers.POST(request, { params: Promise.resolve({ formId: "imc-approved-amputation" }) });

  assert.equal(response.status, 500);
  const payload = await response.json();
  assert.equal(payload.ok, false);
});

test("adenotonsillectomy MR1168 GET behavior is unchanged", async () => {
  const handlers = createFieldMappingRouteHandlers({
    requireModuleOperationalAccess: async () => ({ sub: "user-1", tenant_id: "tenant-1" }),
    getPrisma: () => createMockPrisma() as never,
  });

  const response = await handlers.GET(makeRequest("imc-approved-adenotonsillectomy"), { params: Promise.resolve({ formId: "imc-approved-adenotonsillectomy" }) });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.formId, "imc-approved-adenotonsillectomy");
  assert.equal(payload.hasMapping, true);
  assert.equal(payload.acroForm, null);
});
