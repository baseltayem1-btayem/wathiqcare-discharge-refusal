"use client";

import BaseWorkflowModal from "@/components/forms/_BaseWorkflowModal";

type RecordDischargeDecisionModalProps = {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function RecordDischargeDecisionModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: RecordDischargeDecisionModalProps) {
  return (
    <BaseWorkflowModal
      open={open}
      title="Record Medical Discharge Decision"
      description="Capture discharge decision timestamp and physician details."
      submitLabel="Record Decision"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
