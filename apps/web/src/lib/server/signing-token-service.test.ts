import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSigningUrl,
  computeTokenHash,
  generateSigningToken,
  verifySigningToken,
} from "./signing-token-service";

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("generateSigningToken creates a deterministic v1 HMAC token", () => {
  withEnv({ SIGNING_TOKEN_SECRET: "super-secret-at-least-32-characters" }, () => {
    const token = generateSigningToken({
      tenantId: "tenant-1",
      sessionId: "session-1",
      signerRole: "PATIENT",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    assert.ok(token.startsWith("v1:"), "token should start with version prefix");
    assert.match(token, /^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);

    const claims = verifySigningToken(token);
    assert.equal(claims.tenantId, "tenant-1");
    assert.equal(claims.sessionId, "session-1");
    assert.equal(claims.signerRole, "PATIENT");
    assert.equal(claims.tokenVersion, "v1");
  });
});

test("computeTokenHash returns SHA-256 hex of raw token", () => {
  withEnv({ SIGNING_TOKEN_SECRET: "super-secret-at-least-32-characters" }, () => {
    const token = generateSigningToken({
      tenantId: "tenant-1",
      sessionId: "session-1",
      signerRole: "PATIENT",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    const hash = computeTokenHash(token);
    assert.equal(hash.length, 64);
    assert.match(hash, /^[a-f0-9]+$/);
  });
});

test("verifySigningToken rejects an expired token", () => {
  withEnv({ SIGNING_TOKEN_SECRET: "super-secret-at-least-32-characters" }, () => {
    const token = generateSigningToken({
      tenantId: "tenant-1",
      sessionId: "session-1",
      signerRole: "PATIENT",
      expiresAt: new Date(Date.now() - 1),
    });

    assert.throws(() => verifySigningToken(token), /TOKEN_EXPIRED/);
  });
});

test("verifySigningToken rejects a tampered token", () => {
  withEnv({ SIGNING_TOKEN_SECRET: "super-secret-at-least-32-characters" }, () => {
    const token = generateSigningToken({
      tenantId: "tenant-1",
      sessionId: "session-1",
      signerRole: "PATIENT",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    const tampered = `${token}x`;
    assert.throws(() => verifySigningToken(tampered), /INVALID_TOKEN/);
  });
});

test("buildSigningUrl uses canonical production URL in production", () => {
  withEnv(
    {
      SIGNING_TOKEN_SECRET: "super-secret-at-least-32-characters",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    },
    () => {
      const token = generateSigningToken({
        tenantId: "tenant-1",
        sessionId: "session-1",
        signerRole: "PATIENT",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      const url = buildSigningUrl(token);
      assert.ok(url.startsWith("https://wathiqcare.online/sign/"));
      assert.ok(url.includes(encodeURIComponent(token)));
    },
  );
});

test("buildSigningUrl rejects a non-https URL outside test", () => {
  withEnv(
    {
      SIGNING_TOKEN_SECRET: "super-secret-at-least-32-characters",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    },
    () => {
      const token = generateSigningToken({
        tenantId: "tenant-1",
        sessionId: "session-1",
        signerRole: "PATIENT",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      assert.throws(
        () => buildSigningUrl(token, "http://wathiqcare.online"),
        /https/,
      );
    },
  );
});
