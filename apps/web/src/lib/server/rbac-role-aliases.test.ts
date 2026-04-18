import assert from "node:assert/strict";
import test from "node:test";

import { can } from "@/lib/permissions/ui-rbac";
import { CASE_CREATOR_ROLES, EVIDENCE_BUNDLE_CREATOR_ROLES, userRoleAllows } from "./roles";

test("ER doctor aliases are treated as doctor for UI case creation", () => {
  const aliases = ["er_doctor", "emergency_doctor", "physician"];

  for (const alias of aliases) {
    const allowed = can("cases.create", {
      role: alias,
      platformRole: null,
      userId: "user-1",
    });

    assert.equal(allowed, true, `${alias} should be able to create cases in UI`);
  }
});

test("ER doctor aliases are allowed by API case creator role guard", () => {
  const aliases = ["er_doctor", "emergency_doctor", "physician"];

  for (const alias of aliases) {
    assert.equal(userRoleAllows(alias, CASE_CREATOR_ROLES), true, `${alias} should pass case creator guard`);
  }
});

test("legal roles can generate evidence bundles in UI and server guards", () => {
  const legalRoles = ["legal_admin", "legal_officer"];

  for (const role of legalRoles) {
    assert.equal(
      can("evidence.generate", {
        role,
        platformRole: null,
        userId: "user-1",
      }),
      true,
      `${role} should be able to generate evidence bundles in UI`,
    );

    assert.equal(
      userRoleAllows(role, EVIDENCE_BUNDLE_CREATOR_ROLES),
      true,
      `${role} should pass evidence bundle creator guard`,
    );
  }
});
