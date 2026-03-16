"use client";

import { useState } from "react";
import BaseWorkflowModal from "@/components/forms/_BaseWorkflowModal";

type GenerateRefusalFormModalProps = {
  open: boolean;
  submitting?: boolean;
  defaultLanguageCode?: "ar" | "en";
  onClose: () => void;
  onSubmit: (payload?: { language_code: "ar" | "en" }) => void;
};

export default function GenerateRefusalFormModal({
  open,
  submitting,
  defaultLanguageCode = "ar",
  onClose,
  onSubmit,
}: GenerateRefusalFormModalProps) {
  const [languageCode, setLanguageCode] = useState<"ar" | "en">(defaultLanguageCode);

  return (
    <BaseWorkflowModal
      open={open}
      title="إنشاء نموذج رفض الخروج الطبي"
      description="إنشاء نموذج IMC-PAT-DIS-REF-01 بعد استكمال الحقول المطلوبة."
      submitLabel="إنشاء نموذج الرفض"
      submitting={submitting}
      onClose={onClose}
      onSubmit={() => onSubmit({ language_code: languageCode })}
    >
      <label className="block text-sm font-medium text-slate-700">
        لغة المستند
      </label>
      <select
        value={languageCode}
        onChange={(event) => setLanguageCode(event.target.value as "ar" | "en")}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
      >
        <option value="ar">العربية</option>
        <option value="en">English</option>
      </select>
    </BaseWorkflowModal>
  );
}
