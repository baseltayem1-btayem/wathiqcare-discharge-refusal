"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Monitor,
  FileText,
  Eye,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Route,
  MessageSquare,
} from "lucide-react";
import type { ConsentStep } from "../clinical/ClinicalTypes";
import { ConsentCollaborationPanel } from "../../collaboration/ConsentCollaborationPanel";

type CollaborationTeamFromApi = {
  anesthesiologistUserId?: string | null;
  surgeonUserId?: string | null;
  nursingUserId?: string | null;
  legalReviewerUserId?: string | null;
};

type PreviewBuilderState = {
  patient?: Record<string, unknown>;
  procedure?: Record<string, unknown>;
  anesthesia?: Record<string, unknown>;
  disclosures?: Record<string, unknown>;
  education?: Record<string, unknown>;
  document?: Record<string, unknown>;
  updatedAt?: string;
};

interface Props {
  lang: "en" | "ar";
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[], payload?: Record<string, unknown>) => void;
  builderState: PreviewBuilderState;
  linkedDocumentId?: string;
  documentReady?: boolean;
  documentError?: string | null;
  isLinkingDocument?: boolean;
  onGoToStep: (step: ConsentStep) => void;
}

const previewTabs = [
  { id: "patient", label: "Patient Journey", labelAr: "\u0631\u062d\u0644\u0629 \u0627\u0644\u0645\u0631\u064a\u0636", icon: Eye },
  { id: "pdf", label: "PDF Preview Status", labelAr: "\u062d\u0627\u0644\u0629 \u0645\u0639\u0627\u064a\u0646\u0629 PDF", icon: FileText },
  { id: "evidence", label: "Evidence Readiness", labelAr: "\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062d\u0632\u0645\u0629 \u0627\u0644\u062f\u0644\u064a\u0644\u064a\u0629", icon: Archive },
  { id: "collaboration", label: "Clinical Collaboration", labelAr: "??????? ???????", icon: MessageSquare },
] as const;

const safeText = (value: unknown, fallback = "Not provided") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const optionalText = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

const disclosureText = (
  disclosures: Record<string, unknown> | undefined,
  key: string,
  lang: "en" | "ar",
  fallback: string,
) => {
  const item = disclosures?.[key] as Record<string, unknown> | undefined;
  return safeText(item?.[lang], fallback);
};

