import assert from "node:assert/strict";
import test from "node:test";

import {
  createStepUpChallenge,
  isPrivilegedRole,
  isStepUpSessionTokenValid,
  isTenantAccessAllowed,
  verifyStepUpChallenge,
} from "./security-policy-service";

test("privileged role detection covers admin and legal roles", () => {
  assert.equal(isPrivilegedRole("tenant_admin"), true);
  assert.equal(isPrivilegedRole("legal_admin"), true);
  assert.equal(isPrivilegedRole("doctor"), false);
});

test("tenant isolation helper blocks cross-tenant access", () => {
  assert.equal(isTenantAccessAllowed("tenant-a", "tenant-a"), true);
  assert.equal(isTenantAccessAllowed("tenant-a", "tenant-b"), false);
  assert.equal(isTenantAccessAllowed("tenant-a", "tenant-b", true), true);
});

test("step-up challenge verification issues a valid session token", () => {
  const issuedAt = new Date("2026-04-08T12:00:00.000Z");
  const challenge = createStepUpChallenge({
    userId: "user-1",
    tenantId: "tenant-a",
    actionKey: "incident_create",
    now: issuedAt,
  });

  const verified = verifyStepUpChallenge({
    challengeToken: challenge.challengeToken,
    code: challenge.code,
    userId: "user-1",
    tenantId: "tenant-a",
    now: new Date("2026-04-08T12:04:00.000Z"),
  });

  assert.equal(verified.valid, true);
  assert.ok(verified.sessionToken);
  assert.equal(
    isStepUpSessionTokenValid({
      sessionToken: verified.sessionToken!,
      userId: "user-1",
      tenantId: "tenant-a",
      now: new Date("2026-04-08T12:10:00.000Z"),
    }),
    true,
  );
});

test("step-up verification rejects expired or incorrect codes", () => {
  const challenge = createStepUpChallenge({
    userId: "user-2",
    tenantId: "tenant-b",
    actionKey: "backup_job_create",
    now: new Date("2026-04-08T09:00:00.000Z"),
  });

  const wrongCode = verifyStepUpChallenge({
    challengeToken: challenge.challengeToken,
    code: "000000",
    userId: "user-2",
    tenantId: "tenant-b",
    now: new Date("2026-04-08T09:01:00.000Z"),
  });
  const expired = verifyStepUpChallenge({
    challengeToken: challenge.challengeToken,
    code: challenge.code,
    userId: "user-2",
    tenantId: "tenant-b",
    now: new Date("2026-04-08T09:30:00.000Z"),
  });

  assert.equal(wrongCode.valid, false);
  assert.equal(expired.valid, false);
});