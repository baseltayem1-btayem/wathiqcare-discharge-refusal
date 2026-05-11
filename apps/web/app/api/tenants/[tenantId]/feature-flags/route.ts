import { FeatureFlagScope } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { FEATURE_FLAGS, type FeatureFlag } from "@/lib/config/feature-flags";
import {
  hasPlatformAccess,
  requireAuth,
  requireTenantAccess,
  requireTenantPermission,
} from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getRequestContext } from "@/lib/server/request-context";
import { writeAuditLog } from "@/lib/server/saas-services";
import {
  listTenantFeatureFlagOverrides,
  resolveFeatureFlag,
  setGlobalFeatureFlag,
  setModuleFeatureFlag,
  setTenantFeatureFlag,
} from "@/lib/server/tenant-flag-service";
import { normalizeModuleKey } from "@/platform/subscribers/subscriber-module-access-service";

type RouteContext = {
  params: Promise<{ tenantId: string }>;
};

function normalizeScope(raw: string | null | undefined): FeatureFlagScope {
  const normalized = (raw || "").trim().toUpperCase();
  if (!normalized) {
    return FeatureFlagScope.TENANT;
  }

  if (!Object.values(FeatureFlagScope).includes(normalized as FeatureFlagScope)) {
    throw new ApiError(400, "scope must be GLOBAL, TENANT, or MODULE");
  }

  return normalized as FeatureFlagScope;
}

function normalizeFlagKey(raw: string | null | undefined): FeatureFlag {
  const normalized = (raw || "").trim().toUpperCase();
  if (!normalized || !(normalized in FEATURE_FLAGS)) {
    throw new ApiError(400, "Unsupported feature flag key");
  }
  return normalized as FeatureFlag;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { tenantId } = await params;

    if (!hasPlatformAccess(auth)) {
      await requireTenantPermission(request, tenantId, ["subscription.read", "roles.read"]);
    } else {
      await requireTenantAccess(request, tenantId);
    }

    const overrides = await listTenantFeatureFlagOverrides(tenantId);
    const resolutions = await Promise.all(
      (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).map((key) => resolveFeatureFlag(key, tenantId)),
    );

    return NextResponse.json({
      tenantId,
      defaults: FEATURE_FLAGS,
      overrides,
      resolved: resolutions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { tenantId } = await params;

    if (!hasPlatformAccess(auth)) {
      throw new ApiError(403, "Platform permissions are required to update feature flags");
    }

    await requireTenantAccess(request, tenantId);

    const payload = (await request.json().catch(() => null)) as {
      scope?: string;
      key?: string;
      value?: boolean;
      moduleKey?: string;
    } | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    if (typeof payload.value !== "boolean") {
      throw new ApiError(400, "value must be a boolean");
    }

    const key = normalizeFlagKey(payload.key);
    const scope = normalizeScope(payload.scope);
    const moduleKey = normalizeModuleKey(payload.moduleKey);
    const context = getRequestContext(request, auth, moduleKey ?? null);

    let updated;

    if (scope === FeatureFlagScope.GLOBAL) {
      updated = await setGlobalFeatureFlag(key, payload.value, auth.sub);
    } else if (scope === FeatureFlagScope.TENANT) {
      updated = await setTenantFeatureFlag(tenantId, key, payload.value, auth.sub);
    } else {
      if (!moduleKey) {
        throw new ApiError(400, "moduleKey is required for MODULE scope");
      }
      updated = await setModuleFeatureFlag(tenantId, moduleKey, key, payload.value, auth.sub);
    }

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "feature_flag_override",
      entityId: `${scope}:${key}:${moduleKey ?? "all"}`,
      action: "feature_flag_override_updated",
      details: `Feature flag ${key} set to ${payload.value} at scope ${scope}`,
      moduleKey: moduleKey ?? null,
      requestId: context.requestId,
      correlationId: context.correlationId,
      metadataJson: {
        scope,
        key,
        value: payload.value,
        moduleKey: moduleKey ?? null,
      },
      request,
    });

    const resolved = await resolveFeatureFlag(key, tenantId, moduleKey ?? null);

    return NextResponse.json({
      updated,
      resolved,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
