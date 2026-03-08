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
      title="Refer to Social Services"
      description="Record support and intervention referral details."
      submitLabel="Refer"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
