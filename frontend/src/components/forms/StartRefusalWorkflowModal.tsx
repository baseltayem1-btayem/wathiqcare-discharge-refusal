"use client";

import BaseWorkflowModal from "@/components/forms/_BaseWorkflowModal";

type StartRefusalWorkflowModalProps = {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function StartRefusalWorkflowModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: StartRefusalWorkflowModalProps) {
  return (
    <BaseWorkflowModal
      open={open}
      title="Start Refusal Workflow"
      description="Start workflow after patient/legal representative refuses discharge."
      submitLabel="Start Workflow"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
