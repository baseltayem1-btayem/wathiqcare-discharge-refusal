"use client";

import { Send, FileCheck, AlertCircle, RotateCcw, Eye, Clock, ArrowLeft } from "lucide-react";
import { Button, Container, Stack, Alert } from "@/components/design-system";

interface ActionRailProps {
  sendReady: boolean;
  draftReady: boolean;
  draftApproved: boolean;
  sent: boolean;
  mode: "physician" | "patientPreview" | "timeline";
  canPreviewPatient: boolean;
  onApprove: () => void;
  onSend: () => void;
  onReset: () => void;
  onPreviewPatient: () => void;
  onViewTimeline: () => void;
  onBackToPhysician: () => void;
}

export function ActionRail({
  sendReady,
  draftReady,
  draftApproved,
  sent,
  mode,
  canPreviewPatient,
  onApprove,
  onSend,
  onReset,
  onPreviewPatient,
  onViewTimeline,
  onBackToPhysician,
}: ActionRailProps) {
  if (sent) {
    return (
      <div className="workspace-action-rail">
        <Container as="div" size="full" className="!px-0">
          <Stack direction="row" align="center" justify="between" wrap gap={3}>
            <Alert variant="success" icon={<Send className="w-4 h-4" />} className="py-2">
              Consent dispatched to patient.
            </Alert>
            <Stack direction="row" gap={2}>
              <Button variant="outline" size="sm" uppercase={false} onClick={onViewTimeline}>
                <Clock className="w-3.5 h-3.5" /> View timeline
              </Button>
              <Button variant="outline" size="sm" uppercase={false} onClick={onReset}>
                <RotateCcw className="w-3.5 h-3.5" /> Start new consent
              </Button>
            </Stack>
          </Stack>
        </Container>
      </div>
    );
  }

  if (mode === "patientPreview" || mode === "timeline") {
    return (
      <div className="workspace-action-rail">
        <Container as="div" size="full" className="!px-0">
          <Stack direction="row" align="center" justify="between" wrap gap={3}>
            <span className="text-sm font-semibold text-[var(--wc-text)]">
              {mode === "patientPreview" ? "Patient journey preview" : "Clinical timeline"}
            </span>
            <Button variant="outline" size="sm" uppercase={false} onClick={onBackToPhysician}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back to physician workspace
            </Button>
          </Stack>
        </Container>
      </div>
    );
  }

  return (
    <div className="workspace-action-rail">
      <Container as="div" size="full" className="!px-0">
        <Stack direction="row" align="center" justify="between" wrap gap={3}>
          <div className="flex items-center gap-2 text-sm text-[var(--wc-text-muted)]">
            <span className="font-semibold text-[var(--wc-text)]">Next action:</span>
            {!draftReady && <span>Complete patient, encounter, and procedure selection.</span>}
            {draftReady && !draftApproved && <span>Review the auto-resolved package and approve the draft.</span>}
            {draftReady && draftApproved && <span>Send the consent to the patient.</span>}
          </div>
          <Stack direction="row" align="center" gap={2} wrap>
            {canPreviewPatient && (
              <Button variant="outline" size="sm" uppercase={false} onClick={onPreviewPatient}>
                <Eye className="w-4 h-4" /> Preview patient journey
              </Button>
            )}
            {!draftApproved && (
              <Button variant="brand" size="sm" uppercase={false} onClick={onApprove} disabled={!draftReady}>
                <FileCheck className="w-4 h-4" /> Approve draft
              </Button>
            )}
            {draftApproved && (
              <Button variant="success" size="sm" uppercase={false} onClick={onSend} disabled={!sendReady}>
                <Send className="w-4 h-4" /> Send to patient
              </Button>
            )}
            {!draftReady && (
              <Alert variant="warning" icon={<AlertCircle className="w-4 h-4" />} className="py-2 px-3 text-xs">
                Blocked — resolve readiness items
              </Alert>
            )}
          </Stack>
        </Stack>
      </Container>
    </div>
  );
}
