"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { postRefusalWorkflowAction } from "@/lib/services/medicalDischargeRefusal.service";

export default function InitialCommunicationFormPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { t } = useI18n();
  const [discussionSummary, setDiscussionSummary] = useState("");
  const [refusalReason, setRefusalReason] = useState("");
  const [nursingNotes, setNursingNotes] = useState("");
  const [message, setMessage] = useState("");

  async function submitForm() {
    setMessage("");
    try {
      await postRefusalWorkflowAction(caseId, "mark_patient_counseled", {
        discussion_summary: discussionSummary,
        refusal_reason: refusalReason,
        nursing_notes: nursingNotes,
      });
      setMessage(t("mdrw.form.saved"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("mdrw.error.saveFailed"));
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={t("mdrw.screens.initialCommunication")}
        subtitle={t("mdrw.form.initialCommunicationSubtitle")}
        actions={
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">
            {t("mdrw.case.backCase")}
          </Link>
        }
      >
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="block text-sm text-slate-700">{t("field.discussionSummary")}</label>
          <textarea value={discussionSummary} onChange={(e) => setDiscussionSummary(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <label className="block text-sm text-slate-700">{t("field.refusalReason")}</label>
          <textarea value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <label className="block text-sm text-slate-700">{t("mdrw.form.nursingNotes")}</label>
          <textarea value={nursingNotes} onChange={(e) => setNursingNotes(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button type="button" onClick={() => void submitForm()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {t("mdrw.form.saveContinue")}
          </button>
          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
