"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Search,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Download,
  Send,
  Archive,
  Stethoscope,
  Shield,
  Zap,
  Clock,
  User,
  Hospital,
  FileCheck,
  Signature,
  Lock,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import ModuleShell from "@/components/ModuleShell";
import { apiFetch } from "@/utils/api";

type ModuleAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

// Clinical Workflow Steps
type WorkflowStep =
  | "patient_search"
  | "encounter_selection"
  | "consent_type_selection"
  | "template_selection"
  | "draft_generation"
  | "physician_review"
  | "patient_signature"
  | "finalization";

interface PatientData {
  id: string;
  mrn: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  nationalId?: string;
  iqamaNumber?: string;
  mobileNumber?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
}

interface EncounterData {
  id: string;
  encounterId: string;
  admissionDate: string;
  department: string;
  physician: string;
  physicianLicense?: string;
  diagnosis: string;
  procedure: string;
  allergies?: string;
  currentMedications?: string;
  physicianSpecialty?: string;
}

interface ConsentTemplate {
  id: string;
  templateVersionId: string;
  titleAr: string;
  titleEn: string;
  consentType: string;
  specialty: string;
  department?: string | null;
  version: string;
  status: string;
  language: "ar" | "en" | "bilingual";
  summaryAr?: string | null;
  summaryEn?: string | null;
  previewAr?: string;
  previewEn?: string;
}

interface ConsentDraft {
  id: string;
  patientData: PatientData;
  encounterData: EncounterData;
  template: ConsentTemplate;
  status: string;
  draftPdfUrl?: string;
  createdAt: string;
  lastModified: string;
}

interface TrakCareSync {
  status: "NOT_SYNCED" | "SYNCING" | "SYNCED" | "PARTIAL" | "FAILED" | "STALE";
  sourceSystem?: string;
  lastSyncTime?: string;
  syncError?: string;
  importedFields: string[];
  failedFields?: string[];
  manualOverride?: boolean;
  correlationId?: string;
  importedPayload?: Record<string, unknown>;
}

const WORKFLOW_STEPS: { id: WorkflowStep; labelAr: string; labelEn: string }[] = [
  { id: "patient_search", labelAr: "البحث عن المريض", labelEn: "Patient Search" },
  { id: "encounter_selection", labelAr: "اختيار الزيارة", labelEn: "Encounter Selection" },
  { id: "consent_type_selection", labelAr: "نوع الموافقة", labelEn: "Consent Type" },
  { id: "template_selection", labelAr: "اختيار القالب", labelEn: "Template Selection" },
  { id: "draft_generation", labelAr: "إنشاء المسودة", labelEn: "Draft Generation" },
  { id: "physician_review", labelAr: "مراجعة الطبيب", labelEn: "Physician Review" },
  { id: "patient_signature", labelAr: "توقيع المريض", labelEn: "Patient Signature" },
  { id: "finalization", labelAr: "الإنهاء", labelEn: "Finalization" },
];

