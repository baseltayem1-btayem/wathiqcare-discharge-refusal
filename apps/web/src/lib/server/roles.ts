import { MembershipRole } from "@prisma/client";

export const PLATFORM_ROLES = ["platform_superadmin", "platform_admin"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const TENANT_ADMIN_ROLES = ["tenant_owner", "tenant_admin"] as const;
export const OPERATIONAL_ROLES = [
    "doctor",
    "nursing",
    "reception",
    "patient_affairs",
    "quality",
    "compliance",
    "legal_admin",
    "viewer",
] as const;

export const CASE_CREATOR_ROLES = [
    "platform_superadmin",
    "platform_admin",
    "tenant_owner",
    "tenant_admin",
    "legal_admin",
    "doctor",
    "nursing",
    "patient_affairs",
] as const;

export type CanonicalUserRole =
    | PlatformRole
    | (typeof TENANT_ADMIN_ROLES)[number]
    | (typeof OPERATIONAL_ROLES)[number];

const USER_ROLE_ALIASES: Record<string, CanonicalUserRole> = {
    platform_superadmin: "platform_superadmin",
    platform_admin: "platform_admin",
    tenant_owner: "tenant_owner",
    owner: "tenant_owner",
    tenant_admin: "tenant_admin",
    admin: "tenant_admin",
    billing: "tenant_admin",
    doctor: "doctor",
    nursing: "nursing",
    nurse: "nursing",
    reception: "reception",
    front_desk: "reception",
    patient_affairs: "patient_affairs",
    patient_relations: "patient_affairs",
    social_services: "patient_affairs",
    quality: "quality",
    compliance: "compliance",
    legal_admin: "legal_admin",
    legal_officer: "legal_admin",
    viewer: "viewer",
    member: "viewer",
};

export function canonicalizeUserRole(input: string | null | undefined): CanonicalUserRole {
    const normalized = (input ?? "").trim().toLowerCase();
    return USER_ROLE_ALIASES[normalized] ?? "viewer";
}

export function isPlatformRole(input: string | null | undefined): boolean {
    const role = canonicalizeUserRole(input);
    return role === "platform_superadmin" || role === "platform_admin";
}

export function userRoleAllows(
    input: string | null | undefined,
    allowedRoles: readonly string[],
): boolean {
    const role = canonicalizeUserRole(input);
    const normalizedAllowedRoles = new Set(allowedRoles.map((item) => canonicalizeUserRole(item)));

    if (role === "platform_superadmin" || role === "platform_admin") {
        return true;
    }

    return normalizedAllowedRoles.has(role);
}

export function membershipRoleForUserRole(role: CanonicalUserRole): MembershipRole {
    switch (role) {
        case "tenant_owner":
            return MembershipRole.OWNER;
        case "tenant_admin":
        case "legal_admin":
            return MembershipRole.ADMIN;
        case "doctor":
            return MembershipRole.MANAGER;
        case "patient_affairs":
        case "quality":
        case "compliance":
        case "viewer":
            return MembershipRole.VIEWER;
        case "nursing":
        case "reception":
            return MembershipRole.MEMBER;
        case "platform_superadmin":
        case "platform_admin":
            return MembershipRole.ADMIN;
        default:
            return MembershipRole.MEMBER;
    }
}

export function platformRoleForUserRole(role: string | null | undefined): PlatformRole | null {
    const normalized = canonicalizeUserRole(role);
    if (normalized === "platform_superadmin" || normalized === "platform_admin") {
        return normalized;
    }
    return null;
}
