import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";

const VALID_ARCHIVE_STATUSES = new Set(["PENDING", "INDEXED", "ARCHIVED", "VERIFIED", "FAILED"]);

const governanceDb = prisma as unknown as {
  archiveRecord: {
    findMany: (args: {
      where: Record<string, unknown>;
      orderBy: { createdAt: "desc" };
      take: number;
    }) => Promise<Array<Record<string, unknown>>>;
  };
};

export async function GET(request: NextRequest) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const url = new URL(request.url);

    const patientId = url.searchParams.get("patientId");
    const caseId = url.searchParams.get("caseId");
    const formType = url.searchParams.get("formType");
    const legalOnly = url.searchParams.get("legal") === "true";
    const statusParam = (url.searchParams.get("status") ?? "").toUpperCase();

    const status = VALID_ARCHIVE_STATUSES.has(statusParam) ? statusParam : undefined;

    const rows = await governanceDb.archiveRecord.findMany({
      where: {
        tenantId: auth.tenant_id,
        ...(patientId ? { patientId } : {}),
        ...(caseId ? { caseId } : {}),
        ...(formType ? { documentCategory: formType } : {}),
        ...(legalOnly ? { legalDocumentFlag: true } : {}),
        ...(status ? { archiveStatus: status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return NextResponse.json(toJsonSafe(rows));
  } catch (error) {
    return handleApiError(error);
  }
}
