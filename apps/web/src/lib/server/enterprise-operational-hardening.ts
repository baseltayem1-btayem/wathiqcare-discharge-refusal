import {
  DEMO_ACCOUNT_PROFILES,
  type DemoAccountProfile,
  getVisibleModulesForRole,
} from "@/lib/demo-access";
import { can } from "@/lib/permissions/ui-rbac";

export type ValidationStatus = "pass" | "warn" | "fail" | "skip";

export type ValidationCheck = {
  key: string;
  title: string;
  status: ValidationStatus;
  summary: string;
  details?: Record<string, unknown>;
};

export type ValidationSection = {
  key: string;
  title: string;
  checks: ValidationCheck[];
};

export type FinalRecommendation = {
  decision: "GO" | "NO_GO";
  blockers: string[];
  warnings: string[];
};

export type OperationalHardeningReport = {
  generatedAt: string;
  environment: string;
  baseUrl: string | null;
  sections: ValidationSection[];
  finalRecommendation: FinalRecommendation;
};

export type StagingDeploymentInput = {
  runtimeDbUrl?: string | null;
  migrationDbUrl?: string | null;
  jwtSecret?: string | null;
  otpSecret?: string | null;
  tokenPepper?: string | null;
  emailDeliveryMode?: string | null;
  smsProvider?: string | null;
  smsEnabled?: string | null;
  storageMode?: string | null;
  storageRoot?: string | null;
};

export type DemoUserSnapshot = {
  email: string;
  role: string | null;
  tenantCode: string | null;
  hasMembership: boolean;
  hasRoleAssignment: boolean;
};

export type WorkflowSeedSnapshot = {
  caseCount: number;
  workflowStateCount: number;
  approvalChainCount: number;
  approvalActionCount: number;
  delegationRuleCount: number;
  auditEventCount: number;
  auditChainEventCount: number;
  documentCount: number;
  notificationCount: number;
};

const PLACEHOLDER_PATTERNS = [
  "change-me",
  "replace-with",
  "example.com",
  "localhost",
  "******",
] as const;

const AUTHORITY_EXPECTATIONS: Record<
  DemoAccountProfile["key"],
  { workflow: boolean; approval: boolean; audit: boolean }
> = {
  "platform-admin": { workflow: true, approval: true, audit: true },
  "legal-affairs": { workflow: true, approval: true, audit: true },
  doctor: { workflow: true, approval: false, audit: false },
  nurse: { workflow: true, approval: false, audit: false },
  "medical-director": { workflow: false, approval: true, audit: false },
  compliance: { workflow: true, approval: true, audit: true },
  "finance-admin": { workflow: false, approval: true, audit: false },
  "external-reviewer": { workflow: true, approval: true, audit: false },
  "read-only-auditor": { workflow: false, approval: false, audit: true },
  "quality-manager": { workflow: false, approval: true, audit: true },
  "risk-officer": { workflow: true, approval: true, audit: true },
};

function createCheck(
  key: string,
  title: string,
  status: ValidationStatus,
  summary: string,
  details?: Record<string, unknown>,
): ValidationCheck {
  return { key, title, status, summary, details };
}

