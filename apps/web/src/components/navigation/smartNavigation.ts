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

export type SmartBackendAction = {
  key?: string;
  label?: string;
  href?: string;
  priority?: number;
};

export type SmartBackendWorkflowPayload = {
  status?: string;
  nextAction?: SmartBackendAction | null;
  availableActions?: SmartBackendAction[] | null;
};

export type SmartResolvedAction = {
  key?: SmartActionKey;
  label?: string;
  href?: string;
};

export type SmartNavigationResolution = {
  moduleKey: SmartModuleKey;
  workflowStageKey: SmartWorkflowStageKey;
  source: "backend-driven" | "frontend-fallback";
  nextAction: SmartResolvedAction;
  secondaryActions: SmartResolvedAction[];
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

function mapBackendStatusToStage(status: string | undefined, fallback: SmartWorkflowStageKey): SmartWorkflowStageKey {
  const normalized = String(status || "").trim().toLowerCase();
  switch (normalized) {
    case "draft":
      return "draft";
    case "pending_review":
      return "pending_review";
    case "legal_review":
      return "legal_review";
    case "ready_for_package":
      return "ready_for_package";
    case "ready_for_approval":
      return "ready_for_approval";
    case "completed":
      return "completed";
    default:
      return fallback;
  }
}

function mapBackendActionKey(key: string | undefined): SmartActionKey | undefined {
  const normalized = String(key || "").trim().toLowerCase();
  switch (normalized) {
    case "review_case_status":
      return "reviewCaseStatus";
    case "upload_missing_document":
      return "uploadDocument";
    case "generate_legal_package":
      return "generateLegalPackage";
    case "check_legal_readiness":
      return "legalReadiness";
    case "send_for_approval":
      return "sendForApproval";
    case "link_document_to_case":
      return "linkDocumentToCase";
    case "export_report":
      return "exportReport";
    default:
      return undefined;
  }
}

function normalizeBackendAction(action: SmartBackendAction): SmartResolvedAction | null {
  if (!action) return null;
  const mappedKey = mapBackendActionKey(action.key);
  const label = typeof action.label === "string" && action.label.trim() ? action.label : undefined;
  const href = typeof action.href === "string" && action.href.trim() ? action.href : undefined;

  if (!mappedKey && !label && !href) {
    return null;
  }

  return {
    key: mappedKey,
    label,
    href,
  };
}

function uniqueResolvedActions(actions: SmartResolvedAction[]): SmartResolvedAction[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const dedupeKey = action.key || action.href || action.label;
    if (!dedupeKey) {
      return false;
    }
    if (seen.has(dedupeKey)) {
      return false;
    }
    seen.add(dedupeKey);
    return true;
  });
}

export function resolveSmartNavigation(
  pathname: string,
  availableActionKeys: SmartActionKey[],
  backendWorkflow?: SmartBackendWorkflowPayload | null,
): SmartNavigationResolution {
  const moduleKey = inferSmartModule(pathname);
  const rule = MODULE_RULES[moduleKey];

  const backendAvailableActions = (backendWorkflow?.availableActions || [])
    .map((action) => normalizeBackendAction(action))
    .filter((action): action is SmartResolvedAction => Boolean(action));
  const backendNextAction = backendWorkflow?.nextAction
    ? normalizeBackendAction(backendWorkflow.nextAction)
    : null;

  if (backendNextAction || backendAvailableActions.length > 0) {
    const resolvedNextAction = backendNextAction || backendAvailableActions[0];
    const secondaryActions = uniqueResolvedActions(
      backendAvailableActions.filter((action) => {
        const nextKey = resolvedNextAction.key || resolvedNextAction.href || resolvedNextAction.label;
        const actionKey = action.key || action.href || action.label;
        return Boolean(actionKey && nextKey && actionKey !== nextKey);
      }),
    );

    return {
      moduleKey,
      workflowStageKey: mapBackendStatusToStage(backendWorkflow?.status, rule.stage),
      source: "backend-driven",
      nextAction: resolvedNextAction,
      secondaryActions,
    };
  }

  const availableSet = new Set(availableActionKeys);

  const relevantAvailable = rule.preferredActions.filter((action) => availableSet.has(action));
  const availableExtra = availableActionKeys.filter((action) => !relevantAvailable.includes(action));
  const ordered = uniqueKeys([...relevantAvailable, ...availableExtra]);

  const nextActionKey = ordered[0] ?? rule.preferredActions[0];
  const secondaryActionKeys = ordered.filter((key) => key !== nextActionKey).map((key) => ({ key }));

  return {
    moduleKey,
    workflowStageKey: rule.stage,
    source: "frontend-fallback",
    nextAction: { key: nextActionKey },
    secondaryActions: secondaryActionKeys,
  };
}
