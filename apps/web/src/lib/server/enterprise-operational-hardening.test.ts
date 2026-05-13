import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_ACCOUNT_PROFILES } from "@/lib/demo-access";
import {
  buildFinalRecommendation,
  buildRoleProvisioningSection,
  buildSeedDataSection,
  buildStagingDeploymentSection,
  renderOperationalHardeningMarkdown,
} from "@/lib/server/enterprise-operational-hardening";

test("staging deployment section passes for hardened staging inputs", () => {
  const section = buildStagingDeploymentSection({
    runtimeDbUrl: "postgresql://user:pass@staging-db.internal:5432/wathiqcare_staging",
    migrationDbUrl: "postgresql://user:pass@staging-db.internal:5432/wathiqcare_staging",
    jwtSecret: "super-secret-value",
    otpSecret: "otp-secret-value",
    tokenPepper: "pepper-secret-value",
    emailDeliveryMode: "mock",
    smsProvider: "mock",
    smsEnabled: "false",
    storageMode: "local_file",
    storageRoot: "/var/lib/wathiqcare/staging-documents",
  });

  assert.equal(section.checks.every((check) => check.status === "pass"), true);
});

test("role provisioning section passes for fully provisioned enterprise snapshots", () => {
  const section = buildRoleProvisioningSection(
    DEMO_ACCOUNT_PROFILES.map((profile) => ({
      email: profile.email,
      role: profile.role,
      tenantCode: profile.tenantCode,
      hasMembership: true,
      hasRoleAssignment: true,
    })),
  );

  assert.equal(section.checks.every((check) => check.status === "pass"), true);
});

test("final recommendation blocks rollout when any section fails", () => {
  const seedSection = buildSeedDataSection({
    caseCount: 4,
    workflowStateCount: 4,
    approvalChainCount: 4,
    approvalActionCount: 4,
    delegationRuleCount: 1,
    auditEventCount: 4,
    auditChainEventCount: 4,
    documentCount: 4,
    notificationCount: 3,
  });

  const recommendation = buildFinalRecommendation([
    buildStagingDeploymentSection({
      runtimeDbUrl: null,
      migrationDbUrl: null,
      jwtSecret: "replace-with-secret",
      otpSecret: "replace-with-secret",
      tokenPepper: "replace-with-secret",
      emailDeliveryMode: "mock",
      smsProvider: "mock",
      smsEnabled: "false",
      storageMode: "local_file",
      storageRoot: "/tmp/storage",
    }),
    seedSection,
  ]);

  assert.equal(recommendation.decision, "NO_GO");
  assert.equal(recommendation.blockers.length > 0, true);
});

test("markdown rendering includes final recommendation and section titles", () => {
  const section = buildSeedDataSection({
    caseCount: 4,
    workflowStateCount: 4,
    approvalChainCount: 4,
    approvalActionCount: 4,
    delegationRuleCount: 1,
    auditEventCount: 4,
    auditChainEventCount: 4,
    documentCount: 4,
    notificationCount: 3,
  });

  const markdown = renderOperationalHardeningMarkdown({
    generatedAt: "2026-05-13T00:00:00.000Z",
    environment: "staging",
    baseUrl: "https://staging.wathiqcare.online",
    sections: [section],
    finalRecommendation: buildFinalRecommendation([section]),
  });

  assert.match(markdown, /Enterprise Operational Hardening Report/);
  assert.match(markdown, /Enterprise Seed Data/);
  assert.match(markdown, /Final recommendation: GO/);
});
