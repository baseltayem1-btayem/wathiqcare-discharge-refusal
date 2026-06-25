import { $Enums, type IncidentSeverity, type IncidentStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = () => getPrisma();

function parseSeverity(value: string | null | undefined): IncidentSeverity {
  const normalized = (value ?? "").trim().toUpperCase();
  switch (normalized) {
    case "HIGH":
      return $Enums.IncidentSeverity.HIGH;
    case "MEDIUM":
      return $Enums.IncidentSeverity.MEDIUM;
    case "LOW":
      return $Enums.IncidentSeverity.LOW;
    default:
      return $Enums.IncidentSeverity.CRITICAL;
  }
}

function parseStatus(value: string | null | undefined): IncidentStatus {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized in IncidentStatus) {
    return IncidentStatus[normalized as keyof typeof IncidentStatus];
  }
  return $Enums.IncidentStatus.DETECTED;
}

export function buildIncidentSla(severity: IncidentSeverity, detectedAt = new Date()) {
  const base = detectedAt.getTime();
  const oneHour = 60 * 60 * 1000;
  return {
    internalEscalationDueAt: new Date(base + oneHour),
    clientNotificationDueAt: new Date(base + 48 * oneHour),
    regulatorNotificationDueAt: severity === $Enums.IncidentSeverity.LOW ? null : new Date(base + 72 * oneHour),
  };
}

export function summarizeSecurityIncidents(
  incidents: Array<{
    severity: IncidentSeverity | string;
    status: IncidentStatus | string;
    clientNotificationDueAt?: Date | string | null;
    regulatorNotificationDueAt?: Date | string | null;
  }>,
) {
  const bySeverity: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let openCount = 0;
  let overdueNotificationCount = 0;

  for (const incident of incidents) {
    const severity = String(incident.severity).toUpperCase();
    const status = String(incident.status).toUpperCase();
    const isClosed = status === "RESOLVED" || status === "CLOSED";

    bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
    byStatus[status] = (byStatus[status] ?? 0) + 1;

    if (!isClosed) {
      openCount += 1;
      const clientDue = incident.clientNotificationDueAt ? new Date(incident.clientNotificationDueAt).getTime() : null;
      const regulatorDue = incident.regulatorNotificationDueAt ? new Date(incident.regulatorNotificationDueAt).getTime() : null;
      const now = Date.now();
      if ((clientDue !== null && clientDue < now) || (regulatorDue !== null && regulatorDue < now)) {
        overdueNotificationCount += 1;
      }
    }
  }

  return {
    total: incidents.length,
    openCount,
    overdueNotificationCount,
    bySeverity,
    byStatus,
  };
}

export async function listSecurityIncidents(tenantId: string) {
  const incidents = await prisma().securityIncident.findMany({
    where: { tenantId },
    orderBy: { detectedAt: "desc" },
    take: 100,
  }).catch(() => []);

  const summary = summarizeSecurityIncidents(incidents);

  return {
    incidents,
    severityCounts: summary.bySeverity,
    statusCounts: summary.byStatus,
    summary,
  };
}

export async function createSecurityIncident(
  auth: AuthContext,
  payload: {
    caseId?: string | null;
    severity?: string;
    status?: string;
    title?: string;
    summary?: string;
    affectedScope?: string;
  },
  request?: NextRequest,
) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }
  if (!payload.title?.trim() || !payload.summary?.trim()) {
    throw new ApiError(400, "title and summary are required");
  }

  const severity = parseSeverity(payload.severity);
  const sla = buildIncidentSla(severity);
  const incident = await prisma().securityIncident.create({
    data: {
      tenantId: auth.tenant_id,
      caseId: payload.caseId?.trim() || null,
      severity: severity as $Enums.IncidentSeverity,
      status: parseStatus(payload.status) as $Enums.IncidentStatus,
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      affectedScope: payload.affectedScope?.trim() || "clinical_workflow",
      clientNotificationDueAt: sla.clientNotificationDueAt,
      regulatorNotificationDueAt: sla.regulatorNotificationDueAt,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    entityType: "security_incident",
    entityId: incident.id,
    action: "security_incident_created",
    details: incident.title,
    caseId: incident.caseId,
    metadataJson: {
      severity: incident.severity,
      status: incident.status,
    },
    request,
  }).catch(() => undefined);

  return incident;
}