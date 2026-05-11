"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { type PatientInfo } from "./types";

type PatientInfoCardProps = {
  patient: PatientInfo;
  collapsed: boolean;
  onToggle: () => void;
};

const CAPACITY_TONE: Record<PatientInfo["capacityStatus"], string> = {
  competent: "wc-status-ready",
  minor: "wc-status-warning",
  unconscious: "wc-status-blocked",
  "representative required": "wc-status-warning",
};

export default function PatientInfoCard({ patient, collapsed, onToggle }: PatientInfoCardProps) {
  const patientFields = [
    { label: "Patient Name", value: patient.patientName },
    { label: "MRN", value: patient.mrn },
    { label: "National ID / Iqama", value: patient.nationalId },
    { label: "Date of Birth", value: patient.dateOfBirth },
    { label: "Gender", value: `${patient.gender.ar} | ${patient.gender.en}` },
    { label: "Department", value: patient.department },
    { label: "Treating Physician", value: patient.treatingPhysician },
    { label: "Admission / Visit Number", value: patient.admissionNumber },
  ];

  return (
    <section className="wc-panel border-slate-200 bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-2 text-start">
        <div>
          <h2 className="wc-panel-heading !mb-0">بيانات المريض | Patient Information</h2>
          <p className="text-[11px] text-slate-500">Identity and care context required before consent issuance.</p>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
      </button>

      {!collapsed ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {patientFields.map((field) => (
              <div key={field.label} className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{field.label}</div>
                <div className="mt-1 text-xs font-medium text-slate-900">{field.value}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Patient Capacity Status:</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold capitalize ${CAPACITY_TONE[patient.capacityStatus]}`}>
              {patient.capacityStatus}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
