import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_ACCOUNT_PROFILES, getVisibleModulesForRole } from "@/lib/demo-access";
import { buildPostLoginRedirect } from "@/lib/server/password-login-policy";

test("demo account definitions use canonical demo email identifiers", () => {
  const seen = new Set<string>();

  for (const profile of DEMO_ACCOUNT_PROFILES) {
    assert.equal(profile.email.includes("@"), true);
    assert.equal(profile.email.includes("demo"), true);
    assert.equal(seen.has(profile.email), false);
    seen.add(profile.email);
  }
});

test("demo account access matrix matches expected visible modules", () => {
  for (const profile of DEMO_ACCOUNT_PROFILES) {
    const visibleModules = getVisibleModulesForRole(
      profile.role,
      profile.role.startsWith("platform_") ? profile.role : null,
    );
    assert.deepEqual(visibleModules, [...profile.expectedModules]);
  }
});

test("demo accounts redirect to the module portal unless platform-wide", () => {
  for (const profile of DEMO_ACCOUNT_PROFILES) {
    const redirectPath = buildPostLoginRedirect(profile.role, profile.email);
    assert.equal(
      redirectPath,
      profile.role.startsWith("platform_") ? "/platform" : "/modules",
    );
  }
});
