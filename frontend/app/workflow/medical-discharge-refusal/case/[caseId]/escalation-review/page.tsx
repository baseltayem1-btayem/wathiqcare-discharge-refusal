"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { postRefusalWorkflowAction } from "@/lib/services/medicalDischargeRefusal.service";

export default function EscalationReviewScreenPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { t } = useI18n();
  const [complianceNotes, setComplianceNotes] = useState("");
  const [legalNotes, setLegalNotes] = useState("");
  const [message, setMessage] = useState("");

  async function run(action: string, payload: Record<string, unknown> = {}) {
    setMessage("");
    try {
      await postRefusalWorkflowAction(caseId, action, payload);
      setMessage(t("mdrw.form.saved"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("mdrw.error.saveFailed"));
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={t("mdrw.screens.escalation")}
        subtitle={t("mdrw.form.escalationSubtitle")}
        workflowCaseNav={{
          caseId,
          currentStage: "escalation",
          escalationRequired: true,
        }}
        actions={
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">
            {t("mdrw.case.backCase")}
          </Link>
        }
      >
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="block text-sm text-slate-700">{t("mdrw.form.complianceNotes")}</label>
          <textarea value={complianceNotes} onChange={(e) => setComplianceNotes(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button type="button" onClick={() => void run("record_compliance_review", { compliance_notes: complianceNotes })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            {t("mdrw.form.recordCompliance")}
          </button>

          <label className="block text-sm text-slate-700">{t("mdrw.form.legalNotes")}</label>
          <textarea value={legalNotes} onChange={(e) => setLegalNotes(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button type="button" onClick={() => void run("record_legal_review", { legal_notes: legalNotes })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            {t("mdrw.form.recordLegal")}
          </button>

          <div className="grid gap-2 md:grid-cols-2">
            <button type="button" onClick={() => void run("escalate_legal_compliance")} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              {t("mdrw.form.escalateNow")}
            </button>
            <button type="button" onClick={() => void run("close_under_review")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              {t("mdrw.form.closeAdmin")}
            </button>
            <button type="button" onClick={() => void run("mark_patient_accepted_discharge")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 md:col-span-2">
              {t("mdrw.form.closeDischarged")}
            </button>
          </div>

          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