function isPlaceholderValue(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function normalizeBooleanFlag(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function buildStagingDeploymentSection(input: StagingDeploymentInput): ValidationSection {
  const checks: ValidationCheck[] = [];

  checks.push(
    createCheck(
      "runtime-db",
      "Runtime database URL",
      isPlaceholderValue(input.runtimeDbUrl) ? "fail" : "pass",
      isPlaceholderValue(input.runtimeDbUrl)
        ? "Runtime DATABASE_URL is missing or still points to a placeholder/local endpoint."
        : "Runtime DATABASE_URL is configured for a non-placeholder staging endpoint.",
    ),
  );

  checks.push(
    createCheck(
      "migration-db",
      "Migration database URL",
      isPlaceholderValue(input.migrationDbUrl) ? "fail" : "pass",
      isPlaceholderValue(input.migrationDbUrl)
        ? "DATABASE_URL_UNPOOLED is missing or still points to a placeholder/local endpoint."
        : "DATABASE_URL_UNPOOLED is configured for controlled DDL/migration access.",
    ),
  );

  const secretsHealthy =
    !isPlaceholderValue(input.jwtSecret) &&
    !isPlaceholderValue(input.otpSecret) &&
    !isPlaceholderValue(input.tokenPepper);
  checks.push(
    createCheck(
      "env-secrets",
      "Environment-safe secrets",
      secretsHealthy ? "pass" : "fail",
      secretsHealthy
        ? "JWT, OTP, and token pepper secrets are present and not using placeholders."
        : "One or more auth/session secrets are missing or still use placeholder values.",
    ),
  );

  const persistentStorageHealthy =
    (input.storageMode ?? "").trim().toLowerCase() === "local_file" &&
    Boolean((input.storageRoot ?? "").trim());
  checks.push(
    createCheck(
      "persistent-storage",
      "Persistent document storage",
      persistentStorageHealthy ? "pass" : "fail",
      persistentStorageHealthy
        ? "Persistent PDF/document storage is enabled with an explicit root path."
        : "Persistent storage is not fully configured; expected local_file mode with a storage root.",
      {
        storageMode: input.storageMode ?? null,
        storageRootConfigured: Boolean((input.storageRoot ?? "").trim()),
      },
    ),
  );

  const emailMockHealthy = (input.emailDeliveryMode ?? "").trim().toLowerCase() === "mock";
  const smsMockHealthy =
    (input.smsProvider ?? "").trim().toLowerCase() === "mock" &&
    !normalizeBooleanFlag(input.smsEnabled);
  checks.push(
    createCheck(
      "notification-mocks",
      "Staging-safe notification delivery",
      emailMockHealthy && smsMockHealthy ? "pass" : "warn",
      emailMockHealthy && smsMockHealthy
        ? "Email and SMS delivery are configured for non-production mock execution."
        : "Email/SMS delivery is not fully mocked; staging may still require additional delivery safeguards.",
      {
        emailDeliveryMode: input.emailDeliveryMode ?? null,
        smsProvider: input.smsProvider ?? null,
        smsEnabled: input.smsEnabled ?? null,
      },
    ),
  );

  return {
    key: "staging-deployment",
    title: "Staging Deployment",
    checks,
  };
}

export function buildRoleProvisioningSection(userSnapshots: DemoUserSnapshot[]): ValidationSection {
  const missingProfiles = DEMO_ACCOUNT_PROFILES.filter((profile) => {
    const snapshot = userSnapshots.find((entry) => entry.email === profile.email);
    return !snapshot;
  });
  const mismatchedProfiles = DEMO_ACCOUNT_PROFILES.filter((profile) => {
    const snapshot = userSnapshots.find((entry) => entry.email === profile.email);
    if (!snapshot) {
      return false;
    }
    return (
      snapshot.role !== profile.role ||
      snapshot.tenantCode !== profile.tenantCode ||
      !snapshot.hasMembership ||
      !snapshot.hasRoleAssignment
    );
  });

  const authorityMismatches = DEMO_ACCOUNT_PROFILES.filter((profile) => {
    const auth = {
      role: profile.role,
      platformRole: profile.role.startsWith("platform_") ? profile.role : null,
      userId: "seed-user",
    };
    const expected = AUTHORITY_EXPECTATIONS[profile.key];
    const workflowActual =
      can("workflow.submit", auth) ||
      can("workflow.escalate", auth) ||
      can("workflow.sign", auth) ||
      can("workflow.witness", auth);
    const approvalActual = can("approval.approve", auth) || can("approval.delegate", auth);
    const auditActual = can("audit.read", auth);
    return (
      workflowActual !== expected.workflow ||
      approvalActual !== expected.approval ||
      auditActual !== expected.audit
    );
  });

  const navigationMismatches = DEMO_ACCOUNT_PROFILES.filter((profile) => {
    const visibleModules = getVisibleModulesForRole(
      profile.role,
      profile.role.startsWith("platform_") ? profile.role : null,
    );
    return JSON.stringify(visibleModules) !== JSON.stringify([...profile.expectedModules]);
  });

  return {
    key: "role-provisioning",
    title: "Role Provisioning",
    checks: [
      createCheck(
        "seeded-enterprise-users",
        "Seeded enterprise users",
        missingProfiles.length === 0 ? "pass" : "fail",
        missingProfiles.length === 0
          ? "All required enterprise demo accounts are present in the staging seed set."
          : `Missing seeded enterprise users: ${missingProfiles.map((profile) => profile.label).join(", ")}.`,
      ),
      createCheck(
        "role-mappings",
        "Role, membership, and tenant mappings",
        missingProfiles.length === 0 && mismatchedProfiles.length === 0 ? "pass" : "fail",
        missingProfiles.length === 0 && mismatchedProfiles.length === 0
          ? "Seeded enterprise users have matching tenant, role, membership, and role-assignment state."
          : [
              missingProfiles.length > 0
                ? `Missing profiles: ${missingProfiles.map((profile) => profile.label).join(", ")}.`
                : null,
              mismatchedProfiles.length > 0
                ? `Role mapping mismatches detected for: ${mismatchedProfiles.map((profile) => profile.label).join(", ")}.`
                : null,
            ]
              .filter(Boolean)
              .join(" "),
      ),
      createCheck(
        "navigation-visibility",
        "Navigation visibility",
        navigationMismatches.length === 0 ? "pass" : "fail",
        navigationMismatches.length === 0
          ? "Each enterprise role resolves to the expected module navigation surface."
          : `Navigation visibility mismatches detected for: ${navigationMismatches.map((profile) => profile.label).join(", ")}.`,
      ),
      createCheck(
        "workflow-authority",
        "Workflow / approval / audit authority",
        authorityMismatches.length === 0 ? "pass" : "fail",
        authorityMismatches.length === 0
          ? "Role authorities align with the expected workflow, approval, and audit matrix."
          : `Authority mismatches detected for: ${authorityMismatches.map((profile) => profile.label).join(", ")}.`,
      ),
    ],
  };
}

export function buildSeedDataSection(snapshot: WorkflowSeedSnapshot): ValidationSection {
  const checks: ValidationCheck[] = [
    createCheck(
      "workflow-seed-cases",
      "Enterprise workflow cases",
      snapshot.caseCount >= 4 ? "pass" : "fail",
      snapshot.caseCount >= 4
        ? "Seeded enterprise cases cover informed consent, discharge refusal, promissory notes, and legal review."
        : "Expected at least four seeded enterprise workflow cases.",
      { caseCount: snapshot.caseCount },
    ),
    createCheck(
      "workflow-states",
      "Workflow states and approvals",
      snapshot.workflowStateCount >= 4 && snapshot.approvalChainCount >= 4 && snapshot.approvalActionCount >= 4
        ? "pass"
        : "fail",
      snapshot.workflowStateCount >= 4 && snapshot.approvalChainCount >= 4 && snapshot.approvalActionCount >= 4
        ? "Workflow states, approval chains, and approval actions are present for seeded enterprise flows."
        : "Workflow state or approval coverage is incomplete for seeded enterprise flows.",
      {
        workflowStateCount: snapshot.workflowStateCount,
        approvalChainCount: snapshot.approvalChainCount,
        approvalActionCount: snapshot.approvalActionCount,
      },
    ),
    createCheck(
      "delegation-escalation",
      "Delegation and escalation scenarios",
      snapshot.delegationRuleCount >= 1 ? "pass" : "fail",
      snapshot.delegationRuleCount >= 1
        ? "Delegation scenarios are seeded for enterprise approval validation."
        : "Delegation scenarios are missing from the enterprise seed data.",
      { delegationRuleCount: snapshot.delegationRuleCount },
    ),
    createCheck(
      "audit-document-notification-evidence",
      "Audit, document, and notification evidence",
      snapshot.auditEventCount >= 4 &&
      snapshot.auditChainEventCount >= 4 &&
      snapshot.documentCount >= 4 &&
      snapshot.notificationCount >= 3
        ? "pass"
        : "fail",
      snapshot.auditEventCount >= 4 &&
      snapshot.auditChainEventCount >= 4 &&
      snapshot.documentCount >= 4 &&
      snapshot.notificationCount >= 3
        ? "Audit trails, legal documents, and notifications are seeded for enterprise certification."
        : "Seeded audit, document, or notification evidence is incomplete.",
      {
        auditEventCount: snapshot.auditEventCount,
        auditChainEventCount: snapshot.auditChainEventCount,
        documentCount: snapshot.documentCount,
        notificationCount: snapshot.notificationCount,
      },
    ),
  ];

  return {
    key: "enterprise-seed-data",
    title: "Enterprise Seed Data",
    checks,
  };
}

export function buildSection(
  key: string,
  title: string,
  checks: ValidationCheck[],
): ValidationSection {
  return { key, title, checks };
}

export function buildFinalRecommendation(sections: ValidationSection[]): FinalRecommendation {
  const blockers = sections.flatMap((section) =>
    section.checks
      .filter((check) => check.status === "fail")
      .map((check) => `${section.title}: ${check.summary}`),
  );
  const warnings = sections.flatMap((section) =>
    section.checks
      .filter((check) => check.status === "warn")
      .map((check) => `${section.title}: ${check.summary}`),
  );

  return {
    decision: blockers.length === 0 ? "GO" : "NO_GO",
    blockers,
    warnings,
  };
}

export function renderOperationalHardeningMarkdown(report: OperationalHardeningReport): string {
  const lines: string[] = [
    "# Enterprise Operational Hardening Report",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Environment: ${report.environment}`,
    `- Base URL: ${report.baseUrl ?? "not configured"}`,
    `- Final recommendation: ${report.finalRecommendation.decision}`,
    "",
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`, "");
    for (const check of section.checks) {
      const icon =
        check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️" : check.status === "skip" ? "⏭️" : "❌";
      lines.push(`- ${icon} **${check.title}** — ${check.summary}`);
    }
    lines.push("");
  }

  lines.push("## Final Recommendation", "");
  if (report.finalRecommendation.blockers.length > 0) {
    lines.push("### Blockers", "");
    for (const blocker of report.finalRecommendation.blockers) {
      lines.push(`- ${blocker}`);
    }
    lines.push("");
  }
  if (report.finalRecommendation.warnings.length > 0) {
    lines.push("### Warnings", "");
    for (const warning of report.finalRecommendation.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function expectedAuthorityForProfile(profileKey: DemoAccountProfile["key"]): {
  workflow: boolean;
  approval: boolean;
  audit: boolean;
} {
  return AUTHORITY_EXPECTATIONS[profileKey];
}
