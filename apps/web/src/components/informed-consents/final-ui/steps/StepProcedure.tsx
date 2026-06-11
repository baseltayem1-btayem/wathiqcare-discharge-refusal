"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  PlusCircle,
  ShieldCheck,
  Stethoscope,
  Zap,
} from "lucide-react";
import type { ConsentStep } from "../clinical/ClinicalTypes";
import { criticalCareConsentTemplate } from "../../../../data/imc-digital-consent-templates";

interface Props {
  lang: "en" | "ar";
  onNext: () => void;
  onPrev: () => void;
  onComplete: (
    step: ConsentStep,
    ids: string[],
    payload?: Record<string, unknown>
  ) => void;
}

type ProcedureComplexity = "low" | "medium" | "high";

type ProcedureCard = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  complexity: ProcedureComplexity;
  requiresAnesthesia: boolean;
  duration: string;
  description: string;
  descriptionAr: string;
  isDigitalTemplate?: boolean;
};

const procedures: ProcedureCard[] = [
  {
    id: "IMC-MR-1363",
    code: criticalCareConsentTemplate.formCode,
    name: criticalCareConsentTemplate.title.en,
    nameAr: criticalCareConsentTemplate.title.ar,
    category: criticalCareConsentTemplate.specialty.en,
    categoryAr: criticalCareConsentTemplate.specialty.ar,
    complexity: "high",
    requiresAnesthesia: false,
    duration: "ICU stay",
    description:
      "Structured bilingual ICU consent template with selectable procedures, physician notes, refusal documentation, and future PDF rendering.",
    descriptionAr:
      "قالب موافقة رقمي ثنائي اللغة للعناية الحرجة يتضمن إجراءات قابلة للاختيار، ملاحظات الطبيب، توثيق الرفض، وإصدار PDF لاحقًا.",
    isDigitalTemplate: true,
  },
  {
    id: "P001",
    code: "47562",
    name: "Laparoscopic Cholecystectomy",
    nameAr: "استئصال المرارة بالمنظار",
    category: "General Surgery",
    categoryAr: "الجراحة العامة",
    complexity: "medium",
    requiresAnesthesia: true,
    duration: "45–90 min",
    description:
      "Minimally invasive removal of the gallbladder using laparoscopic technique.",
    descriptionAr:
      "إزالة المرارة بأسلوب طفيف التوغل باستخدام تقنية المنظار.",
  },
  {
    id: "P002",
    code: "43239",
    name: "Upper GI Endoscopy",
    nameAr: "تنظير الجهاز الهضمي العلوي",
    category: "Gastroenterology",
    categoryAr: "الجهاز الهضمي",
    complexity: "low",
    requiresAnesthesia: false,
    duration: "15–30 min",
    description:
      "Endoscopic examination of the esophagus, stomach, and duodenum.",
    descriptionAr:
      "فحص بالمنظار للمريء والمعدة والاثني عشر.",
  },
];

const relatedConsents = [
  {
    id: "RC1",
    name: "Surgical Consent",
    nameAr: "موافقة جراحية",
    required: true,
  },
  {
    id: "RC2",
    name: "General Anesthesia Consent",
    nameAr: "موافقة التخدير العام",
    required: true,
  },
  {
    id: "RC3",
    name: "Blood Transfusion Consent",
    nameAr: "موافقة نقل الدم",
    required: false,
  },
  {
    id: "RC4",
    name: "Telemedicine / Data Sharing Consent",
    nameAr: "موافقة الطب عن بُعد / مشاركة البيانات",
    required: false,
  },
  {
    id: "RC5",
    name: "Photography / Teaching Consent",
    nameAr: "موافقة التصوير / التعليم",
    required: false,
  },
];

const complexityColors: Record<ProcedureComplexity, string> = {
  low: "text-emerald-700 bg-emerald-50 border-emerald-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  high: "text-red-700 bg-red-50 border-red-200",
};

