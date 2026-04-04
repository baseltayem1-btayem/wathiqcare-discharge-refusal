import { CaseStatus, DocumentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

function isAuthConfigured(): boolean {
  const secret = process.env.JWT_SECRET_KEY;
  return Boolean(secret && secret !== "change-me");
}

function envFlag(name: string, fallback = "false"): boolean {
  return (process.env[name] ?? fallback).toLowerCase() === "true";
}

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    const auth = await requireAuth(request);
    const tenantId = auth.tenant_id;

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
      prisma.case.count({ where: { tenantId, status: CaseStatus.OPEN } }),
      prisma.case.count({ where: { tenantId, status: CaseStatus.IN_PROGRESS } }),
      prisma.case.count({ where: { tenantId, status: CaseStatus.CLOSED } }),
      prisma.document.count({
        where: {
          tenantId,
          status: {
            in: [DocumentStatus.DRAFT, DocumentStatus.GENERATED],
          },
        },
      }),
      prisma.document.count({
        where: {
          tenantId,
          status: DocumentStatus.SIGNED,
        },
      }),
      prisma.document.count({
        where: {
          tenantId,
          status: DocumentStatus.ARCHIVED,
        },
      }),
      prisma.auditLog.count({
        where: {
          tenantId,
          action: {
            contains: "ERROR",
          },
          createdAt: { gte: dayAgo },
        },
      }),
      prisma.auditLog.count({
        where: {
          tenantId,
          createdAt: { gte: dayAgo },
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
      isAuthConfigured: isAuthConfigured(),
      featureFlags: {
        newDashboard: envFlag("FEATURE_NEW_DASHBOARD"),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
