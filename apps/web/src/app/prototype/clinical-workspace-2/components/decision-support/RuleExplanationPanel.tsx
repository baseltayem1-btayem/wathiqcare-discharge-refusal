"use client";

import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system";
import type { MockClinicalSuggestion, MockConsentBlocker, PatientAlert } from "../../types/workspace";

interface RuleExplanationPanelProps {
  suggestions: MockClinicalSuggestion[];
  blockers: MockConsentBlocker[];
  alerts: PatientAlert[];
}

export function RuleExplanationPanel({ suggestions, blockers, alerts }: RuleExplanationPanelProps) {
  const hasItems = suggestions.length > 0 || blockers.length > 0 || alerts.length > 0;
  if (!hasItems) return null;

  return (
    <Card variant="default" className="bg-[var(--wc-surface-2)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-[var(--wc-navy)]">
          <Lightbulb className="w-4 h-4" /> Why is this guidance shown?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-[var(--wc-text)]">
        <ul className="space-y-2">
          {blockers.map((b) => (
            <li key={b.key} className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>{b.messageEn}</span>
            </li>
          ))}
          {alerts.map((a) => (
            <li key={a.id} className="flex items-start gap-2">
              <span className={`font-bold ${a.severity === "critical" ? "text-red-600" : "text-amber-600"}`}>•</span>
              <span>{a.messageEn}</span>
            </li>
          ))}
          {suggestions.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              <span className="text-[var(--wc-blue)] font-bold">•</span>
              <span>{s.messageEn}</span>
            </li>
          ))}
        </ul>
        <div className="text-xs text-[var(--wc-text-muted)] mt-3">
          Rules are evaluated from the Clinical Knowledge Engine using procedure, patient capacity, language preference,
          allergies, medications, package status, and risk level.
        </div>
      </CardContent>
    </Card>
  );
}
