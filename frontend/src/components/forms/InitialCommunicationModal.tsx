"use client";

import BaseWorkflowModal from "@/components/forms/_BaseWorkflowModal";

type InitialCommunicationModalProps = {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function InitialCommunicationModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: InitialCommunicationModalProps) {
  return (
    <BaseWorkflowModal
      open={open}
      title="Record Initial Communication"
      description="Document initial communication with patient and family."
      submitLabel="Record Communication"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
