"use client";

import { ChangeEvent } from "react";
import { useI18n } from "@/i18n/I18nProvider";

type WorkflowDraft = {
  patient_name: string;
  patient_id_number: string;
  medical_record_number: string;
  room_number: string;
  attending_physician: string;
  refusal_reason: string;
  discussion_summary: string;
  social_administrative_interventions: string;
  forms_issued: string;
  insurance_coverage_status: string;
  discharge_decision_at: string;
};

type Props = {
  data: WorkflowDraft;
  onChange: (next: WorkflowDraft) => void;
};

export type { WorkflowDraft };

export default function WorkflowDataForm({ data, onChange }: Props) {
  const { t } = useI18n();

  function updateField<K extends keyof WorkflowDraft>(key: K, value: WorkflowDraft[K]) {
    onChange({ ...data, [key]: value });
  }

  function handleInput<K extends keyof WorkflowDraft>(key: K) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(key, event.target.value as WorkflowDraft[K]);
    };
  }

  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <h2 className="text-base font-semibold text-slate-900">{t("dataCapture.title")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("dataCapture.subtitle")}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("field.patientName")}</span>
          <input
            value={data.patient_name}
            onChange={handleInput("patient_name")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("field.idIqama")}</span>
          <input
            value={data.patient_id_number}
            onChange={handleInput("patient_id_number")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("field.patientMrn")}</span>
          <input
            value={data.medical_record_number}
            onChange={handleInput("medical_record_number")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("field.roomNumber")}</span>
          <input
            value={data.room_number}
            onChange={handleInput("room_number")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("field.attendingPhysician")}</span>
          <input
            value={data.attending_physician}
            onChange={handleInput("attending_physician")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("field.dischargeDecisionDate")}</span>
          <input
            type="datetime-local"
            value={data.discharge_decision_at}
            onChange={handleInput("discharge_decision_at")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("field.refusalReason")}</span>
          <textarea
            value={data.refusal_reason}
            onChange={handleInput("refusal_reason")}
            className="mt-1 h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("field.discussionSummary")}</span>
          <textarea
            value={data.discussion_summary}
            onChange={handleInput("discussion_summary")}
            className="mt-1 h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {t("field.socialAdministrativeInterventions")}
          </span>
          <textarea
            value={data.social_administrative_interventions}
            onChange={handleInput("social_administrative_interventions")}
            className="mt-1 h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("field.formsIssued")}</span>
          <textarea
            value={data.forms_issued}
            readOnly
            className="mt-1 h-16 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 outline-none"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("field.insuranceCoverageStatus")}</span>
          <input
            value={data.insurance_coverage_status}
            onChange={handleInput("insurance_coverage_status")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
      </div>
    </section>
  );
}
