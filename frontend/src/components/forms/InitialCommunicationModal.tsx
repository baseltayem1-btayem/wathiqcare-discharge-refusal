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
      title="تسجيل التواصل الأولي"
      description="توثيق التواصل الأولي مع المريض والأسرة."
      submitLabel="تسجيل التواصل"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
