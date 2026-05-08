import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { POST } from "../../../app/api/auth/password/signup/route";

const ORIGINAL_ENABLE_PUBLIC_PASSWORD_SIGNUP = process.env.ENABLE_PUBLIC_PASSWORD_SIGNUP;

test("password signup route blocks unauthenticated self-registration when public signup is disabled", async () => {
    delete process.env.ENABLE_PUBLIC_PASSWORD_SIGNUP;

    const response = await POST(new NextRequest("http://localhost/api/auth/password/signup", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
    }));

    assert.equal(response.status, 403);

    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(payload.error, "Public signup is disabled. Accounts must be provisioned by an authorized administrator.");
});

test.after(() => {
    process.env.ENABLE_PUBLIC_PASSWORD_SIGNUP = ORIGINAL_ENABLE_PUBLIC_PASSWORD_SIGNUP;
});