import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { isPlatformRole, platformRoleForUserRole } from "@/lib/server/roles";
import { canAccessModule, type ModuleKey } from "@/lib/modules/catalog";
import { writeAuditLog } from "@/lib/server/saas-services";
import { getSessionCookieName } from "@/lib/server/sessionCookie";
import { verifyAndDecodeJwt } from "@/lib/server/jwt";
import { getUserResetState } from "@/lib/server/auth-reset";

export type AuthContext = {
  sub: string;
  email?: string;
  role?: string;
  user_type?: "platform_admin" | "tenant_admin" | "tenant_user";
  tenant_id?: string;
  tenant_code?: string;
  platform_role?: "platform_superadmin" | "platform_admin" | null;
  iat?: number;
  exp?: number;
};

export type TenantPermissionContext = {
  auth: AuthContext;
  permissionKeys: Set<string>;
};

const TENANT_ADMIN_FALLBACK_PERMISSIONS = new Set([
  "users.read",
  "users.create",
  "users.activate",
  "users.deactivate",
  "roles.assign",
  "subscription.read",
  "usage.read",
  "departments.read",
]);

function fallbackPermissionKeysForRole(role: string | undefined): Set<string> {
  const normalized = (role || "").trim().toLowerCase();
  if (normalized === "tenant_admin" || normalized === "tenant_owner") {
    return new Set(TENANT_ADMIN_FALLBACK_PERMISSIONS);
  }
  return new Set<string>();
}

const ROLE_ALIASES: Record<string, string> = {
  tenant_owner: "OWNER",
  owner: "OWNER",
  tenant_admin: "ADMIN",
  legal_admin: "ADMIN",
  legal: "ADMIN",
  admin: "ADMIN",
  doctor: "MANAGER",
  nursing: "MEMBER",
  nurse: "MEMBER",
  reception: "MEMBER",
  finance: "ADMIN",
  patient_affairs: "VIEWER",
  social_services: "VIEWER",
  quality: "VIEWER",
  quality_manager: "VIEWER",
  compliance: "VIEWER",
  risk_manager: "VIEWER",
  risk_officer: "VIEWER",
  external_reviewer: "VIEWER",
  read_only_auditor: "VIEWER",
  auditor: "VIEWER",
  read_only_manager: "VIEWER",
  legal_officer: "ADMIN",
  legal_affairs: "ADMIN",
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

function isTruthyEnvFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

const prisma = getPrisma();

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

  const resetState = await getUserResetState(prisma, user.id);
  if (resetState.passwordResetRequired) {
    throw new ApiError(403, "Password reset required");
  }

  if (resetState.sessionRevokedAt) {
    const tokenIssuedAt = typeof parsedPayload.iat === "number" ? parsedPayload.iat : null;
    const revokedAtEpoch = Math.floor(resetState.sessionRevokedAt.getTime() / 1000);

    if (!tokenIssuedAt || tokenIssuedAt <= revokedAtEpoch) {
      throw new ApiError(401, "Session expired");
    }
  }

  if (parsedPayload.tenant_id && user.tenantId !== parsedPayload.tenant_id) {
    throw new ApiError(401, "Tenant claims are no longer valid");
  }

  const platformRole =
    user.userType === "PLATFORM_ADMIN"
      ? platformRoleForUserRole(user.role) ?? "platform_admin"
      : platformRoleForUserRole(user.role);
  const tenantActive = user.primaryTenant?.isActive === true;
  const membershipActive = user.memberships.some((item) => item.tenantId === user.tenantId);
  const roleAssigned = Boolean((user.role || "").trim());
  const tenantAdminInactiveBypassEnabled = isTruthyEnvFlag(
    process.env.TEMP_TENANT_ADMIN_INACTIVE_BYPASS,
    false,
  );
  const bypassTenantInactiveForAdmin =
    tenantAdminInactiveBypassEnabled &&
    !platformRole &&
    user.userType === "TENANT_ADMIN" &&
    !tenantActive;

  if (!platformRole && !tenantActive) {
    if (bypassTenantInactiveForAdmin) {
      console.warn("AUTH_STATE_BYPASS", {
        reason: "tenant_inactive",
        userId: user.id,
        tenantId: user.tenantId,
        userType: user.userType,
        tenantActive,
        membershipActive,
        role: user.role,
        roleAssigned,
      });
    } else {
      console.warn("AUTH_STATE_FAILURE", {
        reason: "tenant_inactive",
        userId: user.id,
        tenantId: user.tenantId,
        tenantActive,
        membershipActive,
        role: user.role,
        roleAssigned,
      });
      throw new ApiError(403, "Tenant is inactive");
    }
  }

  if (!platformRole) {
    if (!membershipActive) {
      console.warn("AUTH_STATE_FAILURE", {
        reason: "membership_inactive",
        userId: user.id,
        tenantId: user.tenantId,
        tenantActive,
        membershipActive,
        role: user.role,
        roleAssigned,
      });
      throw new ApiError(403, "Tenant membership is inactive");
    }
  }

  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    user_type:
      user.userType === "PLATFORM_ADMIN"
        ? "platform_admin"
        : user.userType === "TENANT_ADMIN"
          ? "tenant_admin"
          : "tenant_user",
    tenant_id: user.tenantId,
    tenant_code: user.primaryTenant?.code,
    platform_role: platformRole,
    exp: parsedPayload.exp,
  };
}

