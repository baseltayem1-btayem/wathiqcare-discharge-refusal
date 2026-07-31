import assert from "node:assert/strict";
import test from "node:test";

import { requireInformedConsentsPageAccess } from "@/lib/server/informed-consents-page-auth";
import type { PageAuthClaims } from "@/lib/server/pageAuth";

function buildAuth(overrides: Partial<PageAuthClaims> = {}): PageAuthClaims {
  return {
    sub: "user-1",
    email: "doc@example.com",
    role: "PHYSICIAN",
    user_type: "tenant_user",
    tenant_id: "tenant-a",
    tenant_code: "TENANT-A",
    platform_role: null,
    ...overrides,
  };
}

test("settings page redirects anonymous users to /login", async () => {
  let redirectPath = "";

  const deps = {
    requirePageAuthClaimsOrRedirect: async (nextPath?: string) => {
      redirectPath = nextPath ?? "";
      const error = new Error("NEXT_REDIRECT");
      (error as Error & { digest?: string }).digest = "NEXT_REDIRECT;replace;/login?next=%2Fmodules%2Finformed-consents%2Fsettings&reason=session_missing";
      throw error;
    },
    canAccessModule: () => false,
  };

  await assert.rejects(
    () => requireInformedConsentsPageAccess("/modules/informed-consents/settings", deps),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as Error & { digest?: string }).digest?.startsWith("NEXT_REDIRECT"), true);
      assert.equal(redirectPath, "/modules/informed-consents/settings");
      return true;
    },
  );
});

test("settings page denies authenticated users without informed-consents role", async () => {
  const deps = {
    requirePageAuthClaimsOrRedirect: async () => buildAuth({ role: "finance_officer" }),
    canAccessModule: () => false,
  };

  const result = await requireInformedConsentsPageAccess("/modules/informed-consents/settings", deps);

  assert.equal(result.kind, "access_denied");
});

test("settings-support page allows authorized physician", async () => {
  const deps = {
    requirePageAuthClaimsOrRedirect: async () => buildAuth({ role: "PHYSICIAN" }),
    canAccessModule: () => true,
  };

  const result = await requireInformedConsentsPageAccess(
    "/modules/informed-consents/settings-support",
    deps,
  );

  assert.equal(result.kind, "authenticated");
  assert.equal(result.kind === "authenticated" && result.auth.role, "PHYSICIAN");
});

test("settings page allows platform admin", async () => {
  const deps = {
    requirePageAuthClaimsOrRedirect: async () =>
      buildAuth({ role: "tenant_user", platform_role: "platform_admin" }),
    canAccessModule: () => true,
  };

  const result = await requireInformedConsentsPageAccess("/modules/informed-consents/settings", deps);

  assert.equal(result.kind, "authenticated");
});

test("settings page preserves tenant context in authenticated result", async () => {
  const deps = {
    requirePageAuthClaimsOrRedirect: async () => buildAuth({ tenant_id: "tenant-b", tenant_code: "TENANT-B" }),
    canAccessModule: () => true,
  };

  const result = await requireInformedConsentsPageAccess("/modules/informed-consents/settings", deps);

  assert.equal(result.kind, "authenticated");
  if (result.kind === "authenticated") {
    assert.equal(result.auth.tenant_id, "tenant-b");
    assert.equal(result.auth.tenant_code, "TENANT-B");
  }
});
