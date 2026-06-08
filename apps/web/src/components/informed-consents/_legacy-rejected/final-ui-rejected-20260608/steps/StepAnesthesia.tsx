"use client";

import React, { useMemo, useState } from "react";
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
  ClipboardCheck,
  Lock,
  Send,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { ClinicalBadge } from "../clinical/ClinicalBadge";
import type { ConsentStep } from "../clinical/ClinicalTypes";

interface Props {
  lang: "en" | "ar";
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[], payload?: Record<string, unknown>) => void;
  /**
   * This role will later come from RBAC/session context.
   * Default remains SURGEON to avoid breaking the current builder flow.
   */
  role?: WorkflowRole;
  linkedDocumentId?: string;
}

type Applicability = "applies" | "not-applicable";

type WorkflowRole = "SURGEON" | "ANESTHESIOLOGIST" | "NURSE";

type AnesthesiaWorkflowStatus =
  | "NOT_REQUIRED"
  | "DRAFT"
  | "PENDING_REVIEW"
  | "IN_REVIEW"
  | "APPROVED"
  | "NURSING_PREPARATION_REQUIRED"
  | "NURSING_READY";

type AnesthesiaPhase = (typeof phases)[number]["key"];

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

const roleLabels: Record<WorkflowRole, { en: string; ar: string }> = {
  SURGEON: { en: "Surgeon / Attending Physician", ar: "\u0627\u0644\u0637\u0628\u064a\u0628 \u0627\u0644\u062c\u0631\u0627\u062d / \u0627\u0644\u0645\u0639\u0627\u0644\u062c" },
  ANESTHESIOLOGIST: { en: "Anesthesiologist", ar: "\u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" },
  NURSE: { en: "Nursing Team", ar: "\u0641\u0631\u064a\u0642 \u0627\u0644\u062a\u0645\u0631\u064a\u0636" },
};

