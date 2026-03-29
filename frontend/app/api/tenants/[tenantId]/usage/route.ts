import { UsageMetric } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireTenantAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { getPrisma } from "@/lib/server/prisma";

function parseUsageMetric(value: string | null): UsageMetric | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return Object.values(UsageMetric).includes(normalized as UsageMetric)
    ? (normalized as UsageMetric)
    : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    requireTenantAccess(request, tenantId);

    const url = new URL(request.url);
    const metric = parseUsageMetric(url.searchParams.get("metric"));
    const days = Number(url.searchParams.get("days") ?? "30");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "100"), 1), 500);

    const fromDate = new Date();
    fromDate.setUTCDate(fromDate.getUTCDate() - (Number.isFinite(days) ? Math.max(days, 1) : 30));

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
