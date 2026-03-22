import assert from "node:assert/strict";
import test from "node:test";

import {
    evaluatePostAuthSnapshot,
    extractDomain,
    normalizeDomain,
    normalizeEmail,
} from "./auth-domain-policy";

test("normalizeEmail lowercases and trims valid emails", () => {
    assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
});

test("normalizeDomain strips @ prefix and lowercases", () => {
    assert.equal(normalizeDomain("@Example.COM"), "example.com");
});

test("extractDomain returns normalized domain", () => {
    assert.equal(extractDomain("Person@Tenant-Org.COM"), "tenant-org.com");
});

test("evaluatePostAuthSnapshot denies when domain is not allowed", () => {
    const denial = evaluatePostAuthSnapshot({
        domainAllowed: false,
        tenantActive: true,
        userActive: true,
        status: "active",
        hasRole: true,
        hasLicense: true,
    });

    assert.equal(denial, "DOMAIN_NOT_ALLOWED");
});

test("evaluatePostAuthSnapshot denies when user is pending", () => {
    const denial = evaluatePostAuthSnapshot({
        domainAllowed: true,
        tenantActive: true,
        userActive: true,
        status: "pending_approval",
        hasRole: true,
        hasLicense: true,
    });

    assert.equal(denial, "PENDING_APPROVAL");
});

test("evaluatePostAuthSnapshot denies when role is missing", () => {
    const denial = evaluatePostAuthSnapshot({
        domainAllowed: true,
        tenantActive: true,
        userActive: true,
        status: "active",
        hasRole: false,
        hasLicense: true,
    });

    assert.equal(denial, "NO_ROLE_ASSIGNED");
});

test("evaluatePostAuthSnapshot denies when license is missing", () => {
    const denial = evaluatePostAuthSnapshot({
        domainAllowed: true,
        tenantActive: true,
        userActive: true,
        status: "active",
        hasRole: true,
        hasLicense: false,
    });

    assert.equal(denial, "NO_LICENSE_ASSIGNED");
});

test("evaluatePostAuthSnapshot allows fully eligible user", () => {
    const denial = evaluatePostAuthSnapshot({
        domainAllowed: true,
        tenantActive: true,
        userActive: true,
        status: "active",
        hasRole: true,
        hasLicense: true,
    });

    assert.equal(denial, null);
});
