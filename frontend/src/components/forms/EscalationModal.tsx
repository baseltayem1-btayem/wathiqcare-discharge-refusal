"use client";

import BaseWorkflowModal from "@/components/forms/_BaseWorkflowModal";

type EscalationModalProps = {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function EscalationModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: EscalationModalProps) {
  return (
    <BaseWorkflowModal
      open={open}
      title="Escalate to Legal & Compliance"
      description="Escalation is allowed only when refusal persists and escalation due time has passed."
      submitLabel="Escalate"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
