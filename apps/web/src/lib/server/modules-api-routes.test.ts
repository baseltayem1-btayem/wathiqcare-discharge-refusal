import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { ApiError } from "@/lib/server/http";
import {
    createInformedConsentsRouteHandlers,
    createPromissoryNotesRouteHandlers,
} from "@/lib/server/module-api-route-handlers";

const fakeAuth = {
    sub: "user-1",
    role: "tenant_admin",
    tenant_id: "tenant-1",
};

test("informed-consents API GET enforces auth and returns tenant-scoped list", async () => {
    let tenantGuardChecked = false;
    let listAuthTenant = "";

    const handlers = createInformedConsentsRouteHandlers({
        requireAuthFn: async () => fakeAuth,
        requireTenantOperationalAccessFn: () => {
            tenantGuardChecked = true;
        },
        listTenantConsentRecordsFn: async (auth) => {
            listAuthTenant = auth.tenant_id || "";
            return [{ id: "consent-1", caseId: "case-1" }];
        },
        createTenantConsentRecordFn: async () => ({ id: "consent-created" }),
    });

    const response = await handlers.GET(new NextRequest("http://localhost/api/modules/informed-consents?limit=20"));

    assert.equal(response.status, 200);
    assert.equal(tenantGuardChecked, true);
    assert.equal(listAuthTenant, "tenant-1");

    const payload = await response.json();
    assert.equal(Array.isArray(payload), true);
    assert.equal(payload[0]?.id, "consent-1");
});

test("informed-consents API POST blocks unauthorized tenant context", async () => {
    const handlers = createInformedConsentsRouteHandlers({
        requireAuthFn: async () => fakeAuth,
        requireTenantOperationalAccessFn: () => {
            throw new ApiError(403, "Tenant is inactive");
        },
        listTenantConsentRecordsFn: async () => [],
        createTenantConsentRecordFn: async () => ({ id: "consent-created" }),
    });

    const response = await handlers.POST(new NextRequest("http://localhost/api/modules/informed-consents", {
        method: "POST",
        body: JSON.stringify({ caseId: "case-1" }),
        headers: { "content-type": "application/json" },
    }));

    assert.equal(response.status, 403);

    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(payload.error, "Tenant is inactive");
});

test("promissory-notes API GET enforces auth and returns tenant-scoped list", async () => {
    let tenantGuardChecked = false;
    let listAuthTenant = "";

    const handlers = createPromissoryNotesRouteHandlers({
        requireAuthFn: async () => fakeAuth,
        requireTenantOperationalAccessFn: () => {
            tenantGuardChecked = true;
        },
        listTenantPromissoryNotesFn: async (auth) => {
            listAuthTenant = auth.tenant_id || "";
            return [{ id: "note-1", caseId: "case-1" }];
        },
        createTenantPromissoryNoteFn: async () => ({ id: "note-created" }),
    });

    const response = await handlers.GET(new NextRequest("http://localhost/api/modules/promissory-notes?limit=20"));

    assert.equal(response.status, 200);
    assert.equal(tenantGuardChecked, true);
    assert.equal(listAuthTenant, "tenant-1");

    const payload = await response.json();
    assert.equal(Array.isArray(payload), true);
    assert.equal(payload[0]?.id, "note-1");
});

test("promissory-notes API POST blocks unauthorized tenant context", async () => {
    const handlers = createPromissoryNotesRouteHandlers({
        requireAuthFn: async () => fakeAuth,
        requireTenantOperationalAccessFn: () => {
            throw new ApiError(403, "Tenant is inactive");
        },
        listTenantPromissoryNotesFn: async () => [],
        createTenantPromissoryNoteFn: async () => ({ id: "note-created" }),
    });

    const response = await handlers.POST(new NextRequest("http://localhost/api/modules/promissory-notes", {
        method: "POST",
        body: JSON.stringify({ caseId: "case-1", debtorName: "John", amount: "100" }),
        headers: { "content-type": "application/json" },
    }));

    assert.equal(response.status, 403);

    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(payload.error, "Tenant is inactive");
});
