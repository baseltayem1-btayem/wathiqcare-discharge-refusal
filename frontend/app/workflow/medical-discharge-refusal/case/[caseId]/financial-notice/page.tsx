"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { postRefusalWorkflowAction } from "@/lib/services/medicalDischargeRefusal.service";

export default function FinancialResponsibilityNoticeGeneratorPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { t } = useI18n();
  const [representativeName, setRepresentativeName] = useState("");
  const [representativeSignature, setRepresentativeSignature] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState("");

  async function generateNotice() {
    setMessage("");
    try {
      await postRefusalWorkflowAction(caseId, "generate_financial_notice", {
        representative_name: representativeName,
        representative_signature: representativeSignature,
        financial_notice_acknowledged: acknowledged,
      });
      setMessage(t("mdrw.form.saved"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("mdrw.error.saveFailed"));
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={t("mdrw.screens.financialNotice")}
        subtitle={t("mdrw.form.financialSubtitle")}
        workflowCaseNav={{
          caseId,
          currentStage: "official_notification",
          escalationRequired: false,
        }}
        actions={
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">
            {t("mdrw.case.backCase")}
          </Link>
        }
      >
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="block text-sm text-slate-700">{t("mdrw.form.representativeName")}</label>
          <input value={representativeName} onChange={(e) => setRepresentativeName(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <label className="block text-sm text-slate-700">{t("mdrw.form.representativeSignature")}</label>
          <textarea value={representativeSignature} onChange={(e) => setRepresentativeSignature(e.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" />

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
            {t("mdrw.form.financialAcknowledged")}
          </label>

          <button type="button" onClick={() => void generateNotice()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {t("mdrw.form.generateNotice")}
          </button>
          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
