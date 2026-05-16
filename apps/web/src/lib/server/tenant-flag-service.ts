import { FeatureFlagScope, Prisma } from "@prisma/client";
import { FEATURE_FLAGS, type FeatureFlag } from "@/lib/config/feature-flags";
import { getPrisma } from "@/lib/server/prisma";
import type { ModuleKey } from "@/lib/modules/catalog";

const prisma = () => getPrisma();

export type TenantFlagRecord = {
  key: string;
  value: boolean;
  scope: FeatureFlagScope;
  tenantId?: string | null;
  moduleKey?: ModuleKey | null;
  updatedBy?: string | null;
  updatedAt: Date;
};

export type TenantFlagResolution = {
  key: FeatureFlag;
  envDefault: boolean;
  globalValue: boolean | null;
  tenantValue: boolean | null;
  moduleValue: boolean | null;
  resolvedValue: boolean;
};

type UpsertArgs = {
  scope: FeatureFlagScope;
  key: FeatureFlag;
  value: boolean;
  tenantId?: string | null;
  moduleKey?: ModuleKey | null;
  updatedBy?: string | null;
  metadata?: Prisma.InputJsonValue;
};

function normalizeFlagKey(key: string): FeatureFlag {
  const normalized = key.trim().toUpperCase();
  if (!(normalized in FEATURE_FLAGS)) {
    throw new Error(`Unsupported feature flag key: ${key}`);
  }
  return normalized as FeatureFlag;
}

function buildScopeRef(scope: FeatureFlagScope, tenantId?: string | null, moduleKey?: string | null): string {
  if (scope === FeatureFlagScope.GLOBAL) {
    return "global";
  }

  if (scope === FeatureFlagScope.TENANT) {
    if (!tenantId) {
      throw new Error("tenantId is required for tenant scoped overrides");
    }
    return tenantId;
  }

  if (!tenantId || !moduleKey) {
    throw new Error("tenantId and moduleKey are required for module scoped overrides");
  }

  return `${tenantId}:${moduleKey}`;
}

async function upsertFlag(args: UpsertArgs): Promise<TenantFlagRecord> {
  const scopeRef = buildScopeRef(args.scope, args.tenantId, args.moduleKey);

  const record = await prisma().featureFlagOverride.upsert({
    where: {
      scope_scopeRef_key: {
        scope: args.scope,
        scopeRef,
        key: args.key,
      },
    },
    update: {
      value: args.value,
      tenantId: args.tenantId ?? null,
      moduleKey: args.moduleKey ?? null,
      updatedBy: args.updatedBy ?? null,
      metadata: args.metadata ?? undefined,
    },
    create: {
      scope: args.scope,
      scopeRef,
      key: args.key,
      value: args.value,
      tenantId: args.tenantId ?? null,
      moduleKey: args.moduleKey ?? null,
      updatedBy: args.updatedBy ?? null,
      metadata: args.metadata ?? undefined,
    },
  });

  return {
    key: record.key,
    value: record.value,
    scope: record.scope,
    tenantId: record.tenantId,
    moduleKey: (record.moduleKey as ModuleKey | null) ?? null,
    updatedBy: record.updatedBy,
    updatedAt: record.updatedAt,
  };
}

export async function setGlobalFeatureFlag(key: FeatureFlag | string, value: boolean, updatedBy?: string | null): Promise<TenantFlagRecord> {
  return upsertFlag({
    scope: FeatureFlagScope.GLOBAL,
    key: normalizeFlagKey(key),
    value,
    updatedBy,
  });
}

export async function setTenantFeatureFlag(tenantId: string, key: FeatureFlag | string, value: boolean, updatedBy?: string | null): Promise<TenantFlagRecord> {
  return upsertFlag({
    scope: FeatureFlagScope.TENANT,
    key: normalizeFlagKey(key),
    value,
    tenantId,
    updatedBy,
  });
}

export async function setModuleFeatureFlag(tenantId: string, moduleKey: ModuleKey, key: FeatureFlag | string, value: boolean, updatedBy?: string | null): Promise<TenantFlagRecord> {
  return upsertFlag({
    scope: FeatureFlagScope.MODULE,
    key: normalizeFlagKey(key),
    value,
    tenantId,
    moduleKey,
    updatedBy,
  });
}

async function readOverride(scope: FeatureFlagScope, key: FeatureFlag, tenantId?: string | null, moduleKey?: ModuleKey | null): Promise<boolean | null> {
  const scopeRef = buildScopeRef(scope, tenantId, moduleKey);
  const record = await prisma().featureFlagOverride.findUnique({
    where: {
      scope_scopeRef_key: {
        scope,
        scopeRef,
        key,
      },
    },
    select: { value: true },
  });

  return record?.value ?? null;
}

export async function resolveFeatureFlag(key: FeatureFlag | string, tenantId?: string | null, moduleKey?: ModuleKey | null): Promise<TenantFlagResolution> {
  const normalizedKey = normalizeFlagKey(key);
  const envDefault = FEATURE_FLAGS[normalizedKey];
  const globalValue = await readOverride(FeatureFlagScope.GLOBAL, normalizedKey);
  const tenantValue = tenantId ? await readOverride(FeatureFlagScope.TENANT, normalizedKey, tenantId) : null;
  const moduleValue = tenantId && moduleKey
    ? await readOverride(FeatureFlagScope.MODULE, normalizedKey, tenantId, moduleKey)
    : null;

  const resolvedValue = moduleValue ?? tenantValue ?? globalValue ?? envDefault;

  return {
    key: normalizedKey,
    envDefault,
    globalValue,
    tenantValue,
    moduleValue,
    resolvedValue,
  };
}

export async function listTenantFeatureFlagOverrides(tenantId: string): Promise<TenantFlagRecord[]> {
  const rows = await prisma().featureFlagOverride.findMany({
    where: {
      OR: [
        { scope: FeatureFlagScope.GLOBAL },
        { scope: FeatureFlagScope.TENANT, tenantId },
        { scope: FeatureFlagScope.MODULE, tenantId },
      ],
    },
    orderBy: [{ scope: "asc" }, { key: "asc" }, { moduleKey: "asc" }],
  });

  return rows.map((row) => ({
    key: row.key,
    value: row.value,
    scope: row.scope,
    tenantId: row.tenantId,
    moduleKey: (row.moduleKey as ModuleKey | null) ?? null,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt,
  }));
}