const statusLabels: Record<AnesthesiaWorkflowStatus, { en: string; ar: string; variant: "ready" | "warning" | "critical" | "info" }> = {
  NOT_REQUIRED: { en: "Anesthesia Not Required", ar: "\u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u063a\u064a\u0631 \u0645\u0637\u0644\u0648\u0628", variant: "ready" },
  DRAFT: { en: "Draft", ar: "\u0645\u0633\u0648\u062f\u0629", variant: "info" },
  PENDING_REVIEW: { en: "Pending Anesthesia Review", ar: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0645\u0631\u0627\u062c\u0639\u0629 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631", variant: "warning" },
  IN_REVIEW: { en: "Anesthesia In Review", ar: "\u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629", variant: "warning" },
  APPROVED: { en: "Anesthesia Approved", ar: "\u062a\u0645 \u0627\u0639\u062a\u0645\u0627\u062f \u0642\u0633\u0645 \u0627\u0644\u062a\u062e\u062f\u064a\u0631", variant: "ready" },
  NURSING_PREPARATION_REQUIRED: { en: "Nursing Preparation Required", ar: "\u064a\u0644\u0632\u0645 \u062a\u0623\u0643\u064a\u062f \u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062a\u0645\u0631\u064a\u0636", variant: "warning" },
  NURSING_READY: { en: "Nursing Ready", ar: "\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062a\u0645\u0631\u064a\u0636 \u0645\u0624\u0643\u062f\u0629", variant: "ready" },
};

export function StepAnesthesia({ lang, onNext, onPrev, onComplete, role = "SURGEON", linkedDocumentId }: Props) {
  const [applicability, setApplicability] = useState<Applicability>("not-applicable");
  const [workflowStatus, setWorkflowStatus] = useState<AnesthesiaWorkflowStatus>("NOT_REQUIRED");
  const [selectedType, setSelectedType] = useState("GA");
  const [activePhase, setActivePhase] = useState<AnesthesiaPhase>("pre");
  const [asaClass, setAsaClass] = useState("ASA II - Mild systemic disease");
  const [airwayClass, setAirwayClass] = useState("Class II - Partial uvula visible");
  const [fastingAcknowledged, setFastingAcknowledged] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [anesthesiaApproved, setAnesthesiaApproved] = useState(false);
  const [nursingReady, setNursingReady] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [postInstructions, setPostInstructions] = useState(
    lang === "ar"
      ? "\u0639\u062f\u0645 \u0627\u0644\u0642\u064a\u0627\u062f\u0629 \u0623\u0648 \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0622\u0644\u0627\u062a \u0644\u0645\u062f\u0629 24 \u0633\u0627\u0639\u0629. \u064a\u062c\u0628 \u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0645\u0631\u0627\u0641\u0642 \u0628\u0627\u0644\u063a \u0645\u0633\u0624\u0648\u0644 \u0628\u0639\u062f \u0627\u0644\u0625\u062c\u0631\u0627\u0621."
      : "Do not drive or operate machinery for 24 hours. A responsible adult should accompany you after the procedure."
  );

  const dir = lang === "ar" ? "rtl" : "ltr";
  const isAr = lang === "ar";
  const anesthesiaApplies = applicability === "applies";
  const isSurgeon = role === "SURGEON";
  const isAnesthesiologist = role === "ANESTHESIOLOGIST";
  const isNurse = role === "NURSE";
  const currentStatus = statusLabels[workflowStatus];

  const selectedAnesthesiaType = useMemo(
    () => anesthesiaTypes.find((item) => item.id === selectedType) || anesthesiaTypes[0],
    [selectedType]
  );

  const handleApplicabilityChange = (next: Applicability) => {
    setApplicability(next);
    if (next === "not-applicable") {
      setWorkflowStatus("NOT_REQUIRED");
      setNotificationSent(false);
      setAnesthesiaApproved(false);
      setNursingReady(false);
      return;
    }
    setWorkflowStatus("DRAFT");
  };

  const handleSendForAnesthesiaReview = async () => {
    try {
      if (!linkedDocumentId) {
        console.error("Cannot request anesthesia review: linkedDocumentId is missing");
        return;
      }

      const response = await fetch(
        `/api/modules/informed-consents/documents/${linkedDocumentId}/anesthesia-workflow`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "REQUEST_ANESTHESIA_REVIEW" }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to request anesthesia review");
      }

      setNotificationSent(true);
      setWorkflowStatus("PENDING_REVIEW");
    } catch (error) {
      console.error("Failed to request anesthesia review", error);
    }
  };

  const handleStartAnesthesiaReview = async () => {
    try {
      if (linkedDocumentId) {
        await fetch(`/api/modules/informed-consents/documents/${linkedDocumentId}/anesthesia-workflow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "START_ANESTHESIA_REVIEW" }),
        });
      }

      setWorkflowStatus("IN_REVIEW");
    } catch (error) {
      console.error("Failed to start anesthesia review", error);
    }
  };

  const handleApproveAnesthesia = async () => {
    try {
      if (linkedDocumentId) {
        await fetch(`/api/modules/informed-consents/documents/${linkedDocumentId}/anesthesia-workflow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "APPROVE_ANESTHESIA" }),
        });
      }

      setAnesthesiaApproved(true);
      setNotificationSent(true);
      setWorkflowStatus("NURSING_PREPARATION_REQUIRED");
    } catch (error) {
      console.error("Failed to approve anesthesia", error);
    }
  };

  const handleConfirmNursingReadiness = async () => {
    try {
      if (linkedDocumentId) {
        await fetch(`/api/modules/informed-consents/documents/${linkedDocumentId}/anesthesia-workflow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "CONFIRM_NURSING_READY" }),
        });
      }

      setNursingReady(true);
      setWorkflowStatus("NURSING_READY");
    } catch (error) {
      console.error("Failed to confirm nursing readiness", error);
    }
  };

  const handleComplete = () => {
    const validationIds = anesthesiaApplies
      ? [
          "v6",
          "v7",
          "v8",
          "anesthesia-applies",
          "anesthesiologist-review-required",
          notificationSent ? "anesthesia-review-request-sent" : "anesthesia-review-request-not-sent",
          anesthesiaApproved ? "anesthesia-review-approved" : "anesthesia-review-pending",
          nursingReady ? "nursing-readiness-confirmed" : "nursing-readiness-pending",
          `anesthesia-type-${selectedType}`,
        ]
      : ["v6", "v7", "v8", "anesthesia-not-applicable"];

    onComplete("anesthesia", validationIds, {
      anesthesia: {
        applies: anesthesiaApplies,
        status: workflowStatus,
        statusLabel: currentStatus.en,
        statusLabelAr: currentStatus.ar,
        typeId: anesthesiaApplies && anesthesiaApproved ? selectedType : null,
        typeLabel: anesthesiaApplies && anesthesiaApproved ? selectedAnesthesiaType.label : "Pending anesthesiologist review",
        typeLabelAr: anesthesiaApplies && anesthesiaApproved ? selectedAnesthesiaType.labelAr : "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0645\u0631\u0627\u062c\u0639\u0629 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631",
        anesthesiologistRequired: anesthesiaApplies,
        notificationSent,
        anesthesiaApproved,
        nursingReady,
        asaClass: anesthesiaApplies && anesthesiaApproved ? asaClass : null,
        airwayClass: anesthesiaApplies && anesthesiaApproved ? airwayClass : null,
        fastingAcknowledged,
        clinicalNotes,
        postInstructions,
        auditEvents: anesthesiaApplies
          ? [
              notificationSent ? "Sent to anesthesiologist" : "Anesthesia review request not sent",
              anesthesiaApproved ? "Reviewed and approved by anesthesiologist" : "Anesthesia review pending",
              nursingReady ? "Nursing readiness confirmed" : "Nursing readiness pending",
            ]
          : ["Anesthesia marked as not required"],
      },
    });
    onNext();
  };

  return (
    <div className="p-8 space-y-6" dir={dir}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-[#002B5C]">
            {isAr ? "\u0648\u062d\u062f\u0629 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Anesthesia Module"}
          </h2>
          <p className="text-sm text-[#6B7280] mt-1">
            {isAr
              ? "\u0645\u0633\u0627\u0631 \u0645\u0648\u062d\u062f \u062f\u0627\u062e\u0644 \u0646\u0641\u0633 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629: \u0627\u0644\u062c\u0631\u0627\u062d \u064a\u0637\u0644\u0628 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062a\u062e\u062f\u064a\u0631\u060c \u0648\u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u064a\u0643\u0645\u0644 \u0648\u064a\u0639\u062a\u0645\u062f \u0642\u0633\u0645 \u0627\u0644\u062a\u062e\u062f\u064a\u0631\u060c \u062b\u0645 \u064a\u062a\u0645 \u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u062c\u0631\u0627\u062d \u0648\u0627\u0644\u062a\u0645\u0631\u064a\u0636."
              : "Unified workflow within the same consent: the surgeon requests anesthesia review, the anesthesiologist completes and approves the anesthesia section, then surgeon and nursing are notified."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ClinicalBadge variant="info" label={isAr ? roleLabels[role].ar : roleLabels[role].en} dot />
          <ClinicalBadge variant={currentStatus.variant} label={isAr ? currentStatus.ar : currentStatus.en} dot />
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#002B5C]" />
          <div>
            <p className="text-sm font-semibold text-[#002B5C]">
              {isAr ? "\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0633\u0631\u064a\u0631\u064a\u0629" : "Clinical Permission Rule"}
            </p>
            <p className="mt-1 text-xs text-blue-900">
              {isAr
                ? "\u0627\u0644\u062c\u0631\u0627\u062d \u0644\u0627 \u064a\u062d\u062f\u062f \u0646\u0648\u0639 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064a. \u064a\u062a\u0645 \u0627\u0644\u062a\u062d\u062f\u064a\u062f \u0648\u0627\u0644\u0627\u0639\u062a\u0645\u0627\u062f \u0645\u0646 \u0642\u0628\u0644 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0641\u0642\u0637\u060c \u0648\u0627\u0644\u062a\u0645\u0631\u064a\u0636 \u064a\u0624\u0643\u062f \u0627\u0644\u062c\u0627\u0647\u0632\u064a\u0629 \u062f\u0648\u0646 \u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0637\u0628\u064a."
                : "The surgeon does not decide the final anesthesia type. The anesthesiologist alone completes and approves anesthesia details, while nursing confirms readiness without changing clinical content."}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
        <h3 className="text-[#2F2F2F] mb-4">
          {isAr ? "\u0647\u0644 \u064a\u062d\u062a\u0627\u062c \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0625\u0644\u0649 \u0645\u0631\u0627\u062c\u0639\u0629 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631\u061f" : "Does this procedure require anesthesiologist review?"}
        </h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            disabled={!isSurgeon}
            onClick={() => handleApplicabilityChange("not-applicable")}
            className={`rounded-lg border p-4 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
              !anesthesiaApplies
                ? "border-emerald-500 bg-emerald-50"
                : "border-[#D8DCE3] hover:bg-[#F4F6F9]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-emerald-700" />
              <span className="font-semibold text-[#2F2F2F]">
                {isAr ? "\u0644\u0627 \u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629 \u062a\u062e\u062f\u064a\u0631" : "No Anesthesia Review Required"}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              {isAr
                ? "\u064a\u0633\u062a\u0645\u0631 \u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u062f\u0648\u0646 \u062a\u0648\u0642\u064a\u0639 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631."
                : "The consent continues without anesthesiologist sign-off."}
            </p>
          </button>

          <button
            type="button"
            disabled={!isSurgeon}
            onClick={() => handleApplicabilityChange("applies")}
            className={`rounded-lg border p-4 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
              anesthesiaApplies
                ? "border-[#002B5C] bg-blue-50"
                : "border-[#D8DCE3] hover:bg-[#F4F6F9]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#002B5C]" />
              <span className="font-semibold text-[#2F2F2F]">
                {isAr ? "\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629 \u062a\u062e\u062f\u064a\u0631" : "Requires Anesthesia Review"}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              {isAr
                ? "\u064a\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0642\u0633\u0645 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0636\u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629."
                : "The anesthesia section is routed for review within the same consent."}
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
                  ? "\u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u063a\u064a\u0631 \u0645\u0637\u0644\u0648\u0628 \u0644\u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621"
                  : "Anesthesia is not required for this procedure"}
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                {isAr
                  ? "\u0633\u064a\u062a\u0645 \u062a\u062c\u0627\u0648\u0632 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062a\u062e\u062f\u064a\u0631\u060c \u0648\u064a\u0645\u0643\u0646 \u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0644 \u0625\u0644\u0649 \u0627\u0644\u0625\u0641\u0635\u0627\u062d\u0627\u062a."
                  : "Anesthesia review will be skipped and the consent may proceed to disclosures."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isSurgeon && (
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[#2F2F2F]">
                    {isAr ? "\u0625\u0631\u0633\u0627\u0644 \u0642\u0633\u0645 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629" : "Send Anesthesia Section for Review"}
                  </h3>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {isAr
                      ? "\u064a\u0642\u0648\u0645 \u0627\u0644\u062c\u0631\u0627\u062d \u0628\u0637\u0644\u0628 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0641\u0642\u0637. \u0646\u0648\u0639 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0648ASA \u0648NPO \u0648\u0645\u062e\u0627\u0637\u0631 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u064a\u062a\u0645 \u0627\u0633\u062a\u0643\u0645\u0627\u0644\u0647\u0627 \u0645\u0646 \u0642\u0628\u0644 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631."
                      : "The surgeon only requests review. Anesthesia type, ASA, NPO, and anesthesia risks are completed by the anesthesiologist."}
                  </p>
                </div>
                <ClipboardCheck className="h-5 w-5 text-[#002B5C]" />
              </div>

              <div className="mt-4 rounded border border-[#D8DCE3] bg-[#F8F9FB] p-3 text-xs text-[#4B5563]">
                <div className="font-semibold text-[#002B5C]">
                  {isAr ? "\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0648\u062c\u064a\u0647" : "Routing Status"}
                </div>
                <div className="mt-2 space-y-1">
                  <div>{isAr ? "\u0627\u0644\u062c\u0631\u0627\u062d: \u0637\u0644\u0628 \u0645\u0631\u0627\u062c\u0639\u0629 \u0641\u0642\u0637" : "Surgeon: request review only"}</div>
                  <div>{isAr ? "\u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631: \u0645\u0631\u0627\u062c\u0639\u0629 + \u062a\u0639\u062f\u064a\u0644 + \u0627\u0639\u062a\u0645\u0627\u062f" : "Anesthesiologist: review + edit + approve"}</div>
                  <div>{isAr ? "\u0627\u0644\u062a\u0645\u0631\u064a\u0636: \u0639\u0631\u0636 \u0627\u0644\u062e\u0637\u0629 + \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062c\u0627\u0647\u0632\u064a\u0629" : "Nursing: view plan + confirm readiness"}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendForAnesthesiaReview}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded bg-[#002B5C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-900"
              >
                <Send className="h-3.5 w-3.5" />
                {notificationSent
                  ? isAr
                    ? "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0642\u0633\u0645 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629"
                    : "Anesthesia Section Sent for Review"
                  : isAr
                    ? "\u0625\u0631\u0633\u0627\u0644 \u0642\u0633\u0645 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629"
                    : "Send Anesthesia Section for Review"}
              </button>
            </div>
          )}

          {isAnesthesiologist && (
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[#2F2F2F]">
                    {isAr ? "\u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Anesthesia Review and Approval"}
                  </h3>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {isAr
                      ? "\u064a\u0642\u0648\u0645 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0628\u0627\u0633\u062a\u0643\u0645\u0627\u0644 \u0627\u0644\u0642\u0633\u0645 \u062f\u0627\u062e\u0644 \u0646\u0641\u0633 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u062f\u0648\u0646 \u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u0627\u0631 \u0645\u0633\u062a\u0642\u0644."
                      : "The anesthesiologist completes this section within the same consent without a separate workflow."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartAnesthesiaReview}
                  className="inline-flex items-center gap-2 rounded border border-[#002B5C] px-3 py-1.5 text-xs font-medium text-[#002B5C] hover:bg-blue-50"
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  {isAr ? "\u0628\u062f\u0621 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629" : "Start Review"}
                </button>
              </div>

              <div className="mt-5 bg-white border border-[#D8DCE3] rounded-lg p-5">
                <h4 className="text-[#2F2F2F] mb-4">
                  {isAr ? "\u0646\u0648\u0639 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Anesthesia Type"}
                </h4>
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

              <div className="mt-5 bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
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
                          <select
                            value={asaClass}
                            onChange={(event) => setAsaClass(event.target.value)}
                            className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]"
                          >
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
                          <select
                            value={airwayClass}
                            onChange={(event) => setAirwayClass(event.target.value)}
                            className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]"
                          >
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
                          {isAr ? "\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Anesthesiologist Clinical Notes"}
                        </label>
                        <textarea
                          rows={3}
                          value={clinicalNotes}
                          onChange={(event) => setClinicalNotes(event.target.value)}
                          placeholder={isAr ? "\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0633\u0631\u064a\u0631\u064a\u0629 \u062e\u0627\u0635\u0629 \u0628\u0627\u0644\u062a\u062e\u062f\u064a\u0631..." : "Anesthesia clinical notes..."}
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
                        value={postInstructions}
                        onChange={(event) => setPostInstructions(event.target.value)}
                        className={`w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] resize-none ${isAr ? "text-right" : ""}`}
                        dir={dir}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-900">
                    {isAr ? "\u0627\u0639\u062a\u0645\u0627\u062f \u0642\u0633\u0645 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Approve Anesthesia Section"}
                  </p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {isAr
                      ? "\u0639\u0646\u062f \u0627\u0644\u0627\u0639\u062a\u0645\u0627\u062f \u064a\u062a\u0645 \u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u062c\u0631\u0627\u062d \u0648\u0627\u0644\u062a\u0645\u0631\u064a\u0636 \u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u0645\u0631\u064a\u0636."
                      : "Approval notifies the surgeon and nursing team to continue patient readiness."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApproveAnesthesia}
                  className="inline-flex items-center justify-center gap-2 rounded bg-emerald-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-800"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  {anesthesiaApproved
                    ? isAr
                      ? "\u062a\u0645 \u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u062a\u062e\u062f\u064a\u0631"
                      : "Anesthesia Approved"
                    : isAr
                      ? "\u0627\u0639\u062a\u0645\u0627\u062f \u0642\u0633\u0645 \u0627\u0644\u062a\u062e\u062f\u064a\u0631"
                      : "Approve Anesthesia"}
                </button>
              </div>
            </div>
          )}

          {isNurse && (
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[#2F2F2F]">
                    {isAr ? "\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062a\u0645\u0631\u064a\u0636 \u0644\u0644\u062a\u062e\u062f\u064a\u0631" : "Nursing Preparation Readiness"}
                  </h3>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {isAr
                      ? "\u064a\u0639\u0631\u0636 \u0627\u0644\u062a\u0645\u0631\u064a\u0636 \u062e\u0637\u0629 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0648\u062a\u0639\u0644\u064a\u0645\u0627\u062a \u0627\u0644\u0635\u064a\u0627\u0645 \u0648\u064a\u0624\u0643\u062f \u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u0645\u0631\u064a\u0636 \u062f\u0648\u0646 \u062a\u0639\u062f\u064a\u0644 \u0642\u0631\u0627\u0631 \u0627\u0644\u062a\u062e\u062f\u064a\u0631."
                      : "Nursing views the anesthesia plan and NPO instructions, then confirms readiness without editing clinical anesthesia decisions."}
                  </p>
                </div>
                <Bell className="h-5 w-5 text-[#002B5C]" />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  { title: isAr ? "\u062e\u0637\u0629 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Anesthesia Plan", value: isAr ? selectedAnesthesiaType.labelAr : selectedAnesthesiaType.label },
                  { title: isAr ? "\u062a\u0635\u0646\u064a\u0641 ASA" : "ASA", value: asaClass },
                  { title: isAr ? "\u062a\u0639\u0644\u064a\u0645\u0627\u062a NPO" : "NPO", value: fastingAcknowledged ? (isAr ? "\u0645\u0624\u0643\u062f\u0629" : "Confirmed") : (isAr ? "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0623\u0643\u064a\u062f" : "Pending confirmation") },
                ].map((item) => (
                  <div key={item.title} className="rounded border border-[#D8DCE3] bg-[#F8F9FB] p-3">
                    <div className="text-xs font-semibold text-[#6B7280]">{item.title}</div>
                    <div className="mt-1 text-sm text-[#2F2F2F]">{item.value}</div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleConfirmNursingReadiness}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded bg-[#002B5C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-900"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                {nursingReady
                  ? isAr
                    ? "\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062a\u0645\u0631\u064a\u0636"
                    : "Nursing Readiness Confirmed"
                  : isAr
                    ? "\u062a\u0623\u0643\u064a\u062f \u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062a\u0645\u0631\u064a\u0636"
                    : "Confirm Nursing Readiness"}
              </button>
            </div>
          )}
        </>
      )}

      <div className="rounded-lg border border-[#D8DCE3] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#002B5C]">
          {isAr ? "\u0645\u0644\u062e\u0635 \u0633\u064a\u0631 \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Anesthesia Workflow Summary"}
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-4">
          {[
            { done: anesthesiaApplies || workflowStatus === "NOT_REQUIRED", label: isAr ? "\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u062d\u0627\u062c\u0629" : "Need Identified" },
            { done: notificationSent || workflowStatus === "NOT_REQUIRED", label: isAr ? "\u0625\u0631\u0633\u0627\u0644 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629" : "Sent for Review" },
            { done: anesthesiaApproved || workflowStatus === "NOT_REQUIRED", label: isAr ? "\u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u062a\u062e\u062f\u064a\u0631" : "Anesthesia Approved" },
            { done: nursingReady || workflowStatus === "NOT_REQUIRED", label: isAr ? "\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062a\u0645\u0631\u064a\u0636" : "Nursing Ready" },
          ].map((item) => (
            <div key={item.label} className={`rounded border p-3 ${item.done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-[#D8DCE3] bg-[#F8F9FB] text-[#6B7280]"}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-3.5 w-3.5 ${item.done ? "text-emerald-600" : "text-[#9CA3AF]"}`} />
                <span>{item.label}</span>
              </div>
            </div>
          ))}
        </div>
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
          className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors"
        >
          {isAr ? "\u0645\u062a\u0627\u0628\u0639\u0629 \u0625\u0644\u0649 \u0627\u0644\u0625\u0641\u0635\u0627\u062d\u0627\u062a" : "Continue to Disclosures"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}



