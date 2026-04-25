export type CaseStatus =
  | "draft"
  | "pending_review"
  | "legal_review"
  | "ready_for_package"
  | "ready_for_approval"
  | "completed";

export type LegalActionKey =
  | "review_case_status"
  | "upload_missing_document"
  | "generate_legal_package"
  | "check_legal_readiness"
  | "send_for_approval"
  | "link_document_to_case";

export type LegalAction = {
  key: LegalActionKey;
  label: string;
  href: string;
  priority: number;
};

export type LegalWorkflowSignals = {
  hasDocuments: boolean;
  hasLegalPackage: boolean;
  isClosed: boolean;
};

export type LegalWorkflowContext = {
  caseId: string;
  signals: LegalWorkflowSignals;
};

export type LegalWorkflowResult = {
  caseId: string;
  status: CaseStatus;
  nextAction: LegalAction;
  availableActions: LegalAction[];
};

const ACTION_CATALOG: Record<LegalActionKey, Omit<LegalAction, "priority">> = {
  review_case_status: {
    key: "review_case_status",
    label: "Review case status",
    href: "/cases",
  },
  upload_missing_document: {
    key: "upload_missing_document",
    label: "Upload missing document",
    href: "/documents",
  },
  generate_legal_package: {
    key: "generate_legal_package",
    label: "Generate legal package",
    href: "/documents",
  },
  check_legal_readiness: {
    key: "check_legal_readiness",
    label: "Check legal readiness",
    href: "/dashboards",
  },
  send_for_approval: {
    key: "send_for_approval",
    label: "Send for approval",
    href: "/alerts",
  },
  link_document_to_case: {
    key: "link_document_to_case",
    label: "Link document to case",
    href: "/cases",
  },
};

function action(key: LegalActionKey, priority: number): LegalAction {
  return {
    ...ACTION_CATALOG[key],
    priority,
  };
}

export function deriveCaseStatus(signals: LegalWorkflowSignals): CaseStatus {
  if (signals.isClosed) {
    return "completed";
  }

  if (!signals.hasDocuments) {
    return "draft";
  }

  if (signals.hasDocuments && !signals.hasLegalPackage) {
    return "ready_for_package";
  }

  if (signals.hasLegalPackage) {
    return "ready_for_approval";
  }

  return "pending_review";
}

export function getNextAction(status: CaseStatus, context: LegalWorkflowContext): LegalAction {
  void context;

  switch (status) {
    case "draft":
      return action("upload_missing_document", 1);
    case "pending_review":
      return action("review_case_status", 1);
    case "legal_review":
      return action("check_legal_readiness", 1);
    case "ready_for_package":
      return action("generate_legal_package", 1);
    case "ready_for_approval":
      return action("send_for_approval", 1);
    case "completed":
      return action("review_case_status", 1);
    default:
      return action("review_case_status", 1);
  }
}

function buildAvailableActions(status: CaseStatus, context: LegalWorkflowContext): LegalAction[] {
  const actions: LegalAction[] = [];

  actions.push(getNextAction(status, context));

  if (!context.signals.hasDocuments) {
    actions.push(action("upload_missing_document", 2));
  } else {
    actions.push(action("link_document_to_case", 2));
  }

  if (!context.signals.hasLegalPackage) {
    actions.push(action("generate_legal_package", 3));
  }

  actions.push(action("check_legal_readiness", 4));
  actions.push(action("send_for_approval", 5));

  const unique = new Map<LegalActionKey, LegalAction>();
  for (const item of actions) {
    if (!unique.has(item.key)) {
      unique.set(item.key, item);
    }
  }

  return Array.from(unique.values()).sort((left, right) => left.priority - right.priority);
}

export function resolveLegalWorkflow(context: LegalWorkflowContext): LegalWorkflowResult {
  const status = deriveCaseStatus(context.signals);
  const nextAction = getNextAction(status, context);
  const availableActions = buildAvailableActions(status, context);

  return {
    caseId: context.caseId,
    status,
    nextAction,
    availableActions,
  };
}
