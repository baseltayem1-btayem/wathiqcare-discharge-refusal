import type { IntegrityHealthReport } from "@/lib/pdf-engine/security/integrity-monitor";
import type { ForensicAlert } from "@/lib/pdf-engine/security/forensic-alerts";

export interface ForensicDashboardModel {
  alertCount: number;
  healthy: boolean;
  highSeverityAlerts: number;
  monitoredCount: number;
}

export function buildForensicDashboard(input: {
  alerts: ForensicAlert[];
  integrityHealthReport: IntegrityHealthReport;
}): ForensicDashboardModel {
  return {
    alertCount: input.alerts.length,
    healthy: input.integrityHealthReport.healthy,
    highSeverityAlerts: input.alerts.filter((alert) => alert.severity === "high").length,
    monitoredCount: input.integrityHealthReport.monitoredCount,
  };
}