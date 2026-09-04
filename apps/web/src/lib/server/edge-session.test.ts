import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { verifyEdgeSession } from "./edge-session";

function tokenFor(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

test("edge session accepts a valid signed, unexpired token", async () => {
  process.env.JWT_SECRET_KEY = "pilot-hardening-test-secret-32-bytes";
  process.env.JWT_ISSUER = "wathiqcare";
  const token = tokenFor(
    { sub: "user-1", iss: "wathiqcare", exp: Math.floor(Date.now() / 1000) + 60 },
    process.env.JWT_SECRET_KEY,
  );
  assert.equal((await verifyEdgeSession(token))?.sub, "user-1");
});

test("edge session rejects tampering, wrong issuer, expiry, and missing expiry", async () => {
  process.env.JWT_SECRET_KEY = "pilot-hardening-test-secret-32-bytes";
  process.env.JWT_ISSUER = "wathiqcare";
  const now = Math.floor(Date.now() / 1000);
  const valid = tokenFor({ sub: "user-1", iss: "wathiqcare", exp: now + 60 }, process.env.JWT_SECRET_KEY);
  assert.equal(await verifyEdgeSession(`${valid.slice(0, -1)}x`), null);
  assert.equal(
    await verifyEdgeSession(tokenFor({ sub: "user-1", iss: "other", exp: now + 60 }, process.env.JWT_SECRET_KEY)),
    null,
  );
  assert.equal(
    await verifyEdgeSession(tokenFor({ sub: "user-1", iss: "wathiqcare", exp: now - 120 }, process.env.JWT_SECRET_KEY)),
    null,
  );
  assert.equal(
    await verifyEdgeSession(tokenFor({ sub: "user-1", iss: "wathiqcare" }, process.env.JWT_SECRET_KEY)),
    null,
  );
});
