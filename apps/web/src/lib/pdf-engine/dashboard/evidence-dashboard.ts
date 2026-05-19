import type { EvidenceAnalyticsSummary } from "@/lib/pdf-engine/management/evidence-analytics";
import type { EvidenceSummary } from "@/lib/pdf-engine/management/evidence-manager";

export interface EvidenceDashboardModel {
  analytics: EvidenceAnalyticsSummary;
  recentEvidence: EvidenceSummary[];
}

export function buildEvidenceDashboard(input: {
  analytics: EvidenceAnalyticsSummary;
  evidenceSummaries: EvidenceSummary[];
}): EvidenceDashboardModel {
  return {
    analytics: input.analytics,
    recentEvidence: input.evidenceSummaries.slice(0, 10),
  };
}