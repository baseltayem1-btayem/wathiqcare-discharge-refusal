"use client";

import BaseWorkflowModal from "@/components/forms/_BaseWorkflowModal";

type GenerateRefusalFormModalProps = {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function GenerateRefusalFormModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: GenerateRefusalFormModalProps) {
  return (
    <BaseWorkflowModal
      open={open}
      title="Generate Discharge Refusal Form"
      description="Generate the IMC-PAT-DIS-REF-01 form after required fields are complete."
      submitLabel="Generate Refusal Form"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
