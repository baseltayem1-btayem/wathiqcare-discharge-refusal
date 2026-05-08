import assert from "node:assert/strict";
import test from "node:test";

import { canAccessModule, resolveModuleKeyFromPath } from "@/lib/modules/catalog";

test("module path resolver supports mounted module subroutes", () => {
    assert.equal(resolveModuleKeyFromPath("/modules/informed-consents"), "informed-consents");
    assert.equal(resolveModuleKeyFromPath("/modules/informed-consents/list"), "informed-consents");
    assert.equal(resolveModuleKeyFromPath("/modules/informed-consents/create"), "informed-consents");
    assert.equal(resolveModuleKeyFromPath("/modules/informed-consents/archive"), "informed-consents");
    assert.equal(resolveModuleKeyFromPath("/modules/informed-consents/templates"), "informed-consents");
    assert.equal(resolveModuleKeyFromPath("/modules/promissory-notes/list"), "promissory-notes");
    assert.equal(resolveModuleKeyFromPath("/modules/promissory-notes/create"), "promissory-notes");
    assert.equal(resolveModuleKeyFromPath("/modules/promissory-notes/archive"), "promissory-notes");
    assert.equal(resolveModuleKeyFromPath("/modules/discharge-refusal/dashboard"), "discharge-refusal");
    assert.equal(resolveModuleKeyFromPath("/modules/discharge-refusal/cases"), "discharge-refusal");
});

test("module access applies role isolation and platform override", () => {
    assert.equal(canAccessModule("informed-consents", { role: "doctor", platformRole: null }), true);
    assert.equal(canAccessModule("promissory-notes", { role: "doctor", platformRole: null }), false);
    assert.equal(canAccessModule("promissory-notes", { role: "finance_officer", platformRole: null }), true);
    assert.equal(canAccessModule("informed-consents", { role: "finance_officer", platformRole: null }), false);
    assert.equal(
        canAccessModule("promissory-notes", { role: "tenant_user", platformRole: "platform_admin" }),
        true,
    );
});
