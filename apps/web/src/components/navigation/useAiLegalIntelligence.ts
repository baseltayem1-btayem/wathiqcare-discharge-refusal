"use client";

import { useEffect, useState } from "react";

type AiRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";

type AiLegalIntelligenceResponse = {
  caseId: string;
  workflowStatus: string;
  aiAssessment: {
    riskLevel: AiRiskLevel;
    clinicalDocumentationGaps: string[];
    legalDocumentationGaps: string[];
    recommendedNextSteps: string[];
    requiresClinicianReview: boolean;
    requiresLegalReview: boolean;
    patientCommunicationDraft: string | null;
    disclaimer: string;
  };
  source: string;
  auditSourceLabel?: string;
  generatedAt: string;
};

type UseAiLegalIntelligenceResult = {
  insight: AiLegalIntelligenceResponse | null;
  loading: boolean;
  source: "ai-assisted" | "unavailable";
};

export function useAiLegalIntelligence(caseId: string | null): UseAiLegalIntelligenceResult {
  const [insight, setInsight] = useState<AiLegalIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"ai-assisted" | "unavailable">("unavailable");

  useEffect(() => {
    if (!caseId) {
      return;
    }

    const controller = new AbortController();

    Promise.resolve()
      .then(async () => {
        setLoading(true);

        const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/ai-legal-intelligence`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`ai_legal_intelligence_fetch_failed_${response.status}`);
        }

        const payload = (await response.json().catch(() => null)) as AiLegalIntelligenceResponse | null;
        if (!payload?.aiAssessment) {
          throw new Error("ai_legal_intelligence_payload_missing");
        }

        setInsight(payload);
        setSource("ai-assisted");
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.warn("[ai-legal-intelligence] unavailable; keeping UI fallback-only mode");
          void error;
        }

        setInsight(null);
        setSource("unavailable");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [caseId]);

  return {
    insight: caseId ? insight : null,
    loading: caseId ? loading : false,
    source: caseId ? source : "unavailable",
  };
}
