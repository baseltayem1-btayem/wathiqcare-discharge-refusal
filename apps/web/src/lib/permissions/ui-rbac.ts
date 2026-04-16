export type UiPermissionKey =
  | "cases.create"
  | "cases.update.medical"
  | "cases.update.operational"
  | "cases.record.risk"
  | "cases.record.decision"
  | "cases.add.witness"
  | "legal.review"
  | "legal.approve.readiness"
  | "documents.generate_pdf"
  | "documents.download.final"
  | "audit.read"
  | "reports.read"
  | "sms.evidence.read"
  | "users.manage"
  | "settings.manage";

export type UiAuthContext = {
  role: string | null;
  platformRole: string | null;
  userId: string | null;
};

export type UiCaseAccessContext = {
  attendingPhysicianUserId?: string | null;
  assignedUserId?: string | null;
  createdByUserId?: string | null;
  ownerUserId?: string | null;
  metadata?: Record<string, unknown> | null;
};

const ROLE_ALIASES: Record<string, string> = {
  owner: "tenant_owner",
  admin: "tenant_admin",
  administrator: "tenant_admin",
  billing: "tenant_admin",
  nurse: "nursing",
  legal: "legal_admin",
  legal_manager: "legal_admin",
  legal_team: "legal_admin",
  legal_officer: "legal_admin",
  legal_affairs: "legal_admin",
  treating_physician: "doctor",
  nurse_coordinator: "nursing",
  quality_compliance: "quality",
  front_desk: "reception",
  patient_relations: "patient_affairs",
  social_services: "patient_affairs",
  member: "viewer",
};

const ROLE_PERMISSIONS: Record<string, Set<UiPermissionKey>> = {
  platform_superadmin: new Set<UiPermissionKey>([
    "cases.create",
    "cases.update.medical",
    "cases.update.operational",
    "cases.record.risk",
    "cases.record.decision",
    "cases.add.witness",
    "legal.review",
    "legal.approve.readiness",
    "documents.generate_pdf",
    "documents.download.final",
    "audit.read",
    "reports.read",
    "sms.evidence.read",
    "users.manage",
    "settings.manage",
  ]),
  platform_admin: new Set<UiPermissionKey>([
    "cases.create",
    "cases.update.medical",
    "cases.update.operational",
    "cases.record.risk",
    "cases.record.decision",
    "cases.add.witness",
    "legal.review",
    "legal.approve.readiness",
    "documents.generate_pdf",
    "documents.download.final",
    "audit.read",
    "reports.read",
    "sms.evidence.read",
    "users.manage",
    "settings.manage",
  ]),
  tenant_owner: new Set<UiPermissionKey>([
    "cases.create",
    "cases.update.medical",
    "cases.update.operational",
    "cases.record.risk",
    "cases.record.decision",
    "cases.add.witness",
    "legal.review",
    "legal.approve.readiness",
    "documents.generate_pdf",
    "documents.download.final",
    "audit.read",
    "reports.read",
    "users.manage",
    "settings.manage",
  ]),
  tenant_admin: new Set<UiPermissionKey>([
    "cases.create",
    "cases.update.medical",
    "cases.update.operational",
    "cases.record.risk",
    "cases.record.decision",
    "cases.add.witness",
    "legal.review",
    "legal.approve.readiness",
    "documents.generate_pdf",
    "documents.download.final",
    "audit.read",
    "reports.read",
    "users.manage",
    "settings.manage",
  ]),
  doctor: new Set<UiPermissionKey>([
    "cases.create",
    "cases.update.medical",
    "cases.record.risk",
    "cases.record.decision",
    "documents.download.final",
  ]),
  nursing: new Set<UiPermissionKey>([
    "cases.update.operational",
    "cases.add.witness",
  ]),
  legal_admin: new Set<UiPermissionKey>([
    "legal.review",
    "legal.approve.readiness",
    "documents.generate_pdf",
    "documents.download.final",
    "audit.read",
    "reports.read",
    "sms.evidence.read",
  ]),
  quality: new Set<UiPermissionKey>([
    "audit.read",
    "reports.read",
  ]),
  compliance: new Set<UiPermissionKey>([
    "audit.read",
    "reports.read",
  ]),
  patient_affairs: new Set<UiPermissionKey>([
    "cases.update.operational",
  ]),
  viewer: new Set<UiPermissionKey>([
    "reports.read",
  ]),
};

const ASSIGNED_SCOPE_PERMISSIONS = new Set<UiPermissionKey>([
  "cases.update.medical",
  "cases.update.operational",
  "cases.record.risk",
  "cases.record.decision",
  "cases.add.witness",
]);

function normalizeRole(role: string | null | undefined): string {
  const normalized = (role || "").trim().toLowerCase();
  if (!normalized) return "viewer";
  return ROLE_ALIASES[normalized] || normalized;
}

function hasPlatformRole(platformRole: string | null | undefined): boolean {
  return Boolean((platformRole || "").trim());
}

function readStringValue(record: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!record) return null;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readAssignmentIds(caseContext: UiCaseAccessContext): string[] {
  const metadata = caseContext.metadata || null;
  const workflow = metadata && typeof metadata["workflow"] === "object" && metadata["workflow"] !== null
    ? (metadata["workflow"] as Record<string, unknown>)
    : null;

  const ids = [
    caseContext.attendingPhysicianUserId,
    caseContext.assignedUserId,
    caseContext.createdByUserId,
    caseContext.ownerUserId,
    readStringValue(caseContext as unknown as Record<string, unknown>, [
      "attending_physician_user_id",
      "assigned_user_id",
      "assigned_to_user_id",
      "created_by",
      "owner_user_id",
    ]),
    readStringValue(metadata, [
      "attending_physician_user_id",
      "assigned_user_id",
      "assigned_to_user_id",
      "created_by",
      "owner_user_id",
    ]),
    readStringValue(workflow, [
      "attending_physician_user_id",
      "assigned_user_id",
      "assigned_to_user_id",
      "created_by",
      "owner_user_id",
    ]),
  ].filter((value): value is string => Boolean(value && value.trim()));

  return Array.from(new Set(ids));
}

export function can(permission: UiPermissionKey, auth: UiAuthContext): boolean {
  if (hasPlatformRole(auth.platformRole)) {
    return true;
  }

  const role = normalizeRole(auth.role);
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(permission) : false;
}

export function hasAnyPermission(permissions: UiPermissionKey[], auth: UiAuthContext): boolean {
  return permissions.some((permission) => can(permission, auth));
}

export function canAccessCase(
  caseContext: UiCaseAccessContext | null | undefined,
  permission: UiPermissionKey,
  auth: UiAuthContext,
): boolean {
  if (!can(permission, auth)) {
    return false;
  }

  if (hasPlatformRole(auth.platformRole)) {
    return true;
  }

  const role = normalizeRole(auth.role);
  if (role !== "doctor" && role !== "nursing") {
    return true;
  }

  if (!ASSIGNED_SCOPE_PERMISSIONS.has(permission)) {
    return true;
  }

  if (!caseContext || !auth.userId) {
    return true;
  }

  const assignmentIds = readAssignmentIds(caseContext);
  if (assignmentIds.length === 0) {
    return true;
  }

  return assignmentIds.includes(auth.userId);
}

export function getPermissionDeniedMessage(): string {
  return "You do not have permission to perform this action";
}
