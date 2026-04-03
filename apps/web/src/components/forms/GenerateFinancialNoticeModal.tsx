"use client";

import BaseWorkflowModal from "@/components/forms/_BaseWorkflowModal";

type GenerateFinancialNoticeModalProps = {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function GenerateFinancialNoticeModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: GenerateFinancialNoticeModalProps) {
  return (
    <BaseWorkflowModal
      open={open}
      title="إنشاء إشعار المسؤولية المالية"
      description="إنشاء الإشعار المالي الرسمي بعد اجتياز الحد الأدنى من التحقق من البيانات المطلوبة."
      submitLabel="إنشاء الإشعار المالي"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
