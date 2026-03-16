"use client";

import { useState } from "react";
import BaseWorkflowModal from "@/components/forms/_BaseWorkflowModal";

type GenerateFinancialNoticeModalProps = {
  open: boolean;
  submitting?: boolean;
  defaultLanguageCode?: "ar" | "en";
  onClose: () => void;
  onSubmit: (payload?: {
    language_code: "ar" | "en";
    guarantee_type?: string;
    guarantee_amount?: string;
  }) => void;
};

export default function GenerateFinancialNoticeModal({
  open,
  submitting,
  defaultLanguageCode = "ar",
  onClose,
  onSubmit,
}: GenerateFinancialNoticeModalProps) {
  const [languageCode, setLanguageCode] = useState<"ar" | "en">(defaultLanguageCode);
  const [guaranteeType, setGuaranteeType] = useState("promissory_note");
  const [guaranteeAmount, setGuaranteeAmount] = useState("");

  return (
    <BaseWorkflowModal
      open={open}
      title="إنشاء إشعار المسؤولية المالية"
      description="إنشاء الإشعار المالي الرسمي بعد اجتياز الحد الأدنى من التحقق من البيانات المطلوبة."
      submitLabel="إنشاء الإشعار المالي"
      submitting={submitting}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          language_code: languageCode,
          guarantee_type: guaranteeType || undefined,
          guarantee_amount: guaranteeAmount || undefined,
        })
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">لغة المستند</label>
          <select
            value={languageCode}
            onChange={(event) => setLanguageCode(event.target.value as "ar" | "en")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">نوع الضمان المالي (اختياري)</label>
          <select
            value={guaranteeType}
            onChange={(event) => setGuaranteeType(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="promissory_note">Promissory Note</option>
            <option value="deposit">Deposit</option>
            <option value="insurance_guarantee">Insurance Guarantee</option>
            <option value="bank_guarantee">Bank Guarantee</option>
            <option value="corporate_undertaking">Corporate Undertaking</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">قيمة الضمان (اختياري)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={guaranteeAmount}
            onChange={(event) => setGuaranteeAmount(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            placeholder="0.00"
          />
        </div>
      </div>
    </BaseWorkflowModal>
  );
}
