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
      title="Generate Financial Responsibility Notice"
      description="Generate the official financial notice after minimum required data validation passes."
      submitLabel="Generate Financial Notice"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
