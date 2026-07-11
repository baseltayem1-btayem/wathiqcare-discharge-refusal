"use client";

import { Check, ListChecks } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { Readiness } from "../../hooks/useProductionWorkspace";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader } from "../WorkspaceAtoms";

function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="64" height="64" className="-rotate-90">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="#2563eb"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

const CHECK_ITEMS = [
  "Patient selected",
  "Encounter selected",
  "Procedure selected",
  "Knowledge package ready",
  "Consent field mapping verified",
  "Doctor completion fields completed",
  "Anesthesia workflow reviewed",
  "Patient signature mapped",
  "Education material ready",
  "Patient preview reviewed",
  "Patient contact available",
  "Recipient allowlisted",
  "Blockers resolved",
  "Draft approved",
];

const CHECK_ITEMS_AR = [
  "\u062a\u0645 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0645\u0631\u064a\u0636",
  "\u062a\u0645 \u0631\u0628\u0637 \u0627\u0644\u0632\u064a\u0627\u0631\u0629",
  "\u062a\u0645 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0625\u062c\u0631\u0627\u0621",
  "\u0627\u0644\u062d\u0632\u0645\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u064a\u0629 \u062c\u0627\u0647\u0632\u0629",
  "\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u062d\u0642\u0648\u0644",
  "\u062a\u0645 \u0625\u0643\u0645\u0627\u0644 \u062d\u0642\u0648\u0644 \u0627\u0644\u0637\u0628\u064a\u0628",
  "\u062a\u0645\u062a \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0633\u0627\u0631 \u0627\u0644\u062a\u062e\u062f\u064a\u0631",
  "\u062a\u0645 \u0631\u0628\u0637 \u062d\u0642\u0644 \u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0645\u0631\u064a\u0636",
  "\u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629 \u062c\u0627\u0647\u0632\u0629",
  "\u062a\u0645\u062a \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0645\u0631\u064a\u0636",
  "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u062a\u0648\u0641\u0631\u0629",
  "\u0627\u0644\u0645\u0633\u062a\u0644\u0645 \u0636\u0645\u0646 allowlist",
  "\u062a\u0645\u062a \u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0645\u0648\u0627\u0646\u0639",
  "\u062a\u0645 \u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u0645\u0633\u0648\u062f\u0629",
];

export function ReadinessChecklist({ readiness }: { readiness: Readiness }) {
  const { lang } = useI18n();
  const fieldMapping = readiness.fieldMappingReadiness;
  const doctorFields = fieldMapping?.requiredDoctorFields ?? [];
  const anesthesiaFields = fieldMapping?.requiredAnesthesiaFields ?? [];
  const patientFields = fieldMapping?.requiredPatientFields ?? [];
  const fieldMappingStatus = fieldMapping?.verificationStatus || "NOT_LOADED";

  const checks = [
    readiness.patientReady,
    readiness.encounterReady,
    readiness.procedureSelected,
    readiness.assemblyReady,
    readiness.fieldMappingVerified,
    readiness.doctorCompletionReady,
    readiness.anesthesiaMappingReady,
    readiness.patientSignatureMapped,
    readiness.educationReady,
    readiness.previewReviewed,
    readiness.contactAvailable,
    readiness.allowlisted,
    readiness.blockersResolved,
    readiness.draftApproved,
  ];

  return (
    <WorkspaceCard className="overflow-hidden">
      <WorkspaceCardHeader
        icon={<ListChecks className="size-5" />}
        title={lang === "ar" ? "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062c\u0627\u0647\u0632\u064a\u0629" : "Readiness checklist"}
        description={
          lang === "ar"
            ? "\u064a\u062c\u0628 \u0627\u0643\u062a\u0645\u0627\u0644 \u0643\u0644 \u0627\u0644\u0628\u0648\u0627\u0628\u0627\u062a \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u062c\u0644\u0633\u0629 \u0627\u0644\u062a\u0648\u0642\u064a\u0639 \u0644\u0644\u0645\u0631\u064a\u0636."
            : "Every gate must be complete before secure signing can be sent to the patient."
        }
        action={
          <WorkspaceBadge tone={readiness.sendReady ? "green" : "gold"}>
            {readiness.sendReady ? (lang === "ar" ? "\u062c\u0627\u0647\u0632 \u0644\u0644\u0625\u0631\u0633\u0627\u0644" : "Ready") : readiness.missingItems.length + " " + (lang === "ar" ? "\u0645\u062a\u0628\u0642\u064a" : "left")}
          </WorkspaceBadge>
        }
      />
      <div className="space-y-4 px-5 py-5">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="relative shrink-0">
            <ProgressRing percentage={readiness.progressPercentage} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">
              {readiness.progressPercentage}%
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {readiness.completedChecks} / {readiness.totalChecks}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {lang === "ar"
                ? "\u0627\u0644\u062a\u0642\u062f\u0645 \u0639\u0628\u0631 \u0628\u0648\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u0627\u0644\u062d\u0648\u0643\u0645\u0629 \u0648\u0627\u0644\u0625\u0631\u0633\u0627\u0644."
                : "Progress across review, governance, and dispatch gates."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Doctor completion & mapping readiness</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Field mapping must be verified before the patient receives the secure signing link.
              </p>
            </div>
            <WorkspaceBadge tone={readiness.fieldMappingVerified ? "green" : "gold"}>{fieldMappingStatus}</WorkspaceBadge>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Physician-required fields</p>
                <WorkspaceBadge tone={readiness.doctorCompletionReady ? "green" : "gold"}>
                  {readiness.doctorCompletionReady ? "OK" : doctorFields.length + " pending"}
                </WorkspaceBadge>
              </div>
              {doctorFields.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                  {doctorFields.slice(0, 6).map((field) => (
                    <li key={field.key}>- {field.section ? field.section + ". " : ""}{field.labelEn}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs leading-5 text-slate-500">No physician-required fields are pending in the current mapping snapshot.</p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Anesthesia workflow</p>
                  <WorkspaceBadge tone={readiness.anesthesiaMappingReady ? "green" : "gold"}>
                    {readiness.anesthesiaMappingReady ? "OK" : anesthesiaFields.length + " pending"}
                  </WorkspaceBadge>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {anesthesiaFields.length > 0 ? "Anesthesia review is required when applicable." : "No anesthesia mapping blocker is pending."}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient signature</p>
                  <WorkspaceBadge tone={readiness.patientSignatureMapped ? "green" : "gold"}>
                    {readiness.patientSignatureMapped ? "Mapped" : "Missing"}
                  </WorkspaceBadge>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {patientFields.length > 0 ? patientFields.length + " patient signature field(s) mapped." : "Patient signature field is not mapped yet."}
                </p>
              </div>
            </div>

            {fieldMapping?.blockers?.length ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
                <p className="font-semibold">Mapping blockers</p>
                <ul className="mt-1 space-y-1">
                  {fieldMapping.blockers.map((blocker, index) => (
                    <li key={blocker + "-" + index}>- {blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          {checks.map((done, index) => (
            <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm">
              <span className={done ? "flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white" : "flex size-5 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300"}>
                {done ? <Check className="size-3" /> : null}
              </span>
              <span className={done ? "text-slate-800" : "text-slate-500"}>{lang === "ar" ? CHECK_ITEMS_AR[index] : CHECK_ITEMS[index]}</span>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceCard>
  );
}
