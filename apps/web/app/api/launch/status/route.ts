import { CaseStatus, DocumentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";

function isAuthConfigured(): boolean {
=======
import { prisma } from "@/lib/server/prisma";


function isAuthConfigured(): boolean {
  // Access env only when called, not at top-level
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
  const secret = process.env.JWT_SECRET_KEY;
  return Boolean(secret && secret !== "change-me");
}

function envFlag(name: string, fallback = "false"): boolean {
<<<<<<< HEAD
=======
  // Access env only when called, not at top-level
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
  return (process.env[name] ?? fallback).toLowerCase() === "true";
}

export async function GET(request: NextRequest) {
  try {
<<<<<<< HEAD
    const prisma = getPrisma();

    const auth = await requireAuth(request);
    const tenantId = auth.tenant_id;

=======
    const auth = await requireAuth(request);

    const tenantId = auth.tenant_id;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [
      openCases,
      inProgressCases,
      closedCases,
      pendingDocuments,
      signedDocuments,
      archivedDocuments,
      recentErrors,
      recentAudits,
    ] = await Promise.all([
<<<<<<< HEAD
      getPrisma().case.count({
        where: { tenantId, status: CaseStatus.OPEN },
      }),
      getPrisma().case.count({
        where: { tenantId, status: CaseStatus.IN_PROGRESS },
      }),
      getPrisma().case.count({
        where: { tenantId, status: CaseStatus.CLOSED },
      }),
      getPrisma().document.count({
=======
      prisma.case.count({ where: { tenantId, status: CaseStatus.OPEN } }),
      prisma.case.count({ where: { tenantId, status: CaseStatus.IN_PROGRESS } }),
      prisma.case.count({ where: { tenantId, status: CaseStatus.CLOSED } }),
      prisma.document.count({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        where: {
          tenantId,
          status: {
            in: [DocumentStatus.DRAFT, DocumentStatus.GENERATED],
          },
        },
      }),
<<<<<<< HEAD
      getPrisma().document.count({
        where: { tenantId, status: DocumentStatus.SIGNED },
      }),
      getPrisma().document.count({
        where: { tenantId, status: DocumentStatus.ARCHIVED },
      }),
      getPrisma().auditLog.count({
=======
      prisma.document.count({ where: { tenantId, status: DocumentStatus.SIGNED } }),
      prisma.document.count({ where: { tenantId, status: DocumentStatus.ARCHIVED } }),
      prisma.auditLog.count({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        where: {
          tenantId,
          createdAt: { gte: dayAgo },
          OR: [
            { action: { contains: "fail", mode: "insensitive" } },
            { details: { contains: "error", mode: "insensitive" } },
          ],
        },
      }),
<<<<<<< HEAD
      getPrisma().auditLog.findMany({
=======
      prisma.auditLog.findMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        where: {
          tenantId,
          createdAt: { gte: dayAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          details: true,
          createdAt: true,
        },
      }),
    ]);

    const integrations = {
      his: envFlag("HIS_INTEGRATION_ENABLED", "true"),
      fhir: envFlag("FHIR_INTEGRATION_ENABLED", "true"),
      docuWare: envFlag("DOCUWARE_ENABLED"),
      sharePoint: envFlag("SHAREPOINT_ENABLED"),
      erp: envFlag("ERP_ENABLED"),
    };

    const checks = [
      {
        key: "auth",
        label: "Authentication Configured",
        ok: isAuthConfigured(),
      },
      {
        key: "core-integrations",
        label: "Core Integrations (HIS/FHIR)",
        ok: integrations.his && integrations.fhir,
      },
      {
        key: "critical-errors",
        label: "No Critical Errors (24h)",
        ok: recentErrors === 0,
      },
      {
        key: "launch-activity",
        label: "Launch Activity Available",
        ok: openCases + inProgressCases + closedCases > 0,
      },
    ];

    const goNoGo = checks.every((item) => item.ok);

    return NextResponse.json({
      goNoGo,
      checks,
      metrics: {
        openCases,
        inProgressCases,
        closedCases,
        pendingDocuments,
        signedDocuments,
        archivedDocuments,
        recentErrors,
      },
      integrations,
      recentAudits,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
