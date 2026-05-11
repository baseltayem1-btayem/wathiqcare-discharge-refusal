import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

const prisma = getPrisma();

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toCsv(rows: Array<Record<string, string | number | null>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null) => {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "governance:view");

    const tenantId = auth.tenant_id || "";
    const { searchParams } = new URL(request.url);
    const start = toDate(searchParams.get("startDate"));
    const end = toDate(searchParams.get("endDate"));
    const specialty = (searchParams.get("specialty") || "").trim();
    const department = (searchParams.get("department") || "").trim();
    const physician = (searchParams.get("physician") || "").trim();
    const status = (searchParams.get("status") || "").trim().toUpperCase();
    const format = (searchParams.get("format") || "json").trim().toLowerCase();

    const where: Prisma.ConsentDocumentWhereInput = {
      tenantId,
      ...(start || end
        ? {
            createdAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
      ...(specialty ? { physicianSpecialty: specialty } : {}),
      ...(department ? { department } : {}),
      ...(physician ? { physicianName: { contains: physician, mode: "insensitive" } } : {}),
      ...(status ? { status: status as never } : {}),
    };

    const [docs, templates, reviews, aiDocs] = await Promise.all([
      prisma.consentDocument.findMany({
        where,
        include: {
          template: {
            select: {
              templateCode: true,
              consentType: true,
              specialty: true,
            },
          },
          signatures: true,
        },
        take: 2000,
      }),
      prisma.consentTemplate.count({ where: { tenantId, status: "ACTIVE" } }),
      prisma.consentCommitteeReview.count({ where: { tenantId, decision: "PENDING" } }),
      prisma.consentDocument.count({ where: { tenantId, aiGeneratedAt: { not: null } } }),
    ]);

    const pendingSignatures = docs.filter((doc) => doc.status === "READY_FOR_SIGNATURE" || doc.status === "SIGNED").length;
    const finalizedToday = docs.filter((doc) => {
      if (!doc.finalizedAt) return false;
      const today = new Date();
      return doc.finalizedAt.toDateString() === today.toDateString();
    }).length;

    const highRisk = docs.filter((doc) => (doc.metadata as Record<string, unknown> | null)?.riskProfile === "HIGH").length;
    const failedSyncs = docs.filter((doc) => {
      const sync = ((doc.metadata as Record<string, unknown> | null)?.encounterSync || {}) as Record<string, unknown>;
      return String(sync.status || "").toUpperCase() === "FAILED";
    }).length;

    const expiredLinks = docs.filter((doc) => {
      const orchestration = ((doc.metadata as Record<string, unknown> | null)?.signatureOrchestration || {}) as Record<string, unknown>;
      const requests = Array.isArray(orchestration.requests) ? orchestration.requests : [];
      return requests.some((item) => {
        const row = item as Record<string, unknown>;
        return String(row.status || "").toUpperCase() === "EXPIRED";
      });
    }).length;

    const rows = docs.map((doc) => ({
      consentReference: doc.consentReference,
      status: doc.status,
      specialty: doc.physicianSpecialty,
      department: doc.department,
      physician: doc.physicianName,
      template: doc.template?.templateCode || "-",
      consentType: doc.template?.consentType || "-",
      createdAt: doc.createdAt.toISOString(),
      finalizedAt: doc.finalizedAt?.toISOString() || "",
      signatureCount: doc.signatures.length,
      aiAssisted: doc.aiGeneratedAt ? "YES" : "NO",
    }));

    const payload = {
      cards: {
        activeTemplates: templates,
        pendingApprovals: reviews,
        finalizedConsentsToday: finalizedToday,
        pendingSignatures,
        highRiskProcedures: highRisk,
        complianceAlerts: reviews,
        failedSyncs,
        expiredLinks,
      },
      totals: {
        consentsCreated: docs.length,
        consentsFinalized: docs.filter((doc) => doc.status === "FINALIZED").length,
        pendingSignatures,
        expiredSignatures: expiredLinks,
        rejectedConsents: docs.filter((doc) => doc.status === "VOID").length,
        aiAssistedConsents: aiDocs,
      },
      rows,
    };

    if (format === "csv" || format === "excel") {
      requireInformedConsentPermission(auth, "consent:export");
      const csv = toCsv(rows as Array<Record<string, string | number | null>>);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": format === "excel" ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="informed-consents-governance-report.${format === "excel" ? "xls" : "csv"}"`,
        },
      });
    }

    if (format === "pdf") {
      requireInformedConsentPermission(auth, "consent:export");
      const lines = [
        "WathiqCare Informed Consents Governance Report",
        `Generated At: ${new Date().toISOString()}`,
        `Consents Created: ${payload.totals.consentsCreated}`,
        `Finalized: ${payload.totals.consentsFinalized}`,
        `Pending Signatures: ${payload.totals.pendingSignatures}`,
      ];
      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=\"informed-consents-governance-report.pdf\"",
        },
      });
    }

    return NextResponse.json(toJsonSafe(payload));
  } catch (error) {
    return handleApiError(error);
  }
}
