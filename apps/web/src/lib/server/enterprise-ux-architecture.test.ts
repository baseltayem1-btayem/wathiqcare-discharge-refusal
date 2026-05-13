import assert from "node:assert/strict";
import test from "node:test";

import { buildEnterpriseWorkspaceView, normalizeEnterpriseSectionKey } from "@/lib/enterprise/workspace";
import { ALL_MODULE_KEYS, getAccessibleModules } from "@/lib/modules/catalog";

test("enterprise module catalog exposes all governed modules to legal affairs", () => {
  const visibleModules = getAccessibleModules({ role: "legal_affairs", platformRole: null }).map((item) => item.key);
  assert.deepEqual(visibleModules, [...ALL_MODULE_KEYS]);
});

test("enterprise workspace shows legal-only actions at pending approval", () => {
  const view = buildEnterpriseWorkspaceView("legal-cases", { role: "legal_affairs", platformRole: null }, "workflow");
  const actionKeys = view.contextActions.map((item) => item.key);

  assert.equal(view.activeState, "pending-approval");
  assert.equal(actionKeys.includes("final-legal-approval"), true);
  assert.equal(actionKeys.includes("legal-hold"), true);
  assert.equal(actionKeys.includes("approve"), true);
});

test("enterprise workspace hides legal-only actions from physicians", () => {
  const view = buildEnterpriseWorkspaceView("informed-consents", { role: "physician", platformRole: null }, "workflow");
  const actionKeys = view.contextActions.map((item) => item.key);

  assert.equal(actionKeys.includes("submit"), false);
  assert.equal(actionKeys.includes("sign"), false);
  assert.equal(actionKeys.includes("final-legal-approval"), false);
  assert.equal(actionKeys.includes("approve"), false);
});

test("enterprise section normalization falls back to overview for invalid sections", () => {
  assert.equal(normalizeEnterpriseSectionKey("workflow"), "workflow");
  assert.equal(normalizeEnterpriseSectionKey("cases"), "overview");
});
