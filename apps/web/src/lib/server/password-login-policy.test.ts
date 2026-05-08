import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPostLoginRedirect,
  isEmailLoginIdentifier,
  normalizeLoginIdentifier,
} from "@/lib/server/password-login-policy";
import { userTypeForUserRole } from "@/lib/server/roles";

test("password login policy normalizes identifiers and distinguishes email inputs", () => {
  assert.equal(normalizeLoginIdentifier(" Demo.User@Example.COM "), "demo.user@example.com");
  assert.equal(normalizeLoginIdentifier(" demo.user "), "demo.user");
  assert.equal(isEmailLoginIdentifier("demo.user@example.com"), true);
  assert.equal(isEmailLoginIdentifier("demo.user"), false);
});

test("password login policy routes all authenticated users to /modules", () => {
  assert.equal(buildPostLoginRedirect("platform_admin", "platform.admin@wathiqcare.online"), "/modules");
  assert.equal(buildPostLoginRedirect("doctor", "doctor@pilot.imc.wathiqcare.online"), "/modules");
  assert.equal(buildPostLoginRedirect("finance_officer", "finance.admin@pilot.imc.wathiqcare.online"), "/modules");
});

test("user type is derived from role rather than a hard-coded admin email alias", () => {
  assert.equal(userTypeForUserRole("platform_superadmin", "admin@wathiqcare.online"), "PLATFORM_ADMIN");
  assert.equal(userTypeForUserRole("doctor", "admin@wathiqcare.online"), "TENANT_USER");
});
