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
      title="التصعيد إلى الشؤون القانونية والامتثال"
      description="يُسمح بالتصعيد فقط عند استمرار الرفض وتجاوز موعد التصعيد المحدد."
      submitLabel="تصعيد"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
