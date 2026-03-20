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
      title="بدء سير عمل رفض الخروج"
      description="ابدأ سير العمل بعد رفض المريض / الممثل النظامي للخروج الطبي."
      submitLabel="بدء سير العمل"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
