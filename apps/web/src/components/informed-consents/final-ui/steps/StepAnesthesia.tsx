"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Activity,
  Bell,
  Ban,
} from "lucide-react";
import { ClinicalBadge } from "../clinical/ClinicalBadge";
import type { ConsentStep } from "../clinical/ClinicalTypes";

interface Props {
  lang: "en" | "ar";
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[]) => void;
}

type Applicability = "applies" | "not-applicable";

const anesthesiaTypes = [
  {
    id: "GA",
    label: "General Anesthesia",
    labelAr: "\u062a\u062e\u062f\u064a\u0631 \u0639\u0627\u0645",
    desc: "Patient fully unconscious. Requires airway management.",
    descAr: "\u064a\u0643\u0648\u0646 \u0627\u0644\u0645\u0631\u064a\u0636 \u0641\u064a \u062d\u0627\u0644\u0629 \u0641\u0642\u062f\u0627\u0646 \u0648\u0639\u064a \u0643\u0627\u0645\u0644 \u0648\u064a\u062a\u0637\u0644\u0628 \u0625\u062f\u0627\u0631\u0629 \u0645\u062c\u0631\u0649 \u0627\u0644\u0647\u0648\u0627\u0621.",
  },
  {
    id: "SA",
    label: "Spinal Anesthesia",
    labelAr: "\u062a\u062e\u062f\u064a\u0631 \u0634\u0648\u0643\u064a",
    desc: "Regional block via subarachnoid injection.",
    descAr: "\u062a\u062e\u062f\u064a\u0631 \u0646\u0627\u062d\u064a \u0639\u0628\u0631 \u0627\u0644\u062d\u0642\u0646 \u062d\u0648\u0644 \u0627\u0644\u062d\u0628\u0644 \u0627\u0644\u0634\u0648\u0643\u064a.",
  },
  {
    id: "EP",
    label: "Epidural Anesthesia",
    labelAr: "\u062a\u062e\u062f\u064a\u0631 \u0641\u0648\u0642 \u0627\u0644\u062c\u0627\u0641\u064a\u0629",
    desc: "Continuous epidural catheter placement.",
    descAr: "\u0625\u062f\u062e\u0627\u0644 \u0642\u0633\u0637\u0631\u0629 \u0641\u0648\u0642 \u0627\u0644\u062c\u0627\u0641\u064a\u0629 \u0644\u0644\u062a\u062e\u062f\u064a\u0631 \u0627\u0644\u0645\u0633\u062a\u0645\u0631.",
  },
  {
    id: "LA",
    label: "Local Anesthesia + Sedation",
    labelAr: "\u062a\u062e\u062f\u064a\u0631 \u0645\u0648\u0636\u0639\u064a + \u062a\u0647\u062f\u0626\u0629",
    desc: "Local block with conscious sedation.",
    descAr: "\u062a\u062e\u062f\u064a\u0631 \u0645\u0648\u0636\u0639\u064a \u0645\u0639 \u062a\u0647\u062f\u0626\u0629 \u0648\u0627\u0639\u064a\u0629.",
  },
];

const phases = [
  {
    key: "pre",
    icon: Clock,
    label: "Pre-Anesthesia Evaluation",
    labelAr: "\u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u0642\u0628\u0644 \u0627\u0644\u062a\u062e\u062f\u064a\u0631",
  },
  {
    key: "intra",
    icon: Activity,
    label: "Intraoperative Plan",
    labelAr: "\u0627\u0644\u062e\u0637\u0629 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0625\u062c\u0631\u0627\u0621",
  },
  {
    key: "post",
    icon: Shield,
    label: "Post-Anesthesia Recovery",
    labelAr: "\u0627\u0644\u062a\u0639\u0627\u0641\u064a \u0628\u0639\u062f \u0627\u0644\u062a\u062e\u062f\u064a\u0631",
  },
] as const;

