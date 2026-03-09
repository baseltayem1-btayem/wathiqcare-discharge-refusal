import { ApiError } from "@/lib/server/http";
import { getTenantSubscription } from "@/lib/server/saas-services";
import type { SubscriptionGuard } from "@/lib/server/platform/types";

function featureNumber(features: unknown, key: string, fallback: number): number {
  if (!features || typeof features !== "object") {
    return fallback;
  }

  const value = (features as Record<string, unknown>)[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}

export async function requireActiveSubscriptionContext(tenantId: string): Promise<SubscriptionGuard> {
  const subscription = await getTenantSubscription(tenantId);

  if (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING" && subscription.status !== "PAST_DUE") {
    throw new ApiError(402, `Inactive subscription status: ${subscription.status}`);
  }

  const userLimit = featureNumber(subscription.plan.features, "userLimit", subscription.seatLimit);
  const caseLimit = featureNumber(subscription.plan.features, "caseLimit", 500);
  const signatureQuota = featureNumber(subscription.plan.features, "signatureQuota", 1000);

  return {
    tenantId,
    plan: subscription.plan.code,
    status: subscription.status,
    user_limit: userLimit,
    case_limit: caseLimit,
    signature_quota: signatureQuota,
  };
}
