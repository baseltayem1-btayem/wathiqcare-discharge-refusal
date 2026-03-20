"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { postRefusalWorkflowAction } from "@/lib/services/medicalDischargeRefusal.service";

export default function WitnessDocumentationPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { t } = useI18n();
  const [witness1Name, setWitness1Name] = useState("");
  const [witness1Role, setWitness1Role] = useState("");
  const [witness2Name, setWitness2Name] = useState("");
  const [witness2Role, setWitness2Role] = useState("");
  const [message, setMessage] = useState("");

  async function submitWitnessForm() {
    setMessage("");
    try {
      await postRefusalWorkflowAction(caseId, "generate_refusal_form", {
        witness_mode: true,
        witness1_name: witness1Name,
        witness1_role: witness1Role,
        witness2_name: witness2Name,
        witness2_role: witness2Role,
      });
      setMessage(t("mdrw.form.saved"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("mdrw.error.saveFailed"));
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={t("mdrw.screens.witness")}
        subtitle={t("mdrw.form.witnessSubtitle")}
        workflowCaseNav={{
          caseId,
          currentStage: "refusal_form",
          escalationRequired: false,
        }}
        actions={
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">
            {t("mdrw.case.backCase")}
          </Link>
        }
      >
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="block text-sm text-slate-700">{t("mdrw.form.witness1Name")}</label>
          <input value={witness1Name} onChange={(e) => setWitness1Name(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <label className="block text-sm text-slate-700">{t("mdrw.form.witness1Role")}</label>
          <input value={witness1Role} onChange={(e) => setWitness1Role(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <label className="block text-sm text-slate-700">{t("mdrw.form.witness2Name")}</label>
          <input value={witness2Name} onChange={(e) => setWitness2Name(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <label className="block text-sm text-slate-700">{t("mdrw.form.witness2Role")}</label>
          <input value={witness2Role} onChange={(e) => setWitness2Role(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button type="button" onClick={() => void submitWitnessForm()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {t("mdrw.form.saveContinue")}
          </button>
          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
