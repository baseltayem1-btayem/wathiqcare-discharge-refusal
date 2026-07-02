"use client";

import { BookOpen, ShieldAlert, AlertCircle, Info, CheckCircle2, Users, FileText, ImageIcon } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Stack,
} from "@/components/design-system";
import type {
  MockClinicalKnowledgeAssembly,
  AnesthesiaDecision,
  Procedure,
  PatientAlert,
} from "../types/workspace";
import { PatientAlertCard } from "./decision-support/PatientAlertCard";
import { RuleExplanationPanel } from "./decision-support/RuleExplanationPanel";

interface ClinicalKnowledgePackageCardProps {
  assembly?: MockClinicalKnowledgeAssembly;
  procedure?: Procedure;
  anesthesiaOverride?: AnesthesiaDecision;
  educationIncluded: boolean;
  alerts: PatientAlert[];
  acknowledgedAlertIds: Set<string>;
  onAnesthesiaChange: (decision: AnesthesiaDecision) => void;
  onEducationToggle: (included: boolean) => void;
  onAcknowledgeAlert: (alertId: string) => void;
}

const anesthesiaOptions: AnesthesiaDecision[] = ["NONE", "LOCAL", "SEDATION", "REGIONAL", "GENERAL"];

export function ClinicalKnowledgePackageCard({
  assembly,
  procedure,
  anesthesiaOverride,
  educationIncluded,
  alerts,
  acknowledgedAlertIds,
  onAnesthesiaChange,
  onEducationToggle,
  onAcknowledgeAlert,
}: ClinicalKnowledgePackageCardProps) {
  if (!assembly) {
    return (
      <Card variant="default" className="p-8" id="section-package">
        <div className="workspace-empty-state">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-[var(--wc-text-light)]" />
          <p className="text-sm">Select a procedure to auto-resolve the Clinical Knowledge Package.</p>
        </div>
      </Card>
    );
  }

  const showAnesthesiaOverride = procedure && (procedure.anesthesiaRequired || anesthesiaOverride);
  const selectedAnesthesia = anesthesiaOverride ?? (procedure?.anesthesiaRequired ? "GENERAL" : "NONE");

  return (
    <Card variant="default" className="overflow-hidden" id="section-package">
      <CardHeader className="workspace-card-header">
        <Stack direction="row" align="center" justify="between">
          <Stack direction="row" align="center" gap={2}>
            <BookOpen className="w-5 h-5 text-[var(--wc-blue)]" />
            <CardTitle className="workspace-section-title">3. Clinical Knowledge Package</CardTitle>
          </Stack>
          <Badge variant={assembly.status === "ready" ? "success" : "destructive"}>
            {assembly.status === "ready" ? "Ready" : "Blocked"}
          </Badge>
        </Stack>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Consent form */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">Consent form</div>
          <div className="flex items-start gap-3 p-4 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)]">
            <FileText className="w-5 h-5 text-[var(--wc-blue)] mt-0.5" />
            <div>
              <div className="font-semibold text-[var(--wc-text)]">{assembly.consentForm?.titleEn}</div>
              <div className="text-xs text-[var(--wc-text-muted)]">
                {assembly.consentForm?.formType.replace(/_/g, " ")} • v{assembly.consentForm?.version} •{" "}
                {assembly.consentForm?.riskLevel} risk
              </div>
            </div>
          </div>
        </div>

        {/* Required participants */}
        {assembly.requiredParticipants.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">
              Required participants
            </div>
            <Stack direction="row" wrap gap={2}>
              {assembly.requiredParticipants.map((role) => (
                <Badge key={role} variant="info" className="gap-1.5 py-1.5 px-3 normal-case tracking-normal">
                  <Users className="w-3.5 h-3.5" />
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              ))}
            </Stack>
          </div>
        )}

        {/* Education */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">
              Patient education
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--wc-text)] cursor-pointer">
              <Checkbox checked={educationIncluded} onChange={(e) => onEducationToggle(e.target.checked)} />
              Include education
            </label>
          </div>
          {educationIncluded && assembly.educationMaterials.length > 0 ? (
            <Stack direction="column" gap={2}>
              {assembly.educationMaterials.map((edu) => (
                <div
                  key={edu.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)]"
                >
                  <BookOpen className="w-4 h-4 text-[var(--wc-blue)] mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--wc-text)]">{edu.titleEn}</div>
                    <div className="text-xs text-[var(--wc-text-muted)]">
                      {edu.assetType} • {edu.durationMinutes ? `${edu.durationMinutes} min` : "Self-paced"}
                    </div>
                  </div>
                </div>
              ))}
            </Stack>
          ) : educationIncluded ? (
            <div className="text-sm text-[var(--wc-text-muted)]">No education material matched.</div>
          ) : (
            <div className="text-sm text-[var(--wc-text-muted)]">Education excluded by physician.</div>
          )}
        </div>

        {/* Educational illustrations */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">
            Educational illustrations
          </div>
          {assembly.illustrations.length > 0 ? (
            <Stack direction="column" gap={3}>
              {assembly.illustrations.map((illustration) => (
                <div
                  key={illustration.id}
                  className="space-y-2 p-3 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)]"
                >
                  {illustration.anatomyImageUrl && (
                    <div>
                      <div className="text-xs font-semibold text-[var(--wc-text-muted)] mb-1">Anatomy</div>
                      {/* eslint-disable-next-line @next/next/no-img-element -- educational illustration placeholder; external URLs */}
                      <img
                        src={illustration.anatomyImageUrl}
                        alt={illustration.anatomyPromptEn || illustration.procedureNameEn}
                        className="w-full max-h-48 object-contain rounded"
                      />
                    </div>
                  )}
                  {illustration.procedureImageUrl && (
                    <div>
                      <div className="text-xs font-semibold text-[var(--wc-text-muted)] mb-1">Procedure</div>
                      {/* eslint-disable-next-line @next/next/no-img-element -- educational illustration placeholder; external URLs */}
                      <img
                        src={illustration.procedureImageUrl}
                        alt={illustration.procedurePromptEn || illustration.procedureNameEn}
                        className="w-full max-h-48 object-contain rounded"
                      />
                    </div>
                  )}
                  {(illustration.anatomyPromptEn || illustration.procedurePromptEn) && (
                    <div className="text-sm text-[var(--wc-text)]">
                      {illustration.procedurePromptEn || illustration.anatomyPromptEn}
                    </div>
                  )}
                  {illustration.patientDisplayDisclaimerEn && (
                    <div className="text-xs text-[var(--wc-text-muted)] italic">
                      {illustration.patientDisplayDisclaimerEn}
                    </div>
                  )}
                </div>
              ))}
            </Stack>
          ) : (
            <div className="flex items-start gap-3 text-sm text-[var(--wc-text-muted)]">
              <ImageIcon className="w-4 h-4 mt-0.5 shrink-0" />
              Educational illustration pending medical approval.
            </div>
          )}
        </div>

        {/* Anesthesia override */}
        {showAnesthesiaOverride && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">
              Anesthesia plan
            </div>
            <Stack direction="row" wrap gap={2}>
              {anesthesiaOptions.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={selectedAnesthesia === option ? "brand" : "outline"}
                  size="sm"
                  uppercase={false}
                  onClick={() => onAnesthesiaChange(option)}
                >
                  {option}
                </Button>
              ))}
            </Stack>
            {procedure?.anesthesiaRequired && !anesthesiaOverride && (
              <div className="text-xs text-[var(--wc-text-muted)]">
                Defaulted to GENERAL based on procedure catalog.
              </div>
            )}
          </div>
        )}

        {/* Risks */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">
            Key risk disclosures
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assembly.riskDisclosures.map((risk) => {
              const variant =
                risk.riskLevel === "CRITICAL" ? "error" : risk.riskLevel === "HIGH" ? "warning" : "info";
              return (
                <Alert
                  key={risk.id}
                  variant={variant}
                  className="flex-col items-start py-3 text-sm"
                >
                  <div className="font-semibold">{risk.titleEn}</div>
                  <div className="text-xs opacity-80">Incidence: {risk.incidenceRate ?? "N/A"}</div>
                </Alert>
              );
            })}
          </div>
        </div>

        {/* Suggestions */}
        {assembly.suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">
              Clinical guidance
            </div>
            <Stack direction="column" gap={2}>
              {assembly.suggestions.map((s) => {
                const variant =
                  s.severity === "critical" ? "error" : s.severity === "warning" ? "warning" : "info";
                const Icon = s.severity === "critical" ? ShieldAlert : s.severity === "warning" ? AlertCircle : Info;
                return (
                  <Alert key={s.id} variant={variant} icon={<Icon className="w-4 h-4 mt-0.5 shrink-0" />}>
                    {s.messageEn}
                  </Alert>
                );
              })}
            </Stack>
          </div>
        )}

        {/* Blockers */}
        {assembly.blockers.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">Blockers</div>
            <Stack direction="column" gap={2}>
              {assembly.blockers.map((blocker) => (
                <Alert key={blocker.key} variant="error" icon={<ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />}>
                  {blocker.messageEn}
                </Alert>
              ))}
            </Stack>
          </div>
        )}

        {/* Patient-specific alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">
              Patient-specific clinical alerts
            </div>
            <Stack direction="column" gap={2}>
              {alerts.map((alert) => (
                <PatientAlertCard
                  key={alert.id}
                  alert={alert}
                  acknowledged={acknowledgedAlertIds.has(alert.id)}
                  onAcknowledge={() => onAcknowledgeAlert(alert.id)}
                />
              ))}
            </Stack>
          </div>
        )}

        {/* Rule explanation */}
        <RuleExplanationPanel
          suggestions={assembly.suggestions}
          blockers={assembly.blockers}
          alerts={alerts}
        />

        {/* Auto-resolution summary */}
        <Alert variant="success" icon={<CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}>
          <span className="font-semibold">Auto-resolved:</span> consent category, template, education, anesthesia
          default, required participants, and clinical alerts based on procedure + patient context.
        </Alert>
      </CardContent>
    </Card>
  );
}
