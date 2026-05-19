import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { requireAuth } from "@/lib/server/auth";
import { requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

type CaseVolumeRow = {
  id: string;
  createdAt: Date;
  closedAt: Date | null;
  status: string | null;
};

/**
 * GET /api/analytics/case-volume
 * Get case volume time-series data
 */
export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);

    const branchId = request.nextUrl.searchParams.get("branchId");
    const days = parseInt(request.nextUrl.searchParams.get("days") || "30");

    // Get date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause
    const caseWhere = {
      tenantId,
      createdAt: { gte: startDate },
    };

    // branchId filter not yet supported at DB level (Case model has no branchId column);
    // the query returns all cases for the tenant; branch filtering can be added when the
    // schema is extended with a branchId field.
    void branchId;

    // Get all cases in date range
    const cases: CaseVolumeRow[] = await prisma.case.findMany({
      where: caseWhere,
      select: {
        id: true,
        createdAt: true,
        closedAt: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Aggregate by date
    const volumeByDate: Record<string, { created: number; closed: number }> = {};

    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      volumeByDate[dateStr] = { created: 0, closed: 0 };
    }

    // Count cases by date
    for (const caseItem of cases) {
      const dateStr = caseItem.createdAt.toISOString().split("T")[0];
      if (volumeByDate[dateStr]) {
        volumeByDate[dateStr].created += 1;
      }

      if (caseItem.closedAt) {
        const closedDateStr = caseItem.closedAt.toISOString().split("T")[0];
        if (volumeByDate[closedDateStr]) {
          volumeByDate[closedDateStr].closed += 1;
        }
      }
    }

    // Format for charts
    const data = Object.entries(volumeByDate)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, volume]) => ({
        date,
        created: volume.created,
        closed: volume.closed,
      }));

    let totalClosed = 0;
    for (const caseItem of cases) {
      if (caseItem.status === "CLOSED") {
        totalClosed += 1;
      }
    }

    return NextResponse.json({
      days,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      data,
      summary: {
        totalCreated: cases.length,
        totalClosed,
        avgPerDay: Math.round(cases.length / days),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
