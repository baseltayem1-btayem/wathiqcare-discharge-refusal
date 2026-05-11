import { NextRequest, NextResponse } from "next/server";
import {
  hasPlatformAccess,
  requireAuth,
  requireTenantAccess,
  requireTenantPermission,
} from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import {
  getSubscriberModuleAccessDashboard,
  MODULE_KEYS,
  listSubscriberModuleAccess,
  normalizeModuleKey,
  suspendAllSubscriberModules,
  toModuleAccessStatus,
  toNullableDate,
  upsertSubscriberModuleAccess,
} from "@/platform/subscribers/subscriber-module-access-service";
import { writeAuditLog } from "@/lib/server/saas-services";
import { getRequestContext } from "@/lib/server/request-context";

type RouteContext = {
  params: Promise<{ tenantId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { tenantId } = await params;

    if (!hasPlatformAccess(auth)) {
      await requireTenantPermission(request, tenantId, ["subscription.read", "roles.read"]);
    } else {
      await requireTenantAccess(request, tenantId);
    }

    const moduleKey = normalizeModuleKey(new URL(request.url).searchParams.get("moduleKey"));
    const includeInsights = new URL(request.url).searchParams.get("includeInsights") !== "false";
    const lookbackDays = Number(new URL(request.url).searchParams.get("lookbackDays") ?? "30");
    const expiryWarningDays = Number(new URL(request.url).searchParams.get("expiryWarningDays") ?? "14");

    if (includeInsights) {
      const dashboard = await getSubscriberModuleAccessDashboard(tenantId, {
        lookbackDays,
        expiryWarningDays,
      });

      const modules = moduleKey
        ? dashboard.modules.filter((item: { moduleKey: string }) => item.moduleKey === moduleKey)
        : dashboard.modules;

      return NextResponse.json({
        subscriberId: tenantId,
        moduleKeys: MODULE_KEYS,
        access: modules,
        dashboard: {
          generatedAt: dashboard.generatedAt,
          lookbackDays: dashboard.lookbackDays,
          expiryWarningDays: dashboard.expiryWarningDays,
          activeUsersCount: dashboard.activeUsersCount,
          recentAccessAuditEvents: dashboard.recentAccessAuditEvents,
        },
      });
    }

    const rows = await listSubscriberModuleAccess(tenantId);
    const filtered = moduleKey
      ? rows.filter((item: { moduleKey: string }) => item.moduleKey === moduleKey)
      : rows;

    return NextResponse.json({
      subscriberId: tenantId,
      moduleKeys: MODULE_KEYS,
      access: filtered,
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
      throw new ApiError(403, "Subscriber admin permissions required");
    }

    await requireTenantAccess(request, tenantId);

    const payload = (await request.json().catch(() => null)) as {
      action?: string;
      moduleKey?: string;
      status?: string;
      subscriptionPlan?: string;
      expiryDate?: string;
      notes?: string;
      reason?: string;
    } | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const context = getRequestContext(request, auth, null);

    if ((payload.action || "").trim().toUpperCase() === "EMERGENCY_SUSPEND_ALL") {
      const result = await suspendAllSubscriberModules(tenantId, auth.sub, payload.reason ?? payload.notes ?? null);

      await writeAuditLog({
        tenantId,
        userId: auth.sub,
        entityType: "subscriber_module_access",
        entityId: tenantId,
        action: "subscriber_module_access_emergency_suspend_all",
        details: `Emergency suspension applied to ${result.suspendedCount} modules`,
        moduleKey: null,
        requestId: context.requestId,
        correlationId: context.correlationId,
        metadataJson: {
          action: "EMERGENCY_SUSPEND_ALL",
          suspendedCount: result.suspendedCount,
          reason: payload.reason ?? payload.notes ?? null,
        },
        request,
      });

      return NextResponse.json(result);
    }

    const moduleKey = normalizeModuleKey(payload.moduleKey);
    if (!moduleKey) {
      throw new ApiError(400, "moduleKey is required and must match a supported module");
    }

    const status = toModuleAccessStatus(payload.status);
    if (!status) {
      throw new ApiError(400, "status is required and must be ACTIVE, INACTIVE, SUSPENDED, or TRIAL");
    }

    const updated = await upsertSubscriberModuleAccess({
      subscriberId: tenantId,
      moduleKey,
      status,
      activatedBy: auth.sub,
      deactivatedBy: auth.sub,
      subscriptionPlan: payload.subscriptionPlan?.trim() || null,
      expiryDate: toNullableDate(payload.expiryDate),
      notes: payload.notes?.trim() || null,
    });

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "subscriber_module_access",
      entityId: updated.id,
      action: "subscriber_module_access_updated",
      details: `Module ${moduleKey} set to ${status}`,
      moduleKey,
      requestId: context.requestId,
      correlationId: context.correlationId,
      metadataJson: {
        moduleKey,
        status,
        subscriptionPlan: updated.subscriptionPlan,
        expiryDate: updated.expiryDate,
      },
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
