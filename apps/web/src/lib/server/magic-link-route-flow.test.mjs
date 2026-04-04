import assert from "node:assert/strict";
import test from "node:test";

import {
    MAGIC_LINK_GENERIC_RESPONSE,
    codeFromMagicLinkVerifyDetail,
    handleMagicLinkRequestFlow,
    handleMagicLinkVerifyFlow,
    statusFromMagicLinkVerifyCode,
} from "./magic-link-route-flow.ts";

test("magic-link request flow issues link, records success, and writes audit", async () => {
    const attempts = [];
    const sentEmails = [];
    const auditLogs = [];
    const request = new Request("https://wathiqcare.online/api/auth/magic-link/request", {
        method: "POST",
        headers: { "user-agent": "node-test" },
        body: JSON.stringify({ email: "user@tenant.test" }),
    });

    const response = await handleMagicLinkRequestFlow({
        request,
        payload: { email: "user@tenant.test" },
        deps: {
            normalizeEmail(value) {
                return value.trim().toLowerCase();
            },
            async checkRateLimit() {
                return { limited: false };
            },
            async recordAttempt(email, success, reason) {
                attempts.push({ email, success, reason });
            },
            async findUser(email) {
                return {
                    id: "user-1",
                    email,
                    fullName: "Route Test User",
                    tenantId: "tenant-1",
                    role: "tenant_admin",
                    isActive: true,
                };
            },
            async createToken() {
                return {
                    tokenId: "token-1",
                    magicUrl: "https://wathiqcare.online/auth/magic?token=abc",
                    expiresAt: new Date("2026-04-04T12:00:00.000Z"),
                    expiresMinutes: 10,
                };
            },
            async sendEmail(args) {
                sentEmails.push(args);
            },
            async auditLog(args) {
                auditLogs.push(args);
            },
        },
    });

    assert.deepEqual(response, MAGIC_LINK_GENERIC_RESPONSE);
    assert.deepEqual(attempts, [
        { email: "user@tenant.test", success: true, reason: "MAGIC_LINK_SENT" },
    ]);
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].user.id, "user-1");
    assert.equal(sentEmails[0].magic.tokenId, "token-1");
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, "magic_link_requested");
    assert.equal(typeof auditLogs[0].timestamp, "string");
    assert.equal(Number.isNaN(Date.parse(auditLogs[0].timestamp)), false);
    assert.equal(auditLogs[0].metadataJson.timestamp, auditLogs[0].timestamp);
});

test("magic-link request flow keeps user-not-found responses generic and does not send email", async () => {
    const attempts = [];
    let sendEmailCalls = 0;

    const response = await handleMagicLinkRequestFlow({
        request: new Request("https://wathiqcare.online/api/auth/magic-link/request", { method: "POST" }),
        payload: { email: "missing@tenant.test" },
        deps: {
            normalizeEmail(value) {
                return value.trim().toLowerCase();
            },
            async checkRateLimit() {
                return { limited: false };
            },
            async recordAttempt(email, success, reason) {
                attempts.push({ email, success, reason });
            },
            async findUser() {
                throw Object.assign(new Error("User not found"), { status: 404 });
            },
            async createToken() {
                throw new Error("should not issue link");
            },
            async sendEmail() {
                sendEmailCalls += 1;
            },
            async auditLog() {
                throw new Error("should not audit");
            },
        },
    });

    assert.deepEqual(response, MAGIC_LINK_GENERIC_RESPONSE);
    assert.deepEqual(attempts, [
        { email: "missing@tenant.test", success: false, reason: "MAGIC_LINK_404" },
    ]);
    assert.equal(sendEmailCalls, 0);
});

test("magic-link request flow returns generic success when rate limited", async () => {
    const attempts = [];

    const response = await handleMagicLinkRequestFlow({
        request: new Request("https://wathiqcare.online/api/auth/magic-link/request", { method: "POST" }),
        payload: { email: "user@tenant.test" },
        deps: {
            normalizeEmail(value) {
                return value.trim().toLowerCase();
            },
            async checkRateLimit() {
                return { limited: true, waitSeconds: 900 };
            },
            async recordAttempt(email, success, reason) {
                attempts.push({ email, success, reason });
            },
            async findUser() {
                throw new Error("should not find user");
            },
            async createToken() {
                throw new Error("should not create token");
            },
            async sendEmail() {
                throw new Error("should not send email");
            },
            async auditLog() {
                throw new Error("should not audit");
            },
        },
    });

    assert.deepEqual(response, MAGIC_LINK_GENERIC_RESPONSE);
    assert.deepEqual(attempts, [
        { email: "user@tenant.test", success: false, reason: "MAGIC_LINK_RATE_LIMITED" },
    ]);
});

