export interface TenantRegistration {
  code: string;
  displayName: string;
  region: string | null;
  status: "active" | "inactive" | "preview";
  tenantId: string;
}

const tenantRegistry = new Map<string, TenantRegistration>();

export function registerTenant(input: TenantRegistration): TenantRegistration {
  tenantRegistry.set(input.tenantId, input);
  return input;
}

export function resolveTenantRegistration(tenantId: string): TenantRegistration | null {
  return tenantRegistry.get(tenantId) || null;
}

export function listRegisteredTenants(): TenantRegistration[] {
  return Array.from(tenantRegistry.values()).sort((left, right) => left.displayName.localeCompare(right.displayName));
}