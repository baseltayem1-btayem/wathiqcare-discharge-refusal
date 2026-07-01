"use client";

import { useEffect, useState } from "react";
import { Stethoscope, FileText, BrainCircuit, AlertCircle } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import { useClinicalContentFlags, useFlag } from "../shared/useClinicalContentFlags";
import ApprovedFormsV2Panel from "../approved-forms/ApprovedFormsV2Panel";
import ProcedureMappingPanel from "./ProcedureMappingPanel";
import ConsentAssemblyPanel from "./ConsentAssemblyPanel";
import type { ApprovedFormV2, ConsentAssembly } from "@/lib/clinical-content/types";

type TabKey = "forms" | "mapping" | "assemble";

export type DoctorWorkspaceV2Props = {
  auth: {
    role?: string | null;
    platform_role?: string | null;
    email?: string;
    tenantId?: string | null;
    userId?: string | null;
  };
};

const MENU_ITEMS = [
  { href: "/modules/informed-consents", label: { ar: "الموافقات المستنيرة", en: "Informed Consents" } },
  { href: "/modules/informed-consents/list", label: { ar: "قائمة الموافقات", en: "Consent List" } },
];

export default function DoctorWorkspaceV2({ auth }: DoctorWorkspaceV2Props) {
  const tenantId = auth.tenantId ?? null;
  const flagsState = useClinicalContentFlags(tenantId);
  const [activeTab, setActiveTab] = useState<TabKey>("mapping");
  const [selectedProcedure, setSelectedProcedure] = useState<string>("");
  const [selectedForm, setSelectedForm] = useState<ApprovedFormV2 | null>(null);
  const [assembly, setAssembly] = useState<ConsentAssembly | null>(null);

  const platformEnabled = flagsState.enabled;
  const formsEnabled = useFlag(flagsState.flags, "ENABLE_APPROVED_FORMS_V2", false);
  const mappingEnabled = useFlag(flagsState.flags, "ENABLE_PROCEDURE_MAPPING_ENGINE_V2", false);
  const assembleEnabled = useFlag(flagsState.flags, "ENABLE_DYNAMIC_CONSENT_GENERATOR", false);

  useEffect(() => {
    if (selectedForm && assembleEnabled && tenantId) {
      fetch("/api/modules/clinical-content/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          procedureName: selectedForm.procedure,
          patientContext: {
            capacityStatus: "competent",
            languagePreference: "bilingual",
          },
          physicianContext: {
            physicianId: auth.userId || "unknown",
            name: auth.email || "Physician",
            licenseNumber: "",
            specialty: selectedForm.specialty,
            department: "",
          },
          preferredLanguage: "bilingual",
          includeEducation: true,
          includeDecisionSupport: true,
        }),
      })
        .then((r) => r.json())
        .then((payload) => {
          if (payload.ok && payload.assembly) {
            setAssembly(payload.assembly);
            setActiveTab("assemble");
          }
        })
        .catch(() => setAssembly(null));
    }
  }, [selectedForm, assembleEnabled, tenantId, auth.userId, auth.email]);

  if (!platformEnabled && !flagsState.loading) {
    return (
      <ModuleShell
        auth={auth}
        moduleKey="informed-consents"
        title={{ ar: "مساحة الطبيب V2", en: "Doctor Workspace V2" }}
        subtitle={{ ar: "المنصة الجديدة للمحتوى السريري", en: "Next-generation clinical content platform" }}
        menuItems={MENU_ITEMS}
      >
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mb-1 inline h-4 w-4" /> Clinical Content Platform V2 is disabled.
          Enable the feature flag to use the Doctor Workspace V2.
        </div>
      </ModuleShell>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; enabled: boolean }[] = [
    { key: "mapping", label: "Procedure Mapping", icon: Stethoscope, enabled: mappingEnabled },
    { key: "forms", label: "Approved Forms V2", icon: FileText, enabled: formsEnabled },
    { key: "assemble", label: "Consent Assembly", icon: BrainCircuit, enabled: assembleEnabled },
  ];

  return (
    <ModuleShell
      auth={auth}
      moduleKey="informed-consents"
      title={{ ar: "مساحة الطبيب V2", en: "Doctor Workspace V2" }}
      subtitle={{ ar: "منصة المحتوى السريري الجديدة", en: "Next-generation clinical content platform" }}
      menuItems={MENU_ITEMS}
    >
      <div className="space-y-4">
        {flagsState.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mb-1 inline h-4 w-4" /> {flagsState.error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) =>
            tab.enabled ? (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? "bg-sky-600 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ) : null,
          )}
        </div>

        {activeTab === "mapping" && mappingEnabled && tenantId ? (
          <ProcedureMappingPanel
            tenantId={tenantId}
            onSelectProcedure={(name) => {
              setSelectedProcedure(name);
              if (assembleEnabled) {
                // trigger assembly in assemble tab
              }
            }}
          />
        ) : null}

        {activeTab === "forms" && formsEnabled && tenantId ? (
          <ApprovedFormsV2Panel
            tenantId={tenantId}
            onSelectForm={(form) => {
              setSelectedForm(form);
              setSelectedProcedure(form.procedure);
            }}
          />
        ) : null}

        {activeTab === "assemble" && assembleEnabled && tenantId ? (
          <ConsentAssemblyPanel
            tenantId={tenantId}
            procedureName={selectedProcedure}
            initialAssembly={assembly}
          />
        ) : null}
      </div>
    </ModuleShell>
  );
}
