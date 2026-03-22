const ROLE_ALIASES: Record<string, string> = {
    owner: "tenant_owner",
    admin: "tenant_admin",
    billing: "tenant_admin",
    nurse: "nursing",
    front_desk: "reception",
    patient_relations: "patient_affairs",
    social_services: "patient_affairs",
    legal_officer: "legal_admin",
    member: "viewer",
};

const ASSIGNMENT_ROLES = new Set([
    "tenant_owner",
    "tenant_admin",
    "legal_admin",
    "doctor",
    "medical_director",
]);

const STEP_ACTION_ROLES = new Set([
    ...ASSIGNMENT_ROLES,
    "nursing",
    "patient_affairs",
    "quality",
    "compliance",
]);

const ESCALATION_ROLES = new Set([
    ...ASSIGNMENT_ROLES,
    "patient_affairs",
    "compliance",
]);

export function normalizeOperationsRole(role: string | null | undefined): string {
    const normalized = (role || "").trim().toLowerCase();
    return ROLE_ALIASES[normalized] || normalized;
}

export function hasOperationsAssignmentPermission(
    role: string | null | undefined,
    platformRole?: string | null,
): boolean {
    return Boolean(platformRole) || ASSIGNMENT_ROLES.has(normalizeOperationsRole(role));
}

export function hasOperationsStepPermission(
    role: string | null | undefined,
    platformRole?: string | null,
): boolean {
    return Boolean(platformRole) || STEP_ACTION_ROLES.has(normalizeOperationsRole(role));
}

export function hasOperationsEscalationPermission(
    role: string | null | undefined,
    platformRole?: string | null,
): boolean {
    return Boolean(platformRole) || ESCALATION_ROLES.has(normalizeOperationsRole(role));
}