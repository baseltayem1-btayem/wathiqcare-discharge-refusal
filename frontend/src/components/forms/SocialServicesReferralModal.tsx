"use client";

import BaseWorkflowModal from "@/components/forms/_BaseWorkflowModal";

type SocialServicesReferralModalProps = {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function SocialServicesReferralModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: SocialServicesReferralModalProps) {
  return (
    <BaseWorkflowModal
      open={open}
      title="التحويل إلى الخدمات الاجتماعية"
      description="تسجيل تفاصيل التحويل للدعم والتدخل."
      submitLabel="تحويل"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