test("magic-link verify flow returns success payload and cookie metadata", async () => {
    const auditLogs = [];
    const attempts = [];

    const result = await handleMagicLinkVerifyFlow({
        request: new Request("https://wathiqcare.online/api/auth/magic-link/verify?token=abc", { method: "GET" }),
        token: "abc",
        deps: {
            async checkRateLimit() {
                return { limited: false };
            },
            async recordAttempt(token, success, reason) {
                attempts.push({ token, success, reason });
            },
            async verifyToken() {
                return {
                    user: {
                        id: "user-1",
                        tenant_id: "tenant-1",
                    },
                    session: {
                        accessToken: "jwt-token",
                        redirectTo: "/dashboard",
                        userType: "tenant_admin",
                    },
                };
            },
            async auditLog(args) {
                auditLogs.push(args);
            },
            getSessionCookieName() {
                return "wathiqcare_access_token";
            },
            getTokenTtlSeconds() {
                return 3600;
            },
        },
    });

    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
        authenticated: true,
        provider: "local_magic",
        redirectTo: "/dashboard",
        userType: "tenant_admin",
    });
    assert.deepEqual(result.cookie, {
        name: "wathiqcare_access_token",
        value: "jwt-token",
        maxAgeSeconds: 3600,
    });
    assert.deepEqual(attempts, [
        { token: "abc", success: true, reason: "MAGIC_LINK_VERIFY_SUCCESS" },
    ]);
    assert.deepEqual(auditLogs.map((entry) => entry.action), ["magic_link_used", "login_success"]);
    assert.equal(typeof auditLogs[0].timestamp, "string");
    assert.equal(Number.isNaN(Date.parse(auditLogs[0].timestamp)), false);
    assert.equal(auditLogs[1].timestamp, auditLogs[0].timestamp);
});

test("magic-link verify flow maps policy and link failures to stable codes and statuses", async () => {
    assert.equal(codeFromMagicLinkVerifyDetail("Your email domain is not allowed"), "DOMAIN_NOT_ALLOWED");
    assert.equal(codeFromMagicLinkVerifyDetail("This magic link has expired"), "EXPIRED_LINK");
    assert.equal(statusFromMagicLinkVerifyCode("DOMAIN_NOT_ALLOWED"), 403);
    assert.equal(statusFromMagicLinkVerifyCode("EXPIRED_LINK"), 410);

    const result = await handleMagicLinkVerifyFlow({
        request: new Request("https://wathiqcare.online/api/auth/magic-link/verify?token=bad", { method: "GET" }),
        token: "bad",
        deps: {
            async checkRateLimit() {
                return { limited: false };
            },
            async recordAttempt() {},
            async verifyToken() {
                throw new Error("This magic link has already been used");
            },
            async auditLog() {
                throw new Error("should not audit");
            },
            getSessionCookieName() {
                return "unused";
            },
            getTokenTtlSeconds() {
                return 1;
            },
        },
    });

    assert.deepEqual(result, {
        status: 410,
        body: {
            detail: "This magic link has already been used",
            code: "ALREADY_USED",
        },
    });
});

test("magic-link verify flow throttles repeated invalid token attempts without leaking limiter state", async () => {
    const attempts = [];

    const result = await handleMagicLinkVerifyFlow({
        request: new Request("https://wathiqcare.online/api/auth/magic-link/verify?token=guess", { method: "GET" }),
        token: "guess",
        deps: {
            async checkRateLimit() {
                return { limited: true, waitSeconds: 600 };
            },
            async recordAttempt(token, success, reason) {
                attempts.push({ token, success, reason });
            },
            async verifyToken() {
                throw new Error("should not verify token");
            },
            async auditLog() {
                throw new Error("should not audit");
            },
            getSessionCookieName() {
                return "unused";
            },
            getTokenTtlSeconds() {
                return 1;
            },
        },
    });

    assert.deepEqual(result, {
        status: 400,
        body: {
            detail: "Invalid magic link token",
            code: "INVALID_TOKEN",
        },
    });
    assert.deepEqual(attempts, [
        { token: "guess", success: false, reason: "MAGIC_LINK_VERIFY_RATE_LIMITED" },
    ]);
});