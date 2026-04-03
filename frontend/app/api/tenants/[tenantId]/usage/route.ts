import { UsageMetric } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireTenantAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";

type RouteContext = {
  params: Promise<{ tenantId: string }>;
};

function parseUsageMetric(value: string | null): UsageMetric | null {
  if (!value) return null;

  const normalized = value.toUpperCase();

  return Object.values(UsageMetric).includes(normalized as UsageMetric)
    ? (normalized as UsageMetric)
    : null;
}

function parsePositiveInt(
  value: string | null,
  fallback: number,
  min: number,
  max?: number,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const normalized = Math.floor(parsed);

  if (normalized < min) {
    return min;
  }

  if (typeof max === "number" && normalized > max) {
    return max;
  }

  return normalized;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await params;

    await requireTenantAccess(request, tenantId);

    const url = new URL(request.url);
    const metric = parseUsageMetric(url.searchParams.get("metric"));
    const days = parsePositiveInt(url.searchParams.get("days"), 30, 1);
    const limit = parsePositiveInt(url.searchParams.get("limit"), 100, 1, 500);

    const fromDate = new Date();
    fromDate.setUTCDate(fromDate.getUTCDate() - days);

    const prisma = getPrisma();

    const records = await prisma.usageRecord.findMany({
      where: {
        tenantId,
        ...(metric ? { metric } : {}),
        periodDate: {
          gte: fromDate,
        },
      },
      orderBy: [{ periodDate: "desc" }, { recordedAt: "desc" }],
      take: limit,
    });

    return NextResponse.json(toJsonSafe(records));
  } catch (error) {
    return handleApiError(error);
  }
}