function getComplexityLabel(complexity: ProcedureComplexity, lang: Props["lang"]) {
  if (lang === "en") {
    return `${complexity.charAt(0).toUpperCase()}${complexity.slice(1)} Complexity`;
  }

  if (complexity === "low") return "تعقيد منخفض";
  if (complexity === "medium") return "تعقيد متوسط";
  return "تعقيد عالٍ";
}

function getSelectedBorderClass(lang: Props["lang"]) {
  return lang === "ar"
    ? "bg-blue-50 border-r-2 border-r-[#002B5C]"
    : "bg-blue-50 border-l-2 border-l-[#002B5C]";
}

export function StepProcedure({ lang, onNext, onPrev, onComplete }: Props) {
  const [selectedProc, setSelectedProc] = useState<ProcedureCard>(procedures[0]);
  const [activeConsents, setActiveConsents] = useState<string[]>(["RC1", "RC2"]);

  const [selectedIcuProcedures, setSelectedIcuProcedures] = useState<string[]>(
    criticalCareConsentTemplate.procedures
      .filter((procedure) => procedure.isDefaultSelected)
      .map((procedure) => procedure.id)
  );

  const [icuAdmissionReason, setIcuAdmissionReason] = useState("");
  const [additionalProcedure, setAdditionalProcedure] = useState("");
  const [physicianAdditionalNotes, setPhysicianAdditionalNotes] = useState("");
  const [refusalEnabled, setRefusalEnabled] = useState(false);
  const [refusedProcedure, setRefusedProcedure] = useState("");
  const [refusalReason, setRefusalReason] = useState("");

  const dir = lang === "ar" ? "rtl" : "ltr";
  const isArabic = lang === "ar";
  const isCriticalCareSelected = selectedProc.isDigitalTemplate === true;

  const selectedIcuProcedureDetails = useMemo(
    () =>
      criticalCareConsentTemplate.procedures.filter((procedure) =>
        selectedIcuProcedures.includes(procedure.id)
      ),
    [selectedIcuProcedures]
  );

  const canContinue =
    !isCriticalCareSelected || selectedIcuProcedures.length > 0;

  const toggleIcuProcedure = (procedureId: string) => {
    setSelectedIcuProcedures((previous) =>
      previous.includes(procedureId)
        ? previous.filter((id) => id !== procedureId)
        : [...previous, procedureId]
    );
  };

  const toggleRelatedConsent = (consentId: string) => {
    setActiveConsents((previous) =>
      previous.includes(consentId)
        ? previous.filter((id) => id !== consentId)
        : [...previous, consentId]
    );
  };

  const handleContinue = () => {
    if (!canContinue) return;

    const digitalConsentPayload = isCriticalCareSelected
      ? {
          templateId: criticalCareConsentTemplate.id,
          formCode: criticalCareConsentTemplate.formCode,
          version: criticalCareConsentTemplate.version,
          title: criticalCareConsentTemplate.title,
          source: criticalCareConsentTemplate.source,
          selectedIcuProcedures,
          selectedIcuProcedureDetails,
          icuAdmissionReason,
          additionalProcedure,
          physicianAdditionalNotes,
          refusalEnabled,
          refusedProcedure: refusalEnabled ? refusedProcedure : "",
          refusalReason: refusalEnabled ? refusalReason : "",
          amaRequired: refusalEnabled
            ? criticalCareConsentTemplate.refusalSection.amaRequired
            : false,
          changePolicy: criticalCareConsentTemplate.audit.changePolicy,
        }
      : null;

    onComplete("procedure", ["v3", "v4", "v5"], {
      procedure: {
        id: selectedProc.id,
        code: selectedProc.code,
        name: selectedProc.name,
        nameAr: selectedProc.nameAr,
        category: selectedProc.category,
        categoryAr: selectedProc.categoryAr,
        complexity: selectedProc.complexity,
        requiresAnesthesia: selectedProc.requiresAnesthesia,
        duration: selectedProc.duration,
        description: selectedProc.description,
        descriptionAr: selectedProc.descriptionAr,
        activeConsents,
        digitalConsentTemplate: digitalConsentPayload,
      },
    });

    onNext();
  };

  return (
    <div className="p-8 space-y-6" dir={dir}>
      <div>
        <h2 className="text-[#002B5C]">
          {lang === "en"
            ? "Procedure & Consent Selection"
            : "اختيار الإجراء والموافقة"}
        </h2>
        <p className="text-sm text-[#6B7280] mt-1">
          {lang === "en"
            ? "Select the procedure and configure the consent package."
            : "اختر الإجراء وقم بتهيئة حزمة الموافقة."}
        </p>
      </div>

      <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#D8DCE3] bg-[#F4F6F9] flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-[#002B5C]" />
          <span className="text-sm font-semibold text-[#2F2F2F]">
            {lang === "en"
              ? "Recommended Procedures & Digital Templates"
              : "الإجراءات والقوالب الرقمية المقترحة"}
          </span>
          <span className={isArabic ? "text-xs text-[#6B7280] mr-auto" : "text-xs text-[#6B7280] ml-auto"}>
            {lang === "en" ? "Based on encounter" : "بناءً على الزيارة"}
          </span>
        </div>

        <div className="divide-y divide-[#EEF1F5]">
          {procedures.map((proc) => {
            const selected = selectedProc.id === proc.id;

            return (
              <button
                type="button"
                key={proc.id}
                onClick={() => setSelectedProc(proc)}
                className={`w-full px-5 py-4 flex items-start gap-4 cursor-pointer transition-colors text-start ${
                  selected
                    ? getSelectedBorderClass(lang)
                    : "hover:bg-[#F4F6F9]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                    selected
                      ? "border-[#002B5C] bg-[#002B5C]"
                      : "border-[#D8DCE3] bg-white"
                  }`}
                >
                  {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-start gap-3 flex-wrap">
                    <span className="font-medium text-[#2F2F2F]">
                      {lang === "en" ? proc.name : proc.nameAr}
                    </span>

                    {proc.isDigitalTemplate && (
                      <span className="text-xs bg-[#C9A13B]/10 border border-[#C9A13B]/30 text-[#8A6A12] rounded px-1.5 py-0.5 flex items-center gap-1 font-medium">
                        <ShieldCheck className="w-3 h-3" />
                        {lang === "en"
                          ? "IMC Digital Template"
                          : "قالب رقمي معتمد للمركز"}
                      </span>
                    )}

                    <span
                      className={`text-xs border rounded px-1.5 py-0.5 font-medium ${complexityColors[proc.complexity]}`}
                    >
                      {getComplexityLabel(proc.complexity, lang)}
                    </span>

                    {proc.requiresAnesthesia && (
                      <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {lang === "en"
                          ? "Anesthesia Required"
                          : "يتطلب تخديرًا"}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4 mt-1.5 flex-wrap">
                    <span className="text-xs text-[#6B7280]">
                      Code: {proc.code}
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      {lang === "en" ? proc.category : proc.categoryAr}
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      {proc.duration}
                    </span>
                  </div>

                  <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                    {lang === "en" ? proc.description : proc.descriptionAr}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {isCriticalCareSelected && (
        <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-[#D8DCE3] bg-[#F4F6F9]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#002B5C]" />
              <span className="text-sm font-semibold text-[#2F2F2F]">
                {lang === "en"
                  ? "Critical Care Digital Consent Builder"
                  : "بناء موافقة الرعاية الحرجة الرقمية"}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              {criticalCareConsentTemplate.formCode} ·{" "}
              {criticalCareConsentTemplate.version} ·{" "}
              {lang === "en"
                ? "Structured bilingual template"
                : "قالب ثنائي اللغة مهيكل"}
            </p>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-[#2F2F2F]">
                  {lang === "en"
                    ? "ICU admission reason / clinical indication"
                    : "سبب الدخول إلى وحدة العناية المركزة / الداعي الطبي"}
                </span>
                <textarea
                  value={icuAdmissionReason}
                  onChange={(event) =>
                    setIcuAdmissionReason(event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-md border border-[#D8DCE3] px-3 py-2 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
                  placeholder={
                    lang === "en"
                      ? "Enter the clinical indication..."
                      : "أدخل الداعي الطبي..."
                  }
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-[#2F2F2F]">
                  {lang === "en"
                    ? "Physician additional notes"
                    : "ملاحظات الطبيب الإضافية"}
                </span>
                <textarea
                  value={physicianAdditionalNotes}
                  onChange={(event) =>
                    setPhysicianAdditionalNotes(event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-md border border-[#D8DCE3] px-3 py-2 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
                  placeholder={
                    lang === "en"
                      ? "Optional notes..."
                      : "ملاحظات اختيارية..."
                  }
                />
              </label>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-[#1976D2]" />
                <h3 className="text-sm font-semibold text-[#2F2F2F]">
                  {lang === "en"
                    ? "ICU Procedures Included in Consent"
                    : "إجراءات العناية المركزة المشمولة في الموافقة"}
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {criticalCareConsentTemplate.procedures.map((procedure) => {
                  const checked = selectedIcuProcedures.includes(procedure.id);

                  return (
                    <button
                      type="button"
                      key={procedure.id}
                      onClick={() => toggleIcuProcedure(procedure.id)}
                      className={`text-start rounded-lg border p-3 transition-colors ${
                        checked
                          ? "border-[#002B5C] bg-blue-50"
                          : "border-[#D8DCE3] bg-white hover:bg-[#F4F6F9]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 ${
                            checked
                              ? "bg-[#002B5C] border-[#002B5C]"
                              : "border-[#D8DCE3] bg-white"
                          }`}
                        >
                          {checked && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-medium text-[#2F2F2F]">
                            {lang === "en"
                              ? procedure.title.en
                              : procedure.title.ar}
                          </div>
                          <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                            {lang === "en"
                              ? procedure.uses.en
                              : procedure.uses.ar}
                          </p>
                          <p className="text-xs text-red-700 mt-1 leading-relaxed">
                            {lang === "en"
                              ? `Risks: ${procedure.risks.en}`
                              : `المخاطر: ${procedure.risks.ar}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!canContinue && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
                  <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-800 leading-relaxed">
                    {lang === "en"
                      ? "Select at least one ICU procedure before continuing."
                      : "يرجى اختيار إجراء واحد على الأقل من إجراءات العناية المركزة قبل المتابعة."}
                  </p>
                </div>
              )}
            </div>

            <label className="space-y-1.5 block">
              <span className="text-sm font-medium text-[#2F2F2F] flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#4B9CD3]" />
                {lang === "en"
                  ? "Additional procedure requested by physician"
                  : "إجراء إضافي يطلبه الطبيب"}
              </span>
              <textarea
                value={additionalProcedure}
                onChange={(event) =>
                  setAdditionalProcedure(event.target.value)
                }
                rows={3}
                className="w-full rounded-md border border-[#D8DCE3] px-3 py-2 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
                placeholder={
                  lang === "en"
                    ? "Optional additional procedure..."
                    : "إجراء إضافي اختياري..."
                }
              />
            </label>

            <div className="rounded-lg border border-[#D8DCE3] bg-[#F9FAFB] p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={refusalEnabled}
                  onChange={(event) => setRefusalEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-[#D8DCE3] text-[#002B5C]"
                />
                <span className="text-sm font-medium text-[#2F2F2F]">
                  {lang === "en"
                    ? "Any procedure refused?"
                    : "هل تم رفض أي إجراء؟"}
                </span>
              </label>

              {refusalEnabled && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[#2F2F2F]">
                      {lang === "en"
                        ? "Refused procedure"
                        : "الإجراء المرفوض"}
                    </span>
                    <input
                      value={refusedProcedure}
                      onChange={(event) =>
                        setRefusedProcedure(event.target.value)
                      }
                      className="w-full rounded-md border border-[#D8DCE3] px-3 py-2 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[#2F2F2F]">
                      {lang === "en" ? "Reason for refusal" : "سبب الرفض"}
                    </span>
                    <input
                      value={refusalReason}
                      onChange={(event) =>
                        setRefusalReason(event.target.value)
                      }
                      className="w-full rounded-md border border-[#D8DCE3] px-3 py-2 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
                    />
                  </label>

                  <div className="lg:col-span-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {lang === "en"
                        ? criticalCareConsentTemplate.refusalSection.text.en
                        : criticalCareConsentTemplate.refusalSection.text.ar}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[#D8DCE3] bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[#4B9CD3]" />
                <h3 className="text-sm font-semibold text-[#2F2F2F]">
                  {lang === "en"
                    ? "Bilingual Preview"
                    : "معاينة ثنائية اللغة"}
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-md border border-[#EEF1F5] p-3">
                  <h4 className="text-xs font-semibold text-[#002B5C] mb-2">
                    English
                  </h4>
                  <p className="text-xs text-[#2F2F2F] leading-relaxed">
                    {criticalCareConsentTemplate.introduction[0].en}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-2">
                    Selected ICU procedures: {selectedIcuProcedureDetails.length}
                  </p>
                </div>

                <div
                  className="rounded-md border border-[#EEF1F5] p-3"
                  dir="rtl"
                >
                  <h4 className="text-xs font-semibold text-[#002B5C] mb-2">
                    العربية
                  </h4>
                  <p className="text-xs text-[#2F2F2F] leading-relaxed">
                    {criticalCareConsentTemplate.introduction[0].ar}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-2">
                    عدد إجراءات العناية المختارة:{" "}
                    {selectedIcuProcedureDetails.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isCriticalCareSelected && (
        <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-[#D8DCE3] bg-[#F4F6F9]">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#4B9CD3]" />
              <span className="text-sm font-semibold text-[#2F2F2F]">
                {lang === "en"
                  ? "Consent Package Configuration"
                  : "تهيئة حزمة الموافقة"}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              {lang === "en"
                ? "Select which consent forms to include in this package."
                : "اختر نماذج الموافقة التي ستدرج في هذه الحزمة."}
            </p>
          </div>

          <div className="p-4 space-y-2">
            {relatedConsents.map((rc) => {
              const selected = activeConsents.includes(rc.id);

              return (
                <button
                  type="button"
                  key={rc.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded border cursor-pointer transition-colors text-start ${
                    selected
                      ? "border-[#002B5C] bg-blue-50"
                      : "border-[#D8DCE3] bg-white hover:bg-[#F4F6F9]"
                  }`}
                  onClick={() => toggleRelatedConsent(rc.id)}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                      selected
                        ? "bg-[#002B5C] border-[#002B5C]"
                        : "border-[#D8DCE3] bg-white"
                    }`}
                  >
                    {selected && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </div>

                  <div className="flex-1">
                    <span className="text-sm text-[#2F2F2F]">
                      {lang === "en" ? rc.name : rc.nameAr}
                    </span>
                  </div>

                  {rc.required && (
                    <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-1.5 py-0.5 rounded font-medium">
                      {lang === "en" ? "Required" : "إلزامي"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedProc.requiresAnesthesia && !activeConsents.includes("RC2") && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-xs text-amber-800">
                  {lang === "en"
                    ? "This procedure requires general anesthesia — anesthesia consent is mandatory."
                    : "يتطلب هذا الإجراء تخديرًا عامًا — موافقة التخدير إلزامية."}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors"
        >
          {isArabic ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
          {lang === "en" ? "Back" : "رجوع"}
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className={`flex items-center gap-2 px-6 py-2.5 rounded text-sm font-medium transition-colors ${
            canContinue
              ? "bg-[#002B5C] hover:bg-blue-900 text-white"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          {lang === "en" ? "Continue" : "متابعة"}
          {isArabic ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}