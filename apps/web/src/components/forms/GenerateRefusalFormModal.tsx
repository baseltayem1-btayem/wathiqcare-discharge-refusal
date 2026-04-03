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
      title="إنشاء نموذج رفض الخروج الطبي"
      description="إنشاء نموذج رفض الخروج الطبي بعد استكمال الحقول المطلوبة."
      submitLabel="إنشاء نموذج الرفض"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
