import { getPrisma } from "@/lib/server/prisma";
import { extractDomain, normalizeEmail } from "@/lib/server/auth-domain-policy";

export type TenantAuthConfig = {
  password_enabled: boolean;
  microsoft_sso_enabled: boolean;
  secure_link_enabled: boolean;
};

export const DEFAULT_TENANT_AUTH_CONFIG: TenantAuthConfig = {
  password_enabled: true,
  microsoft_sso_enabled: false,
  secure_link_enabled: false,
};

export function normalizeTenantAuthConfig(raw: unknown): TenantAuthConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_TENANT_AUTH_CONFIG };
  }

  const source = raw as Record<string, unknown>;

  return {
    password_enabled:
      typeof source.password_enabled === "boolean"
        ? source.password_enabled
        : DEFAULT_TENANT_AUTH_CONFIG.password_enabled,
    microsoft_sso_enabled:
      typeof source.microsoft_sso_enabled === "boolean"
        ? source.microsoft_sso_enabled
        : DEFAULT_TENANT_AUTH_CONFIG.microsoft_sso_enabled,
    secure_link_enabled:
      typeof source.secure_link_enabled === "boolean"
        ? source.secure_link_enabled
        : DEFAULT_TENANT_AUTH_CONFIG.secure_link_enabled,
  };
}

export function mergeTenantAuthConfig(
  current: unknown,
  updates: Partial<TenantAuthConfig>,
): TenantAuthConfig {
  const normalizedCurrent = normalizeTenantAuthConfig(current);

  return {
    password_enabled:
      typeof updates.password_enabled === "boolean"
        ? updates.password_enabled
        : normalizedCurrent.password_enabled,
    microsoft_sso_enabled:
      typeof updates.microsoft_sso_enabled === "boolean"
        ? updates.microsoft_sso_enabled
        : normalizedCurrent.microsoft_sso_enabled,
    secure_link_enabled:
      typeof updates.secure_link_enabled === "boolean"
        ? updates.secure_link_enabled
        : normalizedCurrent.secure_link_enabled,
  };
}

export async function resolveTenantAuthConfigByEmail(email: string): Promise<{
  tenantId: string | null;
  authConfig: TenantAuthConfig;
}> {
  const prisma = getPrisma();
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return {
      tenantId: null,
      authConfig: { ...DEFAULT_TENANT_AUTH_CONFIG },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      tenantId: true,
      primaryTenant: {
        select: {
          id: true,
          authConfig: true,
        },
      },
    },
  });

  if (user?.primaryTenant) {
    return {
      tenantId: user.primaryTenant.id,
      authConfig: normalizeTenantAuthConfig(user.primaryTenant.authConfig),
    };
  }

  const domain = extractDomain(normalized);
  if (!domain) {
    return {
      tenantId: null,
      authConfig: { ...DEFAULT_TENANT_AUTH_CONFIG },
    };
  }

  const matchedTenant = await prisma.tenant.findFirst({
    where: {
      isActive: true,
      allowedDomains: {
        some: {
          isActive: true,
          domain,
        },
      },
    },
    select: {
      id: true,
      authConfig: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!matchedTenant) {
    return {
      tenantId: null,
      authConfig: { ...DEFAULT_TENANT_AUTH_CONFIG },
    };
  }

  return {
    tenantId: matchedTenant.id,
    authConfig: normalizeTenantAuthConfig(matchedTenant.authConfig),
  };
}

export async function readTenantAuthConfig(tenantId: string): Promise<TenantAuthConfig> {
  const tenant = await getPrisma().tenant.findUnique({
    where: { id: tenantId },
    select: { authConfig: true },
  });

  return normalizeTenantAuthConfig(tenant?.authConfig);
}