export function StepPreview({
  lang,
  onNext,
  onPrev,
  onComplete,
  builderState,
  linkedDocumentId = "",
  documentReady = false,
  documentError = null,
  isLinkingDocument = false,
  onGoToStep,
}: Props) {
  const [previewTab, setPreviewTab] = useState<(typeof previewTabs)[number]["id"]>("patient");
  const [confirmed, setConfirmed] = useState(false);
  
  const [collaborationTeamFromApi, setCollaborationTeamFromApi] = useState<CollaborationTeamFromApi | null>(null);
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  

  useEffect(() => {
    let cancelled = false;

    async function loadCollaborationTeam() {
      try {
        const response = await fetch("/api/modules/informed-consents/collaboration/team?departmentName=General");
        const payload = await response.json().catch(() => null);

        if (!cancelled && payload?.ok && payload.team) {
          setCollaborationTeamFromApi(payload.team);
        }
      } catch (error) {
        console.error("Failed to load clinical collaboration team for preview", error);
      }
    }

    loadCollaborationTeam();

    return () => {
      cancelled = true;
    };
  }, []);
const patient = builderState.patient || {};
  const procedure = builderState.procedure || {};
  const anesthesia = builderState.anesthesia || {};
  const disclosures = builderState.disclosures || {};
  const education = builderState.education || {};
  const document = builderState.document || {};
  const metadata = (builderState as Record<string, unknown>).metadata as Record<string, unknown> | undefined;

  const collaborationCaseId =
    optionalText(document.caseId) ||
    optionalText(document.consentCaseId) ||
    optionalText(document.case_id) ||
    optionalText(metadata?.caseId);

  const collaborationTenantId =
    optionalText(document.tenantId) ||
    optionalText(document.tenant_id) ||
    optionalText(metadata?.tenantId);

  const collaborationActorUserId =
    optionalText(document.actorUserId) ||
    optionalText(document.createdByUserId) ||
    optionalText(document.created_by_user_id) ||
    optionalText(metadata?.actorUserId) ||
    optionalText(metadata?.userId);

  const anesthesiologistUserId =
    optionalText(anesthesia.anesthesiologistUserId) ||
    optionalText(anesthesia.assignedAnesthesiologistId) ||
    optionalText(document.anesthesiologistUserId) ||
    optionalText(collaborationTeamFromApi?.anesthesiologistUserId);

  const surgeonUserId =
    optionalText(procedure.surgeonUserId) ||
    optionalText(procedure.physicianUserId) ||
    optionalText(procedure.doctorUserId) ||
    optionalText(document.surgeonUserId) ||
    optionalText(collaborationTeamFromApi?.surgeonUserId);

  const legalReviewerUserId =
    optionalText(document.legalReviewerUserId) ||
    optionalText(metadata?.legalReviewerUserId) ||
    optionalText(collaborationTeamFromApi?.legalReviewerUserId);

  const nursingUserId =
    optionalText(document.nursingUserId) ||
    optionalText(metadata?.nursingUserId) ||
    optionalText(collaborationTeamFromApi?.nursingUserId);

  const anesthesiaApplies = anesthesia.applies === true;
  const procedureName = isAr
    ? safeText(procedure.nameAr, safeText(procedure.name, "\u063a\u064a\u0631 \u0645\u062f\u062e\u0644"))
    : safeText(procedure.name, "Not selected");
  const pdfPreviewUrl = linkedDocumentId
    ? `/api/modules/informed-consents/documents/${encodeURIComponent(linkedDocumentId)}/pdf?lang=bilingual`
    : "";

  const handleComplete = () => {
    onComplete("preview", ["v14"], {
      document: {
        linkedDocumentId,
        documentReady,
        documentError,
        reviewedAt: new Date().toISOString(),
      },
    });
    onNext();
  };

  const readinessRows = [
    {
      label: isAr ? "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0631\u064a\u0636" : "Patient information",
      ready: Boolean(patient.mrn || patient.name),
      note: safeText(patient.mrn, isAr ? "\u063a\u064a\u0631 \u0645\u062f\u062e\u0644" : "Not provided"),
    },
    {
      label: isAr ? "\u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0645\u062e\u062a\u0627\u0631" : "Selected procedure",
      ready: Boolean(procedure.name),
      note: procedureName,
    },
    {
      label: isAr ? "\u0627\u0644\u0625\u062c\u0631\u0627\u0621" : "Anesthesia",
      ready: true,
      note: anesthesiaApplies
        ? safeText(isAr ? anesthesia.typeLabelAr : anesthesia.typeLabel, isAr ? "\u064a\u0646\u0637\u0628\u0642" : "Applies")
        : isAr
          ? "\u063a\u064a\u0631 \u0645\u0646\u0637\u0628\u0642"
          : "Not applicable",
    },
    {
      label: isAr ? "\u0627\u0644\u0625\u0641\u0635\u0627\u062d\u0627\u062a \u0627\u0644\u0637\u0628\u064a\u0629" : "Medical disclosures",
      ready: Object.keys(disclosures).length > 0,
      note: Object.keys(disclosures).length > 0 ? (isAr ? "\u0627\u0644\u0628\u0631\u064a\u062f" : "Captured") : (isAr ? "\u0627\u0633\u0645 \u0627\u0644\u0645\u0631\u064a\u0636" : "Pending"),
    },
    {
      label: isAr ? "\u062a\u062b\u0642\u064a\u0641 \u0627\u0644\u0645\u0631\u064a\u0636" : "Patient education",
      ready: Object.keys(education).length > 0,
      note: Object.keys(education).length > 0 ? (isAr ? "\u0631\u062c\u0648\u0639" : "Ready") : (isAr ? "\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062a\u0646\u062f" : "Pending"),
    },
    {
      label: isAr ? "\u0645\u0633\u062a\u0646\u062f \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629" : "Consent document",
      ready: documentReady,
      note: linkedDocumentId || (isLinkingDocument ? (isAr ? "\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0633\u062a\u0646\u062f" : "Generating document") : (isAr ? "\u0644\u0645 \u064a\u062a\u0645 \u0625\u0646\u0634\u0627\u0624\u0647 \u0628\u0639\u062f" : "Not generated yet")),
    },
  ];

  return (
    <div className="p-8 space-y-6" dir={dir}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[#002B5C]">
            {isAr ? "\u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u0627\u0639\u062a\u0645\u0627\u062f \u0642\u0628\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644" : "Pre-Send Review & Approval"}
          </h2>
          <p className="text-sm text-[#6B7280] mt-1">
            {isAr
              ? "\u0631\u0627\u062c\u0639 \u0631\u062d\u0644\u0629 \u0627\u0644\u0645\u0631\u064a\u0636\u060c \u0648\u062d\u0627\u0644\u0629 \u0645\u0644\u0641 PDF\u060c \u0648\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062d\u0632\u0645\u0629 \u0627\u0644\u062f\u0644\u064a\u0644\u064a\u0629 \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629."
              : "Review the patient journey, PDF readiness, and evidence readiness before sending the consent link."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {[
            ["procedure", isAr ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062a\u062b\u0642\u064a\u0641" : "Edit Procedure"],
            ["anesthesia", isAr ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062a\u062b\u0642\u064a\u0641" : "Edit Anesthesia"],
            ["disclosures", isAr ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0625\u0641\u0635\u0627\u062d\u0627\u062a" : "Edit Disclosures"],
            ["education", isAr ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062a\u062b\u0642\u064a\u0641" : "Edit Education"],
          ].map(([step, label]) => (
            <button
              key={step}
              type="button"
              onClick={() => onGoToStep(step as ConsentStep)}
              className="inline-flex items-center gap-1 rounded border border-[#D8DCE3] bg-white px-2.5 py-1.5 text-xs font-medium text-[#2F2F2F] hover:border-[#002B5C] hover:text-[#002B5C]"
            >
              <Edit3 className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-[#D8DCE3] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-[#002B5C]" />
              <span className="text-sm font-semibold text-[#2F2F2F]">
                {isAr ? "\u0645\u0644\u062e\u0635 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062f\u062e\u0644\u0629" : "Entered Data Summary"}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-[#6B7280]">{isAr ? "\u0627\u0633\u0645 \u0627\u0644\u0645\u0631\u064a\u0636" : "Patient"}</span>
                <span className="font-medium text-[#2F2F2F] text-end">{safeText(patient.name, isAr ? "\u063a\u064a\u0631 \u0645\u062f\u062e\u0644" : "Not provided")}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#6B7280]">MRN</span>
                <span className="font-mono text-[#2F2F2F] text-end">{safeText(patient.mrn, "Not provided")}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#6B7280]">{isAr ? "\u0627\u0644\u0628\u0631\u064a\u062f" : "Mobile"}</span>
                <span className="font-mono text-[#2F2F2F] text-end">{safeText(patient.mobile, "Not provided")}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#6B7280]">{isAr ? "\u0627\u0644\u0628\u0631\u064a\u062f" : "Email"}</span>
                <span className="font-mono text-[#2F2F2F] text-end">{safeText(patient.email, "Not provided")}</span>
              </div>
              <div className="border-t border-[#EEF1F5] pt-2 mt-2">
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B7280]">{isAr ? "\u0627\u0644\u0625\u062c\u0631\u0627\u0621" : "Procedure"}</span>
                  <span className="font-medium text-[#2F2F2F] text-end">{procedureName}</span>
                </div>
                <div className="flex justify-between gap-3 mt-2">
                  <span className="text-[#6B7280]">{isAr ? "\u0627\u0644\u0625\u062c\u0631\u0627\u0621" : "Anesthesia"}</span>
                  <span className="font-medium text-[#2F2F2F] text-end">
                    {anesthesiaApplies
                      ? safeText(isAr ? anesthesia.typeLabelAr : anesthesia.typeLabel, isAr ? "\u064a\u0646\u0637\u0628\u0642" : "Applies")
                      : isAr
                        ? "\u063a\u064a\u0631 \u0645\u0646\u0637\u0628\u0642"
                        : "Not applicable"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#D8DCE3] rounded-lg p-4">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              {isAr ? "\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629" : "Review Readiness"}
            </p>
            <div className="space-y-2">
              {readinessRows.map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                  {item.ready ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[#2F2F2F]">{item.label}</div>
                    <div className="text-[11px] text-[#6B7280] truncate">{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-3 bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
          <div className="border-b border-[#D8DCE3]">
            <div className="flex">
              {previewTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPreviewTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    previewTab === tab.id
                      ? "border-[#4B9CD3] text-[#002B5C]"
                      : "border-transparent text-[#6B7280] hover:text-[#2F2F2F]"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {isAr ? tab.labelAr : tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto p-6">
            {previewTab === "patient" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-[#D8DCE3] bg-[#F8F9FB] p-4">
                  <div className="flex items-center gap-2 text-[#002B5C] font-semibold mb-2">
                    <Route className="h-4 w-4" />
                    {isAr ? "\u0631\u062d\u0644\u0629 \u0639\u0644\u0627\u062c \u0627\u0644\u0645\u0631\u064a\u0636" : "Patient Treatment Journey"}
                  </div>
                  <ol className="space-y-2 text-sm text-[#2F2F2F]">
                    <li>1. {isAr ? "\u062a\u0623\u0643\u064a\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0631\u064a\u0636 \u0648\u0627\u0644\u0632\u064a\u0627\u0631\u0629." : "Confirm patient and encounter details."}</li>
                    <li>2. {isAr ? "\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0637\u0628\u064a: " : "Selected procedure: "} <strong>{procedureName}</strong></li>
                    <li>3. {isAr ? "\u062a\u062d\u062f\u064a\u062f \u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u062e\u062f\u064a\u0631: " : "Anesthesia decision: "} <strong>{anesthesiaApplies ? safeText(isAr ? anesthesia.typeLabelAr : anesthesia.typeLabel) : (isAr ? "\u063a\u064a\u0631 \u0645\u0646\u0637\u0628\u0642" : "Not applicable")}</strong></li>
                    <li>4. {isAr ? "\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0625\u0641\u0635\u0627\u062d\u0627\u062a \u0648\u0627\u0644\u0645\u062e\u0627\u0637\u0631 \u0648\u0627\u0644\u0628\u062f\u0627\u0626\u0644." : "Review disclosures, risks, and alternatives."}</li>
                    <li>5. {isAr ? "\u0645\u0631\u0627\u062c\u0639\u0629 \u062a\u062b\u0642\u064a\u0641 \u0627\u0644\u0645\u0631\u064a\u0636 \u0642\u0628\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644." : "Review patient education before sending."}</li>
                  </ol>
                </div>

                <div className="rounded-lg border border-[#D8DCE3] p-4">
                  <h3 className="text-sm font-semibold text-[#002B5C] mb-2">
                    {isAr ? "\u0645\u0627\u0630\u0627 \u0633\u064a\u062d\u062f\u062b\u061f" : "What will happen?"}
                  </h3>
                  <p className="text-sm text-[#2F2F2F] leading-relaxed">
                    {disclosureText(disclosures, "proc_desc", isAr ? "ar" : "en", safeText(isAr ? procedure.descriptionAr : procedure.description))}
                  </p>
                </div>

                <div className="rounded-lg border border-[#D8DCE3] p-4">
                  <h3 className="text-sm font-semibold text-[#002B5C] mb-2">
                    {isAr ? "\u0644\u0645\u0627\u0630\u0627 \u062a\u062d\u062a\u0627\u062c \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621\u061f" : "Why do you need this?"}
                  </h3>
                  <p className="text-sm text-[#2F2F2F] leading-relaxed">
                    {disclosureText(disclosures, "reason", isAr ? "ar" : "en", "Not provided")}
                  </p>
                </div>

                <div className="rounded-lg border border-[#D8DCE3] p-4">
                  <h3 className="text-sm font-semibold text-[#002B5C] mb-2">
                    {isAr ? "\u0627\u0644\u0645\u062e\u0627\u0637\u0631 \u0648\u0627\u0644\u0628\u062f\u0627\u0626\u0644" : "Risks and alternatives"}
                  </h3>
                  <p className="text-sm text-[#2F2F2F] leading-relaxed whitespace-pre-line">
                    {disclosureText(disclosures, "risks", isAr ? "ar" : "en", "Not provided")}
                    {"\n\n"}
                    {disclosureText(disclosures, "alternatives", isAr ? "ar" : "en", "Not provided")}
                  </p>
                </div>
              </div>
            )}

            {previewTab === "pdf" && (
              <div className="space-y-4">
                <div className={`rounded-lg border p-4 ${documentReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-start gap-3">
                    {documentReady ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    )}
                    <div>
                      <p className={`font-semibold ${documentReady ? "text-emerald-900" : "text-amber-900"}`}>
                        {documentReady
                          ? (isAr ? "\u062a\u0645 \u0631\u0628\u0637 \u0645\u0633\u062a\u0646\u062f \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629" : "Consent document linked")
                          : isLinkingDocument
                            ? (isAr ? "\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 \u0648\u0631\u0628\u0637 \u0645\u0633\u062a\u0646\u062f \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629" : "Generating and linking consent document")
                            : (isAr ? "\u0644\u0645 \u064a\u062a\u0645 \u0631\u0628\u0637 \u0645\u0633\u062a\u0646\u062f \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0628\u0639\u062f" : "Consent document has not been linked yet")}
                      </p>
                      <p className={`mt-1 text-sm ${documentReady ? "text-emerald-800" : "text-amber-800"}`}>
                        {linkedDocumentId
                          ? `${isAr ? "\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062a\u0646\u062f" : "Document ID"}: ${linkedDocumentId}`
                          : (isAr
                            ? "\u0633\u062a\u062a\u0627\u062d \u0645\u0639\u0627\u064a\u0646\u0629 \u0645\u0644\u0641 PDF \u0627\u0644\u0641\u0639\u0644\u064a\u0629 \u0628\u0639\u062f \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0633\u062a\u0646\u062f \u0648\u0631\u0628\u0637\u0647 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u0627\u0631."
                            : "The real PDF preview will appear after this workflow generates and links the consent document.")}
                      </p>
                      {documentError ? (
                        <p className="mt-2 text-xs text-red-700">{documentError}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {linkedDocumentId ? (
                  <div className="rounded-lg border border-[#D8DCE3] bg-white p-4">
                    <div className="space-y-3">
                      <p className="text-sm text-[#2F2F2F]">
                        {isAr
                          ? "\u0647\u0630\u0647 \u0647\u064a \u0645\u0639\u0627\u064a\u0646\u0629 PDF \u0627\u0644\u0641\u0639\u0644\u064a\u0629 \u0644\u0644\u0645\u0633\u062a\u0646\u062f \u0627\u0644\u0645\u0631\u062a\u0628\u0637 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062a\u0646\u062f \u0627\u0644\u062d\u0642\u064a\u0642\u064a."
                          : "This is the real PDF preview for the linked consent document using the actual document ID."}
                      </p>
                      <a
                        href={pdfPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded border border-[#4B9CD3] px-3 py-2 text-sm font-medium text-[#002B5C] hover:bg-[#EBF3FB]"
                      >
                        {isAr ? '\u0641\u062a\u062d \u0645\u0644\u0641 PDF \u0627\u0644\u0641\u0639\u0644\u064a' : 'Open real PDF preview'}
                        <Route className="h-4 w-4" />
                      </a>
                      {documentReady ? (
                        <iframe
                          title="consent-pdf-preview"
                          src={pdfPreviewUrl}
                          className="h-[640px] w-full rounded border border-[#D8DCE3] bg-white"
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            )}


            {previewTab === "collaboration" && (
              <ConsentCollaborationPanel
                lang={lang}
                caseId={collaborationCaseId}
                tenantId={collaborationTenantId}
                actorUserId={collaborationActorUserId}
                anesthesiologistUserId={anesthesiologistUserId}
                surgeonUserId={surgeonUserId}
                legalReviewerUserId={legalReviewerUserId}
                nursingUserId={nursingUserId}
              />
            )}

            {previewTab === "evidence" && (
              <div className="space-y-3">
                {readinessRows.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded border border-[#D8DCE3] bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.ready ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-sm text-[#2F2F2F]">{item.label}</span>
                    </div>
                    <span className={`rounded border px-2 py-0.5 text-xs ${
                      item.ready
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}>
                      {item.ready ? (isAr ? "\u0631\u062c\u0648\u0639" : "Ready") : (isAr ? "\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062a\u0646\u062f" : "Pending")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#D8DCE3] rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#002B5C]"
          />
          <span className="text-sm font-medium text-[#2F2F2F]">
            {isAr
              ? "\u0623\u0624\u0643\u062f \u0623\u0646\u0646\u064a \u0631\u0627\u062c\u0639\u062a \u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0645\u0631\u064a\u0636 \u0627\u0644\u0641\u0639\u0644\u064a\u060c \u0648\u062d\u0627\u0644\u0629 \u0645\u0644\u0641 PDF\u060c \u0648\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062d\u0632\u0645\u0629 \u0627\u0644\u062f\u0644\u064a\u0644\u064a\u0629 \u0642\u0628\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644."
              : "I confirm that I reviewed the live patient-facing content, PDF readiness, and evidence readiness before sending."}
          </span>
        </label>
      </div>

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
          disabled={!confirmed}
          className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded text-sm font-medium transition-colors"
        >
          {isAr ? "\u0645\u062a\u0627\u0628\u0639\u0629 \u0625\u0644\u0649 \u0627\u0644\u062a\u062d\u0642\u0642" : "Continue to Validation"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

