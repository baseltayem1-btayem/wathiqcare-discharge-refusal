export type SmartModuleKey =
  | "dashboard"
  | "case_management"
  | "case_workspace"
  | "documents"
  | "alerts"
  | "legal_risk"
  | "reports"
  | "users"
  | "settings";

export type SmartWorkflowStageKey =
  | "draft"
  | "pending_review"
  | "legal_review"
  | "ready_for_package"
  | "ready_for_approval"
  | "completed";

export type SmartActionKey =
  | "newCase"
  | "caseWorkspace"
  | "reviewCaseStatus"
  | "uploadDocument"
  | "linkDocumentToCase"
  | "reviewDocumentStatus"
  | "generateLegalPackage"
  | "legalReadiness"
  | "sendForApproval"
  | "generateReport"
  | "exportReport"
  | "reviewHighRiskItems"
  | "openRiskDashboard";

export type SmartNavigationResolution = {
  moduleKey: SmartModuleKey;
  workflowStageKey: SmartWorkflowStageKey;
  nextActionKey: SmartActionKey;
  secondaryActionKeys: SmartActionKey[];
};

const MODULE_RULES: Record<SmartModuleKey, { stage: SmartWorkflowStageKey; preferredActions: SmartActionKey[] }> = {
  dashboard: {
    stage: "draft",
    preferredActions: ["reviewCaseStatus", "newCase", "legalReadiness", "generateReport"],
  },
  case_management: {
    stage: "pending_review",
    preferredActions: [
      "reviewCaseStatus",
      "uploadDocument",
      "generateLegalPackage",
      "legalReadiness",
      "sendForApproval",
      "newCase",
    ],
  },
  case_workspace: {
    stage: "legal_review",
    preferredActions: [
      "caseWorkspace",
      "reviewCaseStatus",
      "uploadDocument",
      "generateLegalPackage",
      "legalReadiness",
      "sendForApproval",
    ],
  },
  documents: {
    stage: "ready_for_package",
    preferredActions: ["uploadDocument", "linkDocumentToCase", "reviewDocumentStatus", "generateLegalPackage"],
  },
  alerts: {
    stage: "pending_review",
    preferredActions: ["sendForApproval", "reviewCaseStatus", "legalReadiness"],
  },
  legal_risk: {
    stage: "legal_review",
    preferredActions: ["reviewHighRiskItems", "openRiskDashboard", "reviewCaseStatus"],
  },
  reports: {
    stage: "ready_for_approval",
    preferredActions: ["generateReport", "exportReport", "reviewCaseStatus"],
  },
  users: {
    stage: "completed",
    preferredActions: ["reviewCaseStatus", "generateReport"],
  },
  settings: {
    stage: "completed",
    preferredActions: ["reviewCaseStatus", "generateReport"],
  },
};

function startsWithRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function inferSmartModule(pathname: string): SmartModuleKey {
  if (startsWithRoute(pathname, "/cases")) {
    return pathname === "/cases" ? "case_management" : "case_workspace";
  }

  if (startsWithRoute(pathname, "/documents")) return "documents";
  if (startsWithRoute(pathname, "/alerts")) return "alerts";
  if (startsWithRoute(pathname, "/legal-risk")) return "legal_risk";
  if (startsWithRoute(pathname, "/reports")) return "reports";
  if (startsWithRoute(pathname, "/users")) return "users";
  if (startsWithRoute(pathname, "/settings")) return "settings";

  if (startsWithRoute(pathname, "/platform/users")) return "users";
  if (startsWithRoute(pathname, "/platform/settings")) return "settings";
  if (startsWithRoute(pathname, "/platform/reports")) return "reports";
  if (startsWithRoute(pathname, "/platform/alerts")) return "alerts";

  if (startsWithRoute(pathname, "/dashboard") || startsWithRoute(pathname, "/dashboards") || startsWithRoute(pathname, "/platform")) {
    return "dashboard";
  }

  return "dashboard";
}

function uniqueKeys(keys: SmartActionKey[]): SmartActionKey[] {
  const seen = new Set<SmartActionKey>();
  return keys.filter((key) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveSmartNavigation(pathname: string, availableActionKeys: SmartActionKey[]): SmartNavigationResolution {
  const moduleKey = inferSmartModule(pathname);
  const rule = MODULE_RULES[moduleKey];
  const availableSet = new Set(availableActionKeys);

  const relevantAvailable = rule.preferredActions.filter((action) => availableSet.has(action));
  const availableExtra = availableActionKeys.filter((action) => !relevantAvailable.includes(action));
  const ordered = uniqueKeys([...relevantAvailable, ...availableExtra]);

  const nextActionKey = ordered[0] ?? rule.preferredActions[0];
  const secondaryActionKeys = ordered.filter((key) => key !== nextActionKey);

  return {
    moduleKey,
    workflowStageKey: rule.stage,
    nextActionKey,
    secondaryActionKeys,
  };
}