export function StepAnesthesia({ lang, onNext, onPrev, onComplete }: Props) {
  const [applicability, setApplicability] = useState<Applicability>("not-applicable");
  const [selectedType, setSelectedType] = useState("GA");
  const [activePhase, setActivePhase] = useState<(typeof phases)[number]["key"]>("pre");
  const [fastingAcknowledged, setFastingAcknowledged] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const isAr = lang === "ar";
  const anesthesiaApplies = applicability === "applies";

  const handleComplete = () => {
    const validationIds = anesthesiaApplies
      ? ["anesthesia-applies", `anesthesia-type-${selectedType}`, "anesthesiologist-review-required"]
      : ["anesthesia-not-applicable"];

    onComplete("anesthesia", validationIds);
    onNext();
  };

  const handleNotifyAnesthesiologist = () => {
    setNotificationSent(true);
  };

  return (
    <div className="p-8 space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#002B5C]">
            {isAr ? "\u0648\u062d\u062f\u0629 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Anesthesia Module"}
          </h2>
          <p className="text-sm text-[#6B7280] mt-1">
            {isAr
              ? "\u062a\u062d\u062f\u064a\u062f \u0645\u0627 \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0645\u0646\u0637\u0628\u0642\u064b\u0627 \u0648\u062a\u0648\u062c\u064a\u0647 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0633\u0631\u064a\u0631\u064a \u0648\u0627\u0644\u062a\u0648\u0642\u064a\u0639\u064a \u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u0630\u0644\u0643."
              : "Determine whether anesthesia applies and route the clinical/signature workflow accordingly."}
          </p>
        </div>

        <ClinicalBadge
          variant={anesthesiaApplies ? "warning" : "ready"}
          label={
            anesthesiaApplies
              ? isAr
                ? "\u064a\u0644\u0632\u0645 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631"
                : "Anesthesiologist Required"
              : isAr
                ? "\u063a\u064a\u0631 \u0645\u0646\u0637\u0628\u0642"
                : "Not Applicable"
          }
          dot
        />
      </div>

      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
        <h3 className="text-[#2F2F2F] mb-4">
          {isAr ? "\u0647\u0644 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0645\u0646\u0637\u0628\u0642 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621\u061f" : "Does anesthesia apply to this procedure?"}
        </h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setApplicability("not-applicable");
              setNotificationSent(false);
            }}
            className={`rounded-lg border p-4 text-start transition-colors ${
              !anesthesiaApplies
                ? "border-emerald-500 bg-emerald-50"
                : "border-[#D8DCE3] hover:bg-[#F4F6F9]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-emerald-700" />
              <span className="font-semibold text-[#2F2F2F]">
                {isAr ? "\u063a\u064a\u0631 \u0645\u0646\u0637\u0628\u0642" : "Not Applicable"}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              {isAr
                ? "\u0644\u0627 \u064a\u062a\u0637\u0644\u0628 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u062a\u062e\u062f\u064a\u0631\u064b\u0627\u060c \u0648\u064a\u0645\u0643\u0646 \u0644\u0644\u0637\u0628\u064a\u0628 \u0627\u0644\u0645\u0639\u0627\u0644\u062c \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629."
                : "This procedure does not require anesthesia. The treating physician may continue the workflow."}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setApplicability("applies")}
            className={`rounded-lg border p-4 text-start transition-colors ${
              anesthesiaApplies
                ? "border-[#002B5C] bg-blue-50"
                : "border-[#D8DCE3] hover:bg-[#F4F6F9]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#002B5C]" />
              <span className="font-semibold text-[#2F2F2F]">
                {isAr ? "\u064a\u0646\u0637\u0628\u0642" : "Applies"}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              {isAr
                ? "\u064a\u062a\u0637\u0644\u0628 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u062a\u0648\u0642\u064a\u0639 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0642\u0628\u0644 \u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629."
                : "This procedure requires anesthesiologist review and signature before final consent generation."}
            </p>
          </button>
        </div>
      </div>

      {!anesthesiaApplies ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">
                {isAr
                  ? "\u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u063a\u064a\u0631 \u0645\u0646\u0637\u0628\u0642 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621"
                  : "Anesthesia is not applicable for this procedure"}
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                {isAr
                  ? "\u0633\u064a\u062a\u0645 \u062a\u062c\u0627\u0648\u0632 \u062a\u0648\u0642\u064a\u0639 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631\u060c \u0648\u0633\u064a\u0633\u062a\u0645\u0631 \u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0628\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0645\u0631\u064a\u0636 \u0648\u0627\u0644\u0637\u0628\u064a\u0628 \u0627\u0644\u0645\u0639\u0627\u0644\u062c \u0641\u0642\u0637."
                  : "The anesthesiologist signature will not be required. The consent will continue with patient and treating physician signatures only."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
            <h3 className="text-[#2F2F2F] mb-4">
              {isAr ? "\u0646\u0648\u0639 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Anesthesia Type"}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {anesthesiaTypes.map((at) => (
                <button
                  type="button"
                  key={at.id}
                  onClick={() => setSelectedType(at.id)}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors text-start ${
                    selectedType === at.id
                      ? "border-[#002B5C] bg-blue-50"
                      : "border-[#D8DCE3] hover:bg-[#F4F6F9]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedType === at.id ? "border-[#002B5C]" : "border-[#D8DCE3]"
                      }`}
                    >
                      {selectedType === at.id && <div className="w-2 h-2 rounded-full bg-[#002B5C]" />}
                    </div>
                    <span className="font-medium text-sm text-[#2F2F2F]">
                      {isAr ? at.labelAr : at.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1.5">
                    {isAr ? at.descAr : at.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
            <div className="flex border-b border-[#D8DCE3]">
              {phases.map((phase) => (
                <button
                  key={phase.key}
                  type="button"
                  onClick={() => setActivePhase(phase.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activePhase === phase.key
                      ? "border-[#002B5C] text-[#002B5C] bg-blue-50/50"
                      : "border-transparent text-[#6B7280] hover:text-[#2F2F2F]"
                  }`}
                >
                  <phase.icon className="w-4 h-4" />
                  {isAr ? phase.labelAr : phase.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activePhase === "pre" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">
                        {isAr ? "\u062a\u0635\u0646\u064a\u0641 ASA" : "ASA Classification"}
                      </label>
                      <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                        <option>ASA I - Normal healthy patient</option>
                        <option>ASA II - Mild systemic disease</option>
                        <option>ASA III - Severe systemic disease</option>
                        <option>ASA IV - Life-threatening disease</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">
                        {isAr ? "\u062a\u0642\u064a\u064a\u0645 \u0645\u062c\u0631\u0649 \u0627\u0644\u0647\u0648\u0627\u0621" : "Airway Assessment (Mallampati)"}
                      </label>
                      <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                        <option>Class I - Full visibility</option>
                        <option>Class II - Partial uvula visible</option>
                        <option>Class III - Soft palate visible</option>
                        <option>Class IV - Hard palate only</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-800">
                        {isAr ? "\u062a\u0639\u0644\u064a\u0645\u0627\u062a \u0627\u0644\u0635\u064a\u0627\u0645 (NPO)" : "Fasting Instructions (NPO)"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm mb-3 md:grid-cols-3">
                      {[
                        { item: isAr ? "\u0637\u0639\u0627\u0645 \u0635\u0644\u0628" : "Solid food", time: "8 hours" },
                        { item: isAr ? "\u0633\u0648\u0627\u0626\u0644 \u0635\u0627\u0641\u064a\u0629" : "Clear liquids", time: "2 hours" },
                        { item: isAr ? "\u062d\u0644\u064a\u0628 \u0627\u0644\u0623\u0645" : "Breast milk", time: "4 hours" },
                      ].map((f) => (
                        <div key={f.item} className="bg-white border border-amber-200 rounded p-2.5 text-center">
                          <div className="text-amber-800 font-semibold">{f.time}</div>
                          <div className="text-xs text-amber-700 mt-0.5">{f.item}</div>
                        </div>
                      ))}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fastingAcknowledged}
                        onChange={(event) => setFastingAcknowledged(event.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-600"
                      />
                      <span className="text-xs text-amber-800">
                        {isAr
                          ? "\u0633\u062a\u062a\u0636\u0645\u0646 \u062d\u0632\u0645\u0629 \u062a\u062b\u0642\u064a\u0641 \u0627\u0644\u0645\u0631\u064a\u0636 \u062a\u0639\u0644\u064a\u0645\u0627\u062a \u0627\u0644\u0635\u064a\u0627\u0645."
                          : "Fasting instructions will be included in the patient education package."}
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">
                      {isAr ? "\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0633\u064a\u0629 \u0644\u0644\u062a\u062e\u062f\u064a\u0631" : "Allergy Notes for Anesthesia"}
                    </label>
                    <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="text-xs text-red-800">
                        {isAr
                          ? "\u064a\u062c\u0628 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u062d\u0633\u0627\u0633\u064a\u0627\u062a \u0648\u0639\u062f\u0645 \u0648\u062c\u0648\u062f \u062a\u0641\u0627\u0639\u0644 \u0645\u062a\u0642\u0627\u0637\u0639 \u0645\u0639 \u0639\u0648\u0627\u0645\u0644 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0627\u0644\u0645\u062e\u0637\u0637\u0629."
                          : "Confirm allergies and no cross-reactivity with planned anesthetic agents."}
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder={isAr ? "\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629 \u0644\u0644\u062a\u062e\u062f\u064a\u0631..." : "Additional anesthesia notes..."}
                      className={`w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] resize-none ${isAr ? "text-right" : ""}`}
                      dir={dir}
                    />
                  </div>
                </div>
              )}

              {activePhase === "intra" && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">
                      {isAr ? "\u062e\u0637\u0629 \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629" : "Monitoring Plan"}
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {["ECG", "SpO2", "NIBP", "ETCO2", "Temperature", "Neuromuscular", "Arterial line"].map((item) => (
                        <span key={item} className="border border-[#D8DCE3] rounded px-2.5 py-1 text-xs text-[#2F2F2F] bg-[#F4F6F9]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">
                      {isAr ? "\u0645\u062e\u0627\u0637\u0631 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0627\u0644\u0648\u0627\u062c\u0628 \u0625\u0641\u0635\u0627\u062d\u0647\u0627" : "Anesthesia Risks to Disclose"}
                    </label>
                    <div className="space-y-2">
                      {[
                        { risk: isAr ? "\u0627\u0644\u063a\u062b\u064a\u0627\u0646 \u0648\u0627\u0644\u062a\u0642\u064a\u0624" : "Nausea and vomiting", severity: "warning" as const },
                        { risk: isAr ? "\u0627\u0644\u062a\u0647\u0627\u0628 \u0627\u0644\u062d\u0644\u0642 \u0645\u0646 \u0627\u0644\u062a\u0646\u0628\u064a\u0628" : "Sore throat from intubation", severity: "warning" as const },
                        { risk: isAr ? "\u0625\u0635\u0627\u0628\u0629 \u0627\u0644\u0623\u0633\u0646\u0627\u0646" : "Dental injury", severity: "info" as const },
                        { risk: isAr ? "\u0627\u0644\u0627\u0633\u062a\u064a\u0642\u0627\u0638 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Awareness during anesthesia", severity: "critical" as const },
                        { risk: isAr ? "\u062a\u0641\u0627\u0639\u0644 \u062a\u062d\u0633\u0633\u064a \u0645\u0639 \u0639\u0648\u0627\u0645\u0644 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Allergic reaction to anesthetic agents", severity: "critical" as const },
                      ].map((item) => (
                        <div key={item.risk} className="flex items-center gap-3 p-2.5 border border-[#D8DCE3] rounded bg-[#F8F9FB]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-xs text-[#2F2F2F] flex-1">{item.risk}</span>
                          <ClinicalBadge
                            variant={item.severity}
                            label={item.severity === "critical" ? (isAr ? "\u062d\u0631\u062c" : "Critical") : item.severity === "warning" ? (isAr ? "\u062a\u0646\u0628\u064a\u0647" : "Warning") : "Info"}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePhase === "post" && (
                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">
                    {isAr ? "\u062a\u0639\u0644\u064a\u0645\u0627\u062a \u0645\u0627 \u0628\u0639\u062f \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0644\u0644\u0645\u0631\u064a\u0636" : "Post-Anesthesia Instructions for Patient"}
                  </label>
                  <textarea
                    rows={4}
                    defaultValue={
                      isAr
                        ? "\u0639\u062f\u0645 \u0627\u0644\u0642\u064a\u0627\u062f\u0629 \u0623\u0648 \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0622\u0644\u0627\u062a \u0644\u0645\u062f\u0629 24 \u0633\u0627\u0639\u0629. \u064a\u062c\u0628 \u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0645\u0631\u0627\u0641\u0642 \u0628\u0627\u0644\u063a \u0645\u0633\u0624\u0648\u0644 \u0628\u0639\u062f \u0627\u0644\u0625\u062c\u0631\u0627\u0621."
                        : "Do not drive or operate machinery for 24 hours. A responsible adult should accompany you after the procedure."
                    }
                    className={`w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] resize-none ${isAr ? "text-right" : ""}`}
                    dir={dir}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#D8DCE3] rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#2F2F2F]">
                {isAr ? "\u0645\u0631\u0627\u062c\u0639\u0629 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Anesthesiologist Review"}
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {isAr
                  ? "\u064a\u062c\u0628 \u0625\u0634\u0639\u0627\u0631 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0644\u0627\u0633\u062a\u0643\u0645\u0627\u0644 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u0627\u0644\u062a\u0648\u0642\u064a\u0639 \u0642\u0628\u0644 \u0627\u0644\u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064a."
                  : "The anesthesiologist must review and sign before final generation."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNotifyAnesthesiologist}
              className="inline-flex items-center justify-center gap-2 rounded border border-[#002B5C] px-3 py-1.5 text-xs font-medium text-[#002B5C] transition-colors hover:bg-blue-50"
            >
              <Bell className="h-3.5 w-3.5" />
              {notificationSent
                ? isAr
                  ? "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631"
                  : "Notification Sent"
                : isAr
                  ? "\u0625\u0634\u0639\u0627\u0631 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631"
                  : "Notify Anesthesiologist"}
            </button>
          </div>
        </>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {isAr ? "\u0631\u062c\u0648\u0639" : "Back"}
        </button>

        <button
          type="button"
          onClick={handleComplete}
          className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors"
        >
          {isAr ? "\u0645\u062a\u0627\u0628\u0639\u0629 \u0625\u0644\u0649 \u0627\u0644\u0625\u0641\u0635\u0627\u062d\u0627\u062a" : "Continue to Disclosures"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
