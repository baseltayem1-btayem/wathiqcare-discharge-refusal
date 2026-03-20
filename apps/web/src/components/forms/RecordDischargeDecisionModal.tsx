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
      title="تسجيل قرار الخروج الطبي"
      description="تسجيل وقت قرار الخروج وتفاصيل الطبيب المعالج."
      submitLabel="تسجيل القرار"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