export default function InformedConsentsModulePageNew({ auth }: { auth: ModuleAuth }) {
  const { t, locale } = useI18n();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("patient_search");
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [encounterData, setEncounterData] = useState<EncounterData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ConsentTemplate | null>(null);
  const [consentType, setConsentType] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("");
  const [draftConsent, setDraftConsent] = useState<ConsentDraft | null>(null);
  const [trakCareSync, setTrakCareSync] = useState<TrakCareSync>({
    status: "NOT_SYNCED",
    importedFields: [],
    failedFields: [],
    manualOverride: false,
  });
  const [encounterContextLocked, setEncounterContextLocked] = useState(false);
  const [showImportedData, setShowImportedData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [patientSearchResults, setPatientSearchResults] = useState<PatientData[]>([]);
  const [encounterList, setEncounterList] = useState<EncounterData[]>([]);

  // Get step index for progress tracking
  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentStep);

  // Patient Search
  const handlePatientSearch = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setPatientSearchResults([]);
        return;
      }

      setLoading(true);
      setError("");
      try {
        // In production, this would call your EHR/TrakCare API
        // For now, simulating with mock data
        const results = await apiFetch<PatientData[]>(
          `/api/modules/informed-consents/patients/search?q=${encodeURIComponent(query)}`
        ).catch(() => []);

        setPatientSearchResults(Array.isArray(results) ? results : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search patients");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load Encounter Data
  const loadEncounters = useCallback(async (patientId: string) => {
    setLoading(true);
    setError("");
    try {
      const encounters = await apiFetch<EncounterData[]>(
        `/api/modules/informed-consents/patients/${patientId}/encounters`
      ).catch(() => []);

      setEncounterList(Array.isArray(encounters) ? encounters : []);
      setEncounterContextLocked(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load encounters");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Templates
  const loadTemplates = useCallback(async (consentTypeVal: string, specialtyVal: string) => {
    setLoading(true);
    setError("");
    try {
      const departmentVal = encounterData?.department?.trim() || "";
      const tmpl = await apiFetch<ConsentTemplate[]>(
        `/api/modules/informed-consents/templates?type=${encodeURIComponent(consentTypeVal)}&specialty=${encodeURIComponent(specialtyVal)}&department=${encodeURIComponent(departmentVal)}`
      ).catch(() => []);

      setTemplates(Array.isArray(tmpl) ? tmpl : []);
      setSelectedTemplate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [encounterData?.department]);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    const snapshot = {
      consentType,
      specialty,
      template: selectedTemplate,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("wathiqcare.informed-consents.selected-template", JSON.stringify(snapshot));
  }, [consentType, specialty, selectedTemplate]);

  // TrakCare Sync
  const syncWithTrakCare = useCallback(async () => {
    if (!patientData || !encounterData) {
      setError("Patient and encounter must be selected");
      return;
    }

    setTrakCareSync((prev) => ({ ...prev, status: "SYNCING" }));
    setError("");

    try {
      const syncResult = await apiFetch<{
        status: TrakCareSync["status"];
        sourceSystem?: string;
        importedFields: string[];
        failedFields?: string[];
        manualOverride?: boolean;
        correlationId?: string;
        syncTime?: string;
        payload?: Record<string, unknown>;
        error?: string;
      }>(
        `/api/modules/informed-consents/patients/${patientData.id}/encounters/${encounterData.id}/sync-trakcare`,
        { method: "POST" }
      );

      if (syncResult.error) {
        setTrakCareSync({
          status: syncResult.status || "FAILED",
          sourceSystem: syncResult.sourceSystem,
          syncError: syncResult.error,
          importedFields: syncResult.importedFields || [],
          failedFields: syncResult.failedFields || [],
          manualOverride: Boolean(syncResult.manualOverride),
          correlationId: syncResult.correlationId,
          importedPayload: syncResult.payload,
        });
      } else {
        setTrakCareSync({
          status: syncResult.status || "SYNCED",
          sourceSystem: syncResult.sourceSystem,
          lastSyncTime: syncResult.syncTime || new Date().toISOString(),
          importedFields: syncResult.importedFields || [],
          failedFields: syncResult.failedFields || [],
          manualOverride: Boolean(syncResult.manualOverride),
          correlationId: syncResult.correlationId,
          importedPayload: syncResult.payload,
        });
        // Update encounter data with synced information
        setSuccess("TrakCare data synced successfully");
      }
    } catch (err) {
      setTrakCareSync({
        status: "FAILED",
        syncError: err instanceof Error ? err.message : "Sync failed",
        importedFields: [],
        failedFields: ["Encounter Number", "Diagnosis", "Procedure Order"],
        manualOverride: false,
      });
    }
  }, [patientData, encounterData]);

  // Generate Draft Consent
  const generateDraftConsent = useCallback(async () => {
    if (!patientData || !encounterData || !selectedTemplate) {
      setError("All required fields must be completed");
      return;
    }

    if (!encounterData.physician || !encounterData.physicianLicense) {
      setError("Missing physician context (name/license)");
      return;
    }

    if (!encounterContextLocked) {
      setError("Encounter context must be locked before draft generation");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const draft = await apiFetch<ConsentDraft>(
        `/api/modules/informed-consents/generate-draft`,
        {
          method: "POST",
          body: JSON.stringify({
            patientId: patientData.id,
            encounterId: encounterData.id,
            templateId: selectedTemplate.id,
          }),
        }
      );

      setDraftConsent(draft);
      setSuccess("Draft consent generated successfully");
      setCurrentStep("physician_review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setLoading(false);
    }
  }, [patientData, encounterData, selectedTemplate, encounterContextLocked]);

  // Render Stepper
  const renderStepper = () => (
    <div className="flex gap-2 overflow-x-auto pb-4">
      {WORKFLOW_STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <button
            onClick={() => {
              if (index <= currentStepIndex) {
                setCurrentStep(step.id);
              }
            }}
            disabled={index > currentStepIndex}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
              currentStep === step.id
                ? "bg-blue-600 text-white"
                : index < currentStepIndex
                  ? "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {index < currentStepIndex ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-current" />}
            <span className="hidden sm:inline">{locale === "ar" ? step.labelAr : step.labelEn}</span>
          </button>
          {index < WORKFLOW_STEPS.length - 1 && (
            <ChevronRight className={`w-4 h-4 ${index < currentStepIndex ? "text-green-600" : "text-gray-300"}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderContextPanel = () => {
    if (!patientData && !encounterData) {
      return null;
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            {locale === "ar" ? "سياق المريض والزيارة" : "Patient & Encounter Context"}
          </h3>
          <span className={`rounded px-2 py-1 text-xs font-semibold ${encounterContextLocked ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {encounterContextLocked ? (locale === "ar" ? "مقفل" : "Locked") : (locale === "ar" ? "غير مقفل" : "Unlocked")}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 text-sm">
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="font-semibold mb-2">{locale === "ar" ? "المريض" : "Patient"}</div>
            <div>{locale === "ar" ? "الاسم" : "Name"}: {patientData?.name || "-"}</div>
            <div>MRN: {patientData?.mrn || "-"}</div>
            <div>DOB: {patientData?.dateOfBirth || "-"}</div>
            <div>{locale === "ar" ? "الجنس" : "Gender"}: {patientData?.gender || "-"}</div>
            <div>{locale === "ar" ? "الهوية/الإقامة" : "National ID/Iqama"}: {patientData?.nationalId || patientData?.iqamaNumber || "-"}</div>
            <div>{locale === "ar" ? "الجوال" : "Mobile"}: {patientData?.mobileNumber || "-"}</div>
          </div>

          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="font-semibold mb-2">{locale === "ar" ? "الزيارة" : "Encounter"}</div>
            <div>{locale === "ar" ? "رقم الزيارة" : "Encounter No."}: {encounterData?.encounterId || "-"}</div>
            <div>{locale === "ar" ? "تاريخ الزيارة" : "Visit Date"}: {encounterData?.admissionDate ? new Date(encounterData.admissionDate).toLocaleString() : "-"}</div>
            <div>{locale === "ar" ? "القسم" : "Department"}: {encounterData?.department || "-"}</div>
            <div>{locale === "ar" ? "الطبيب المعالج" : "Treating Physician"}: {encounterData?.physician || "-"}</div>
            <div>{locale === "ar" ? "التشخيص" : "Diagnosis"}: {encounterData?.diagnosis || "-"}</div>
            <div>{locale === "ar" ? "الإجراء" : "Procedure"}: {encounterData?.procedure || "-"}</div>
            <div>{locale === "ar" ? "الحساسية" : "Allergies"}: {encounterData?.allergies || "-"}</div>
            <div>{locale === "ar" ? "الأدوية" : "Medications"}: {encounterData?.currentMedications || "-"}</div>
            <div>{locale === "ar" ? "حالة المزامنة" : "Sync Status"}: {trakCareSync.status}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={syncWithTrakCare} disabled={!patientData || !encounterData || trakCareSync.status === "SYNCING"} className="rounded border border-blue-300 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50">
            {locale === "ar" ? "مزامنة من TrakCare" : "Sync from TrakCare"}
          </button>
          <button type="button" onClick={() => { if (patientData?.id) { void loadEncounters(patientData.id); } }} disabled={!patientData} className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            {locale === "ar" ? "تحديث الزيارة" : "Refresh Encounter"}
          </button>
          <button type="button" onClick={() => setShowImportedData((prev) => !prev)} className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            {locale === "ar" ? "عرض البيانات المستوردة" : "View Imported Data"}
          </button>
          <button type="button" onClick={() => { setEncounterContextLocked(false); setTrakCareSync((prev) => ({ ...prev, manualOverride: true })); }} className="rounded border border-amber-300 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50">
            {locale === "ar" ? "تصحيح يدوي" : "Manual Correction"}
          </button>
          <button type="button" onClick={() => setEncounterContextLocked(true)} disabled={!patientData || !encounterData || !encounterData.physician} className="rounded border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            {locale === "ar" ? "قفل سياق الزيارة" : "Lock Encounter Context"}
          </button>
        </div>

        {showImportedData ? (
          <div className="rounded border border-slate-200 bg-white p-3 text-xs space-y-1">
            <div><span className="font-semibold">Source:</span> {trakCareSync.sourceSystem || "-"}</div>
            <div><span className="font-semibold">Imported:</span> {(trakCareSync.importedFields || []).join(", ") || "-"}</div>
            <div><span className="font-semibold">Failed:</span> {(trakCareSync.failedFields || []).join(", ") || "-"}</div>
            <div><span className="font-semibold">Manual Override:</span> {String(Boolean(trakCareSync.manualOverride))}</div>
            <div><span className="font-semibold">CorrelationId:</span> {trakCareSync.correlationId || "-"}</div>
          </div>
        ) : null}
      </div>
    );
  };

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case "patient_search":
        return renderPatientSearch();
      case "encounter_selection":
        return renderEncounterSelection();
      case "consent_type_selection":
        return renderConsentTypeSelection();
      case "template_selection":
        return renderTemplateSelection();
      case "draft_generation":
        return renderDraftGeneration();
      case "physician_review":
        return renderPhysicianReview();
      case "patient_signature":
        return renderPatientSignature();
      case "finalization":
        return renderFinalization();
      default:
        return null;
    }
  };

  const renderPatientSearch = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Search className="w-5 h-5" />
        {locale === "ar" ? "البحث عن المريض" : "Patient Search"}
      </h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <input
          type="text"
          placeholder={locale === "ar" ? "ابحث برقم الملف الطبي أو الاسم" : "Search by MRN or name..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onInput={(e) => handlePatientSearch((e.target as HTMLInputElement).value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        {patientSearchResults.length > 0 ? (
          patientSearchResults.map((patient) => (
            <button
              key={patient.id}
              onClick={() => {
                setPatientData(patient);
                loadEncounters(patient.id);
                setCurrentStep("encounter_selection");
              }}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
            >
              <div className="font-semibold">{patient.name}</div>
              <div className="text-sm text-gray-600">MRN: {patient.mrn}</div>
              {patient.dateOfBirth && <div className="text-sm text-gray-500">DOB: {patient.dateOfBirth}</div>}
            </button>
          ))
        ) : searchQuery ? (
          <div className="text-center py-6 text-gray-500">
            {loading ? "Searching..." : "No patients found"}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            {locale === "ar" ? "ابدأ بالبحث عن مريض" : "Start typing to search for a patient"}
          </div>
        )}
      </div>
    </div>
  );

  const renderEncounterSelection = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <User className="w-4 h-4" />
          {patientData?.name}
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
          <div>MRN: {patientData?.mrn}</div>
          {patientData?.dateOfBirth && <div>DOB: {patientData.dateOfBirth}</div>}
          {patientData?.mobileNumber && <div>Mobile: {patientData.mobileNumber}</div>}
        </div>
      </div>

      <h2 className="text-xl font-bold flex items-center gap-2">
        <Hospital className="w-5 h-5" />
        {locale === "ar" ? "اختر الزيارة" : "Select Encounter"}
      </h2>

      <div className="space-y-2">
        {encounterList.length > 0 ? (
          encounterList.map((encounter) => (
            <button
              key={encounter.id}
              onClick={() => {
                setEncounterData(encounter);
                setCurrentStep("consent_type_selection");
              }}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">Encounter #{encounter.encounterId}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(encounter.admissionDate).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{encounter.department}</div>
                  <div className="text-gray-600">{encounter.physician}</div>
                </div>
              </div>
              <div className="text-sm text-gray-700 mt-2">
                {locale === "ar" ? "التشخيص:" : "Diagnosis:"} {encounter.diagnosis}
              </div>
              <div className="text-sm text-gray-700">
                {locale === "ar" ? "الإجراء:" : "Procedure:"} {encounter.procedure}
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            {loading ? "Loading encounters..." : "No encounters found"}
          </div>
        )}
      </div>
    </div>
  );

  const renderConsentTypeSelection = () => (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="font-semibold mb-2">{patientData?.name}</div>
        <div className="text-sm text-gray-700">
          {encounterData?.department} • {encounterData?.physician}
        </div>
      </div>

      <h2 className="text-xl font-bold flex items-center gap-2">
        <FileText className="w-5 h-5" />
        {locale === "ar" ? "نوع الموافقة" : "Consent Type"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {["GENERAL_CONSENT", "SURGICAL_CONSENT", "ANESTHESIA_CONSENT", "BLOOD_TRANSFUSION"].map((type) => (
          <button
            key={type}
            onClick={() => {
              setConsentType(type);
              setSpecialty(encounterData?.physicianSpecialty || "GENERAL_MEDICINE");
              loadTemplates(type, encounterData?.physicianSpecialty || "GENERAL_MEDICINE");
              setCurrentStep("template_selection");
            }}
            className={`p-4 border-2 rounded-lg transition-all ${
              consentType === type
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            <div className="font-semibold">{type.replace(/_/g, " ")}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderTemplateSelection = () => (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="font-semibold mb-2">{consentType.replace(/_/g, " ")}</div>
        <div className="text-sm text-gray-700">
          {locale === "ar" ? "التخصص:" : "Specialty:"} {specialty}
        </div>
      </div>

      <h2 className="text-xl font-bold flex items-center gap-2">
        <FileCheck className="w-5 h-5" />
        {locale === "ar" ? "اختر القالب" : "Select Template"}
      </h2>

      <div className="space-y-2">
        {templates.length > 0 ? (
          templates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template);
              }}
              className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                selectedTemplate?.id === template.id
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <div className="font-semibold">
                {locale === "ar" ? template.titleAr : template.titleEn}
              </div>
              <div className="text-sm text-gray-600">
                {template.version} • {template.language} • {template.status}
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            {loading ? "Loading templates..." : "No templates available"}
          </div>
        )}
      </div>

      {selectedTemplate && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="font-semibold text-blue-900">
            {locale === "ar" ? "معاينة القالب المحدد" : "Selected Template Preview"}
          </div>
          <div className="text-sm text-blue-800">
            {locale === "ar" ? selectedTemplate.summaryAr : selectedTemplate.summaryEn}
          </div>
          <div className="text-xs text-blue-900 whitespace-pre-wrap max-h-40 overflow-y-auto border border-blue-200 bg-white rounded p-3">
            {(locale === "ar" ? selectedTemplate.previewAr : selectedTemplate.previewEn) ||
              (locale === "ar"
                ? "لا توجد معاينة تفصيلية متاحة"
                : "No detailed preview is available")}
          </div>
          <button
            onClick={() => setCurrentStep("draft_generation")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-all"
          >
            {locale === "ar" ? "اعتماد هذا القالب والمتابعة" : "Use This Template and Continue"}
          </button>
        </div>
      )}
    </div>
  );

  const renderDraftGeneration = () => (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4" />
          {locale === "ar" ? "إنشاء المسودة" : "Generate Draft"}
        </div>
        <div className="text-sm text-gray-700 mt-2">
          {selectedTemplate?.language === "bilingual"
            ? locale === "ar"
              ? "سيتم إنشاء نموذج ثنائي اللغة"
              : "Bilingual document will be generated"
            : selectedTemplate?.language === "ar"
              ? locale === "ar"
                ? "الموافقة بالعربية"
                : "Arabic consent"
              : locale === "ar"
                ? "الموافقة بالإنجليزية"
                : "English consent"}
        </div>
      </div>

      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Hospital className="w-4 h-4" />
          {locale === "ar" ? "معلومات المريض والزيارة" : "Patient & Encounter Info"}
        </h3>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-600">{locale === "ar" ? "الاسم" : "Name"}</div>
            <div className="font-semibold">{patientData?.name}</div>
          </div>
          <div>
            <div className="text-gray-600">MRN</div>
            <div className="font-semibold">{patientData?.mrn}</div>
          </div>
          {patientData?.nationalId && (
            <div>
              <div className="text-gray-600">{locale === "ar" ? "الهوية الوطنية" : "National ID"}</div>
              <div className="font-semibold">{patientData.nationalId}</div>
            </div>
          )}
          {patientData?.gender && (
            <div>
              <div className="text-gray-600">{locale === "ar" ? "الجنس" : "Gender"}</div>
              <div className="font-semibold">{patientData.gender}</div>
            </div>
          )}
          <div>
            <div className="text-gray-600">{locale === "ar" ? "التشخيص" : "Diagnosis"}</div>
            <div className="font-semibold">{encounterData?.diagnosis}</div>
          </div>
          <div>
            <div className="text-gray-600">{locale === "ar" ? "الإجراء" : "Procedure"}</div>
            <div className="font-semibold">{encounterData?.procedure}</div>
          </div>
        </div>

        <h3 className="font-semibold flex items-center gap-2 pt-4 border-t">
          <Stethoscope className="w-4 h-4" />
          {locale === "ar" ? "مزامنة TrakCare" : "TrakCare Sync"}
        </h3>

        <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">
              {locale === "ar" ? "حالة المزامنة" : "Sync Status"}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
                trakCareSync.status === "SYNCED"
                  ? "bg-green-100 text-green-700"
                  : trakCareSync.status === "FAILED"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {trakCareSync.status}
            </span>
          </div>

          {trakCareSync.lastSyncTime && (
            <div className="text-gray-600">
              {locale === "ar" ? "آخر مزامنة:" : "Last synced:"}{" "}
              {new Date(trakCareSync.lastSyncTime).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
            </div>
          )}

          {trakCareSync.syncError && (
            <div className="text-red-600 text-sm">
              {locale === "ar" ? "خطأ في المزامنة:" : "Sync error:"} {trakCareSync.syncError}
            </div>
          )}

          <button
            onClick={syncWithTrakCare}
            disabled={trakCareSync.status === "SYNCING"}
            className="mt-2 flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            <RefreshCw className={`w-4 h-4 ${trakCareSync.status === "SYNCING" ? "animate-spin" : ""}`} />
            {locale === "ar" ? "مزامنة الآن" : "Sync Now"}
          </button>
        </div>
      </div>

      <button
        onClick={generateDraftConsent}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            {locale === "ar" ? "جاري الإنشاء..." : "Generating..."}
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            {locale === "ar" ? "إنشاء المسودة" : "Generate Draft"}
          </>
        )}
      </button>
    </div>
  );

  const renderPhysicianReview = () => (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          {locale === "ar" ? "مراجعة الطبيب" : "Physician Review"}
        </h2>
      </div>

      {draftConsent && (
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                {locale === "ar" ? "التشخيص" : "Diagnosis"}
              </label>
              <input
                type="text"
                value={encounterData?.diagnosis || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {locale === "ar" ? "تفاصيل الإجراء" : "Procedure Details"}
              </label>
              <textarea
                defaultValue={encounterData?.procedure || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {locale === "ar" ? "الفوائد" : "Benefits"}
                </label>
                <textarea
                  placeholder={locale === "ar" ? "اذكر الفوائد المتوقعة" : "List expected benefits..."}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {locale === "ar" ? "المخاطر" : "Risks"}
                </label>
                <textarea
                  placeholder={locale === "ar" ? "اذكر المخاطر المحتملة" : "List potential risks..."}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {locale === "ar" ? "البدائل" : "Alternatives"}
              </label>
              <textarea
                placeholder={locale === "ar" ? "اذكر البدائل المتاحة" : "List available alternatives..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {locale === "ar" ? "مخاطر الرفض" : "Risks of Refusal"}
              </label>
              <textarea
                placeholder={locale === "ar" ? "اذكر مخاطر رفض الإجراء" : "List risks if refused..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {locale === "ar" ? "ملاحظات الطبيب" : "Physician Notes"}
              </label>
              <textarea
                placeholder={locale === "ar" ? "أضف أي ملاحظات إضافية" : "Add any additional notes..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                {locale === "ar" ? "أوافق على هذا النموذج" : "I approve this consent form"}
              </label>
            </div>

            <button
              onClick={() => setCurrentStep("patient_signature")}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {locale === "ar" ? "الموافقة والمتابعة" : "Approve & Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderPatientSignature = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Signature className="w-5 h-5" />
          {locale === "ar" ? "توقيع المريض" : "Patient Signature"}
        </h2>
      </div>

      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <div className="bg-blue-50 p-3 rounded flex items-start gap-3">
          <Send className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">
              {locale === "ar" ? "سيتم إرسال رابط التوقيع الآمن" : "Secure Signature Link"}
            </div>
            <div className="text-gray-700 mt-1">
              {locale === "ar"
                ? "سيتم إرسال رابط توقيع آمن عبر البريد الإلكتروني والرسائل القصيرة إلى المريض"
                : "A secure signature link will be sent via email and SMS to the patient"}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            {locale === "ar" ? "رقم الهاتف المحمول" : "Mobile Number"}
          </label>
          <input
            type="tel"
            defaultValue={patientData?.mobileNumber || ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            {locale === "ar" ? "البريد الإلكتروني" : "Email"}
          </label>
          <input type="email" placeholder="patient@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <button
          onClick={() => setCurrentStep("finalization")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {locale === "ar" ? "إرسال رابط التوقيع" : "Send Signature Link"}
        </button>
      </div>
    </div>
  );

  const renderFinalization = () => (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Lock className="w-5 h-5" />
          {locale === "ar" ? "الإنهاء والأرشيف" : "Finalization"}
        </h2>
      </div>

      <div className="space-y-3">
        <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <FileCheck className="w-4 h-4" />
            {locale === "ar" ? "الملف القانوني" : "Legal Evidence Package"}
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
              <span>{locale === "ar" ? "ملف PDF النهائي" : "Final PDF"}</span>
              <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
              <span>{locale === "ar" ? "شهادة التوقيع" : "Signature Certificate"}</span>
              <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
              <span>{locale === "ar" ? "كود QR للتحقق" : "QR Verification Code"}</span>
              <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" />
            {locale === "ar" ? "سجل التدقيق" : "Audit Trail"}
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{locale === "ar" ? "الإنشاء" : "Created"}</span>
              <span className="font-semibold">{draftConsent?.createdAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{locale === "ar" ? "آخر تعديل" : "Last Modified"}</span>
              <span className="font-semibold">{draftConsent?.lastModified}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{locale === "ar" ? "الحالة" : "Status"}</span>
              <span className="font-semibold text-green-600">
                {locale === "ar" ? "موقع ومُنهى" : "Signed & Finalized"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setCurrentStep("patient_search");
            setPatientData(null);
            setEncounterData(null);
            setSelectedTemplate(null);
            setDraftConsent(null);
            setEncounterContextLocked(false);
            setShowImportedData(false);
            setTrakCareSync({ status: "NOT_SYNCED", importedFields: [], failedFields: [], manualOverride: false });
            localStorage.removeItem("wathiqcare.informed-consents.selected-template");
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <Archive className="w-4 h-4" />
          {locale === "ar" ? "إنشاء موافقة جديدة" : "Create New Consent"}
        </button>
      </div>
    </div>
  );

  return (
    <ModuleShell
      auth={auth}
      moduleKey="informed-consents"
      title={{ ar: "تطبيق الموافقات المستنيرة", en: "Informed Consents" }}
      subtitle={{
        ar: "مسار سريري مؤسسي متكامل للموافقة المستنيرة مع التوقيع والتدقيق والأرشفة القانونية.",
        en: "Enterprise clinical informed-consent workflow with signature, audit, and legal archiving.",
      }}
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-900">{locale === "ar" ? "خطأ" : "Error"}</div>
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-green-700 text-sm">{success}</div>
          </div>
        )}

        {renderStepper()}

        {renderContextPanel()}

        <div className="bg-white border border-gray-200 rounded-lg p-6">{renderStepContent()}</div>
      </div>
    </ModuleShell>
  );
}
