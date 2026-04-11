// Shared types and pure utilities for the tenant management module.

export type TenantSubscription = {
  id: string;
  status: string;
  seatLimit?: number;
  plan?: { code: string; name: string };
};

export type TenantListItem = {
  id: string;
  code: string;
  name: string;
  domain?: string | null;
  /** Azure AD / SSO configuration stored as freeform JSON. */
  metadata?: Record<string, unknown> | null;
  authConfig?: {
    password_enabled?: boolean;
    microsoft_sso_enabled?: boolean;
    secure_link_enabled?: boolean;
  } | null;
  isActive: boolean;
  country?: string | null;
  billingEmail?: string | null;
  subscriptions?: TenantSubscription[];
  _count?: { memberships?: number; cases?: number };
};

export type TenantAuthConfig = {
  password_enabled: boolean;
  microsoft_sso_enabled: boolean;
  secure_link_enabled: boolean;
};

export const DEFAULT_AUTH_CONFIG: TenantAuthConfig = {
  password_enabled: true,
  microsoft_sso_enabled: false,
  secure_link_enabled: false,
};

export function normalizeAuthConfig(
  input: TenantListItem["authConfig"],
): TenantAuthConfig {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_AUTH_CONFIG };
  }
  return {
    password_enabled:
      typeof input.password_enabled === "boolean"
        ? input.password_enabled
        : DEFAULT_AUTH_CONFIG.password_enabled,
    microsoft_sso_enabled:
      typeof input.microsoft_sso_enabled === "boolean"
        ? input.microsoft_sso_enabled
        : DEFAULT_AUTH_CONFIG.microsoft_sso_enabled,
    secure_link_enabled:
      typeof input.secure_link_enabled === "boolean"
        ? input.secure_link_enabled
        : DEFAULT_AUTH_CONFIG.secure_link_enabled,
  };
}

export function getEnabledAuthMethods(config: TenantAuthConfig): string[] {
  const methods: string[] = [];
  if (config.password_enabled) methods.push("Password Login");
  if (config.microsoft_sso_enabled) methods.push("Microsoft SSO");
  if (config.secure_link_enabled) methods.push("Secure Link");
  return methods;
}
