"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { postRefusalWorkflowAction } from "@/lib/services/medicalDischargeRefusal.service";

export default function SocialServicesInterventionFormPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { t } = useI18n();
  const [patientAffairsNotes, setPatientAffairsNotes] = useState("");
  const [socialServicesNotes, setSocialServicesNotes] = useState("");
  const [supportProvided, setSupportProvided] = useState("");
  const [message, setMessage] = useState("");

  async function submitForm() {
    setMessage("");
    try {
      await postRefusalWorkflowAction(caseId, "refer_social_services", {
        patient_affairs_notes: patientAffairsNotes,
        social_services_notes: socialServicesNotes,
        social_administrative_interventions: supportProvided,
      });
      setMessage(t("mdrw.form.saved"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("mdrw.error.saveFailed"));
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={t("mdrw.screens.socialServices")}
        subtitle={t("mdrw.form.socialSubtitle")}
        actions={
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">
            {t("mdrw.case.backCase")}
          </Link>
        }
      >
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="block text-sm text-slate-700">{t("mdrw.form.patientAffairsNotes")}</label>
          <textarea value={patientAffairsNotes} onChange={(e) => setPatientAffairsNotes(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <label className="block text-sm text-slate-700">{t("mdrw.form.socialServicesNotes")}</label>
          <textarea value={socialServicesNotes} onChange={(e) => setSocialServicesNotes(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <label className="block text-sm text-slate-700">{t("mdrw.form.supportProvided")}</label>
          <textarea value={supportProvided} onChange={(e) => setSupportProvided(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button type="button" onClick={() => void submitForm()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {t("mdrw.form.saveContinue")}
          </button>
          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
