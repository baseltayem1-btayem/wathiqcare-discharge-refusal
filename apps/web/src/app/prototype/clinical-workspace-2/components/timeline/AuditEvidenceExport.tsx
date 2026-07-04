"use client";

import { Download, ShieldCheck } from "lucide-react";
import { Button, Card, Stack } from "@/components/design-system";
import type { TimelineEvent, TaskMetrics, PatientJourneyState } from "../../types/workspace";

interface AuditEvidenceExportProps {
  events: TimelineEvent[];
  metrics: TaskMetrics;
  journey: PatientJourneyState;
}

export function AuditEvidenceExport({ events, metrics, journey }: AuditEvidenceExportProps) {
  const handleExport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      events: events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      metrics: {
        physicianClicks: metrics.clicks,
        physicianDecisions: metrics.decisions,
        physicianDurationMs: metrics.durationMs,
        patientInteractions: metrics.patientInteractions,
        patientScreensViewed: metrics.patientScreensViewed,
        educationTimeMs: metrics.educationTimeMs,
        questionsAsked: metrics.questionsAsked,
        blockersCaughtBeforeSend: metrics.blockersCaughtBeforeSend,
        endToEndDurationMs: metrics.endToEndDurationMs,
      },
      patientJourney: {
        completedAt: journey.completedAt,
        decision: journey.decision,
        signatures: journey.signatures.map((s) => ({ role: s.role, signerName: s.signerName, signedAt: s.signedAt })),
        educationCompletedAt: journey.educationCompletedAt,
        comprehensionPassed: journey.comprehensionPassed,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intelligent-clinical-journey-evidence.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4">
      <Stack className="gap-3">
        <div className="flex items-start gap-2 text-xs text-[var(--wc-text-muted)]">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            This evidence package is a prototype. A production export would include SHA-256 hashes, signature images,
            OTP audit records, and the final PDF.
          </span>
        </div>
        <Button
          variant="brand"
          size="sm"
          uppercase={false}
          onClick={handleExport}
          disabled={events.length === 0}
        >
          <Download className="w-4 h-4" /> Export audit evidence
        </Button>
      </Stack>
    </Card>
  );
}
