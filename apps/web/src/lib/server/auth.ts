import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { isPlatformRole, platformRoleForUserRole } from "@/lib/server/roles";
import { getSessionCookieName } from "@/lib/server/sessionCookie";
import { verifyAndDecodeJwt } from "@/lib/server/jwt";

export type AuthContext = {
  sub: string;
  email?: string;
  role?: string;
  tenant_id?: string;
  tenant_code?: string;
  platform_role?: "platform_superadmin" | "platform_admin" | null;
  exp?: number;
};

export type TenantPermissionContext = {
  auth: AuthContext;
  permissionKeys: Set<string>;
};

const ROLE_ALIASES: Record<string, string> = {
  tenant_owner: "OWNER",
  owner: "OWNER",
  tenant_admin: "ADMIN",
  legal_admin: "ADMIN",
  admin: "ADMIN",
  doctor: "MANAGER",
  nursing: "MEMBER",
  nurse: "MEMBER",
  reception: "MEMBER",
  patient_affairs: "VIEWER",
  quality: "VIEWER",
  compliance: "VIEWER",
  legal_officer: "ADMIN",
  viewer: "VIEWER",
};

function normalizeRole(role: string): string {
  const cleaned = role.trim();
  if (!cleaned) {
    return "";
  }

  const alias = ROLE_ALIASES[cleaned.toLowerCase()];
  if (alias) {
    return alias;
  }

  return cleaned.toUpperCase();
}

function readToken(request: NextRequest): string | null {
  return request.cookies.get(getSessionCookieName())?.value ?? null;
}

export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const token = readToken(request);
  if (!token) {
    throw new ApiError(401, "Missing access token");
  }

  let parsedPayload: AuthContext;
  try {
    parsedPayload = verifyAndDecodeJwt(token) as AuthContext;
  } catch (error) {
    if (error instanceof Error) {
      throw new ApiError(401, error.message);
    }
    throw new ApiError(401, "Invalid access token");
  }

  const user = await prisma.user.findUnique({
    where: { id: parsedPayload.sub },
    include: {
      primaryTenant: {
        select: {
          id: true,
          code: true,
          isActive: true,
        },
      },
      memberships: {
        where: { status: "ACTIVE" },
        select: {
          tenantId: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(401, "Authenticated user no longer exists");
  }

  if (!user.isActive) {
    throw new ApiError(401, "Authenticated user is inactive");
  }

  if (parsedPayload.tenant_id && user.tenantId !== parsedPayload.tenant_id) {
    throw new ApiError(401, "Tenant claims are no longer valid");
  }

  const platformRole = platformRoleForUserRole(user.role);
  if (!platformRole && !user.primaryTenant?.isActive) {
    throw new ApiError(403, "Tenant is inactive");
  }

  if (!platformRole) {
    const accessibleTenantIds = new Set([user.tenantId, ...user.memberships.map((item) => item.tenantId)]);
    if (!accessibleTenantIds.has(user.tenantId)) {
      throw new ApiError(403, "Tenant membership is inactive");
    }
  }

  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    tenant_id: user.tenantId,
    tenant_code: user.primaryTenant?.code,
    platform_role: platformRole,
    exp: parsedPayload.exp,
  };
}

export function hasPlatformAccess(auth: AuthContext): boolean {
  if (auth.platform_role) {
    return true;
  }
  return isPlatformRole(auth.role);
}

export async function requirePlatformAccess(request: NextRequest): Promise<AuthContext> {
  const auth = await requireAuth(request);
  if (!hasPlatformAccess(auth)) {
    throw new ApiError(403, "Platform admin permissions required");
  }
  return auth;
}

export async function requireTenantAccess(request: NextRequest, tenantId: string): Promise<AuthContext> {
  const auth = await requireAuth(request);

  if (hasPlatformAccess(auth)) {
    return auth;
  }

  if (auth.tenant_id !== tenantId) {
    throw new ApiError(403, "Tenant access denied");
  }

  return auth;
}

export function requireTenantId(auth: AuthContext): string {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required for this action");
  }
  return auth.tenant_id;
}

export function requireRole(auth: AuthContext, allowedRoles: string[]): void {
  const role = normalizeRole(auth.role ?? "");
  const normalizedAllowedRoles = allowedRoles.map((item) => normalizeRole(item));

  if (!normalizedAllowedRoles.includes(role)) {
    throw new ApiError(403, "Insufficient role permissions");
  }
}

export async function getUserTenantPermissionKeys(userId: string, tenantId: string): Promise<Set<string>> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: {
      tenantId,
      userId,
      tenantRole: {
        status: "ACTIVE",
      },
    },
    select: {
      tenantRole: {
        select: {
          permissions: {
            where: {
              allowed: true,
              permission: {
                isActive: true,
              },
            },
            select: {
              permission: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const keys = new Set<string>();
  for (const assignment of assignments) {
    for (const mapping of assignment.tenantRole.permissions) {
      keys.add(mapping.permission.key);
    }
  }

  return keys;
}

export async function requireTenantPermission(
  request: NextRequest,
  tenantId: string,
  requiredPermissions: string | string[],
): Promise<TenantPermissionContext> {
  const auth = await requireTenantAccess(request, tenantId);
  return requireTenantPermissionForAuth(auth, tenantId, requiredPermissions);
}

export async function requireTenantPermissionForAuth(
  auth: AuthContext,
  tenantId: string,
  requiredPermissions: string | string[],
): Promise<TenantPermissionContext> {
  if (hasPlatformAccess(auth)) {
    return {
      auth,
      permissionKeys: new Set(["*"]),
    };
  }

  if (auth.tenant_id !== tenantId) {
    throw new ApiError(403, "Tenant access denied");
  }

  const required = Array.isArray(requiredPermissions)
    ? requiredPermissions.filter(Boolean)
    : [requiredPermissions].filter(Boolean);

  const permissionKeys = await getUserTenantPermissionKeys(auth.sub, tenantId);
  if (permissionKeys.size === 0) {
    throw new ApiError(403, "No permissions assigned to this user");
  }

  if (required.length > 0 && !required.some((permission) => permissionKeys.has(permission))) {
    throw new ApiError(403, "Insufficient permissions");
  }

  return {
    auth,
    permissionKeys,
  };
}