export function hasPlatformAccess(auth: AuthContext): boolean {
  if (auth.user_type === "platform_admin") {
    return true;
  }
  if (auth.platform_role) {
    return true;
  }
  return isPlatformRole(auth.role);
}

type PlatformApiAccessResult = "allowed" | "denied";

async function writePlatformApiAccessAttempt(args: {
  request: NextRequest;
  result: PlatformApiAccessResult;
  reason?: string;
  auth?: AuthContext;
}): Promise<void> {
  const ipAddress = args.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = args.request.headers.get("user-agent") ?? null;
  const endpoint = args.request.nextUrl.pathname;
  const method = args.request.method;
  const timestamp = new Date().toISOString();
  const role = args.auth?.platform_role ?? args.auth?.role ?? null;

  try {
  await prisma.$executeRaw`
      INSERT INTO platform_api_access_logs (
        user_id,
        email,
        role,
        endpoint,
        method,
        result,
        reason,
        ip_address,
        user_agent,
        created_at
      ) VALUES (
        ${args.auth?.sub ?? null},
        ${args.auth?.email ?? null},
        ${role},
        ${endpoint},
        ${method},
        ${args.result},
        ${args.reason ?? null},
        ${ipAddress},
        ${userAgent},
        ${timestamp}::timestamptz
      )
    `;
  } catch (accessLogError) {
    console.error("platform access attempt log write failed (non-fatal)", accessLogError);
  }

  if (!args.auth?.tenant_id || !args.auth?.sub) {
    return;
  }

  try {
    await writeAuditLog({
      tenantId: args.auth.tenant_id,
      userId: args.auth.sub,
      entityType: "PLATFORM_API",
      entityId: endpoint,
      action: "PLATFORM_ENDPOINT_ACCESS",
      details: `${method} ${endpoint} ${args.result.toUpperCase()}`,
      metadataJson: {
        method,
        path: endpoint,
        result: args.result,
        reason: args.reason ?? null,
        timestamp,
        email: args.auth.email ?? null,
        role,
      },
      request: args.request,
    });
  } catch (auditError) {
    console.error("platform access audit log write failed (non-fatal)", auditError);
  }
}

export async function requirePlatformAccess(request: NextRequest): Promise<AuthContext> {
  let auth: AuthContext;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    await writePlatformApiAccessAttempt({
      request,
      result: "denied",
      reason: error instanceof ApiError ? error.message : "Authentication failed",
    });
    throw error;
  }

  if (!hasPlatformAccess(auth)) {
    await writePlatformApiAccessAttempt({
      request,
      auth,
      result: "denied",
      reason: "Platform admin permissions required",
    });
    throw new ApiError(403, "Platform admin permissions required");
  }

  await writePlatformApiAccessAttempt({
    request,
    auth,
    result: "allowed",
  });

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

export function requireTenantOperationalAccess(auth: AuthContext): void {
  if (auth.user_type === "platform_admin") {
    throw new ApiError(403, "Platform admins cannot operate tenant clinical workflows");
  }
}

export async function requireModuleOperationalAccess(
  request: NextRequest,
  moduleKey: ModuleKey,
): Promise<AuthContext> {
  const auth = await requireAuth(request);

  if (!auth.platform_role) {
    requireTenantOperationalAccess(auth);
  }

  if (!canAccessModule(moduleKey, { role: auth.role, platformRole: auth.platform_role })) {
    throw new ApiError(403, "Module access denied");
  }

  return auth;
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
  options: { allowPlatform?: boolean } = {},
): Promise<TenantPermissionContext> {
  const allowPlatform = options.allowPlatform !== false;
  if (hasPlatformAccess(auth) && allowPlatform) {
    return {
      auth,
      permissionKeys: new Set(["*"]),
    };
  }

  if (hasPlatformAccess(auth) && !allowPlatform) {
    throw new ApiError(403, "Platform admins cannot perform tenant operational actions");
  }

  if (auth.tenant_id !== tenantId) {
    throw new ApiError(403, "Tenant access denied");
  }

  const required = Array.isArray(requiredPermissions)
    ? requiredPermissions.filter(Boolean)
    : [requiredPermissions].filter(Boolean);

  const permissionKeys = await getUserTenantPermissionKeys(auth.sub, tenantId);
  if (permissionKeys.size === 0) {
    const fallbackKeys = fallbackPermissionKeysForRole(auth.role);
    if (fallbackKeys.size === 0) {
      throw new ApiError(403, "No permissions assigned to this user");
    }
    if (required.length > 0 && !required.some((permission) => fallbackKeys.has(permission))) {
      throw new ApiError(403, "Insufficient permissions");
    }
    return {
      auth,
      permissionKeys: fallbackKeys,
    };
  }

  if (required.length > 0 && !required.some((permission) => permissionKeys.has(permission))) {
    throw new ApiError(403, "Insufficient permissions");
  }

  return {
    auth,
    permissionKeys,
  };
}
