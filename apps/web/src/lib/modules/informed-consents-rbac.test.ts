import assert from "node:assert/strict";
import test from "node:test";
import { hasInformedConsentPermission } from "./informed-consents-rbac";
import type { AuthContext } from "@/lib/server/auth";

function auth(role?: string, platformRole?: string): AuthContext {
  return {
    sub: "user-test",
    role,
    user_type: "tenant_user",
    tenant_id: "tenant-test",
    platform_role: platformRole as AuthContext["platform_role"],
  };
}

test("physician and clinical reviewer roles can review illustrations", () => {
  assert.ok(hasInformedConsentPermission(auth("doctor"), "clinical_knowledge:review_illustrations"));
  assert.ok(hasInformedConsentPermission(auth("nurse"), "clinical_knowledge:review_illustrations"));
  assert.ok(
    hasInformedConsentPermission(auth("medical_director"), "clinical_knowledge:review_illustrations"),
  );
  assert.ok(
    hasInformedConsentPermission(auth("legal_admin"), "clinical_knowledge:review_illustrations"),
  );
  assert.ok(
    hasInformedConsentPermission(auth("compliance"), "clinical_knowledge:review_illustrations"),
  );
});

test("admin roles can review illustrations", () => {
  assert.ok(hasInformedConsentPermission(auth("admin"), "clinical_knowledge:review_illustrations"));
  assert.ok(hasInformedConsentPermission(auth("owner"), "clinical_knowledge:review_illustrations"));
  assert.ok(
    hasInformedConsentPermission(auth("tenant_admin"), "clinical_knowledge:review_illustrations"),
  );
});

test("viewer role cannot review illustrations", () => {
  assert.equal(
    hasInformedConsentPermission(auth("auditor"), "clinical_knowledge:review_illustrations"),
    false,
  );
  assert.equal(
    hasInformedConsentPermission(auth("quality"), "clinical_knowledge:review_illustrations"),
    false,
  );
});

test("platform admin can review illustrations", () => {
  assert.ok(
    hasInformedConsentPermission(
      { sub: "admin", user_type: "platform_admin", tenant_id: "tenant-test" },
      "clinical_knowledge:review_illustrations",
    ),
  );
});
