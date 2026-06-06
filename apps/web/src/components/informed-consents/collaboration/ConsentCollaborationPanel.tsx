"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Gavel,
  MessageSquare,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserRoundCheck,
} from "lucide-react";

type CollaborationEvent = {
  id: string;
  communicationType?: string | null;
  message?: string | null;
  taskStatus?: string | null;
  priority?: string | null;
  action?: string;
  createdAt?: string;
  mentionedUserId?: string | null;
};

type QuickAction = {
  key: "ANESTHESIA_REVIEW" | "SURGEON_REVIEW" | "TASK" | "LEGAL_REVIEW";
  label: string;
  labelAr: string;
  icon: typeof Syringe;
  targetUserId?: string;
  missingTargetMessage: string;
  missingTargetMessageAr: string;
  defaultMessage: string;
  defaultMessageAr: string;
};

export function ConsentCollaborationPanel({
  lang = "en",
  caseId,
  tenantId,
  actorUserId,
  anesthesiologistUserId,
  surgeonUserId,
  legalReviewerUserId,
  nursingUserId,
}: {
  lang?: "en" | "ar";
  caseId?: string;
  tenantId?: string;
  actorUserId?: string;
  anesthesiologistUserId?: string;
  surgeonUserId?: string;
  legalReviewerUserId?: string;
  nursingUserId?: string;
}) {
  const isAr = lang === "ar";
  const [note, setNote] = useState("");
  const [events, setEvents] = useState<CollaborationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: "ANESTHESIA_REVIEW",
        label: "Request Anesthesia Review",
        labelAr: "\u0637\u0644\u0628 \u0645\u0631\u0627\u062c\u0639\u0629 \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631",
        icon: Syringe,
        targetUserId: anesthesiologistUserId,
        missingTargetMessage: "Anesthesiologist user is not selected.",
        missingTargetMessageAr: "\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631.",
        defaultMessage: "Please review the anesthesia consent before the unified patient notification is sent.",
        defaultMessageAr: "\u064a\u0631\u062c\u0649 \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u0648\u062d\u062f \u0644\u0644\u0645\u0631\u064a\u0636.",
      },
      {
        key: "SURGEON_REVIEW",
        label: "Request Surgeon Review",
        labelAr: "\u0637\u0644\u0628 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062c\u0631\u0627\u062d",
        icon: Stethoscope,
        targetUserId: surgeonUserId,
        missingTargetMessage: "Surgeon user is not selected.",
        missingTargetMessageAr: "\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u062c\u0631\u0627\u062d.",
        defaultMessage: "Please review the surgical consent before the unified patient notification is sent.",
        defaultMessageAr: "\u064a\u0631\u062c\u0649 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u062c\u0631\u0627\u062d\u064a\u0629 \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u0648\u062d\u062f \u0644\u0644\u0645\u0631\u064a\u0636.",
      },
      {
        key: "TASK",
        label: "Request Nursing Clarification",
        labelAr: "\u0637\u0644\u0628 \u062a\u0648\u0636\u064a\u062d \u0645\u0646 \u0627\u0644\u062a\u0645\u0631\u064a\u0636",
        icon: UserRoundCheck,
        targetUserId: nursingUserId,
        missingTargetMessage: "Nursing user is not selected.",
        missingTargetMessageAr: "\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f \u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062a\u0645\u0631\u064a\u0636.",
        defaultMessage: "Please clarify the nursing preparation requirements before sending the consent package.",
        defaultMessageAr: "\u064a\u0631\u062c\u0649 \u062a\u0648\u0636\u064a\u062d \u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062a\u062d\u0636\u064a\u0631 \u0627\u0644\u062a\u0645\u0631\u064a\u0636\u064a \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u062d\u0632\u0645\u0629 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a.",
      },
      {
        key: "LEGAL_REVIEW",
        label: "Request Legal Review",
        labelAr: "\u0637\u0644\u0628 \u0645\u0631\u0627\u062c\u0639\u0629 \u0642\u0627\u0646\u0648\u0646\u064a\u0629",
        icon: Gavel,
        targetUserId: legalReviewerUserId,
        missingTargetMessage: "Legal reviewer user is not selected.",
        missingTargetMessageAr: "\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a.",
        defaultMessage: "Please review the consent wording and legal sufficiency before patient notification.",
        defaultMessageAr: "\u064a\u0631\u062c\u0649 \u0645\u0631\u0627\u062c\u0639\u0629 \u0635\u064a\u0627\u063a\u0629 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0648\u0643\u0641\u0627\u064a\u062a\u0647\u0627 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629 \u0642\u0628\u0644 \u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u0631\u064a\u0636.",
      },
    ],
    [anesthesiologistUserId, surgeonUserId, legalReviewerUserId, nursingUserId],
  );

  async function loadEvents() {
    if (!caseId || !tenantId) return;

    try {
      const response = await fetch(
        `/api/modules/informed-consents/collaboration?caseId=${encodeURIComponent(caseId)}&tenantId=${encodeURIComponent(tenantId)}`,
      );
      const payload = await response.json();

      if (payload?.ok) {
        setEvents(payload.events || []);
      }
    } catch {
      setEvents([]);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, tenantId]);

  async function createEvent({
    type,
    message,
    taskStatus,
    mentionedUserId,
    priority = "NORMAL",
  }: {
    type: string;
    message: string;
    taskStatus?: string;
    mentionedUserId?: string;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  }) {
    setError("");

    if (!caseId || !tenantId || !actorUserId) {
      setError(
        isAr
          ? "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0627\u0644\u0629 \u0623\u0648 \u0627\u0644\u0645\u0646\u0634\u0623\u0629 \u0623\u0648 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644\u0629."
          : "Case, tenant, or actor user data is missing.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/modules/informed-consents/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          tenantId,
          actorUserId,
          communicationType: type,
          message,
          taskStatus,
          mentionedUserId,
          priority,
          visibility: "INTERNAL",
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        setError(payload?.error || (isAr ? "\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0633\u062c\u0644 \u0627\u0644\u062a\u0639\u0627\u0648\u0646." : "Failed to create collaboration event."));
        return;
      }

      setEvents((prev) => [payload.event, ...prev]);
    } catch {
      setError(isAr ? "\u0641\u0634\u0644 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u062e\u0627\u062f\u0645 \u0627\u0644\u062a\u0639\u0627\u0648\u0646 \u0627\u0644\u0633\u0631\u064a\u0631\u064a." : "Server communication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    const value = note.trim();
    if (!value) return;

    await createEvent({
      type: "NOTE",
      message: value,
    });

    setNote("");
  }

  async function addQuickAction(action: QuickAction) {
    if (!action.targetUserId) {
      setError(isAr ? action.missingTargetMessageAr : action.missingTargetMessage);
      return;
    }

    await createEvent({
      type: action.key,
      message: isAr ? action.defaultMessageAr : action.defaultMessage,
      taskStatus: "PENDING",
      mentionedUserId: action.targetUserId,
      priority: action.key === "ANESTHESIA_REVIEW" ? "HIGH" : "NORMAL",
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#D8DCE3] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#002B5C]" />
              <h3 className="text-base font-semibold text-[#002B5C]">
                {isAr ? "\u0627\u0644\u062a\u0639\u0627\u0648\u0646 \u0627\u0644\u0633\u0631\u064a\u0631\u064a \u0642\u0628\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644" : "Pre-Send Clinical Collaboration"}
              </h3>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              {isAr
                ? "\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0648\u0645\u0647\u0627\u0645 \u062f\u0627\u062e\u0644\u064a\u0629 \u0628\u064a\u0646 \u0627\u0644\u062a\u0645\u0631\u064a\u0636 \u0648\u0627\u0644\u062c\u0631\u0627\u062d \u0648\u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0648\u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629 \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u0648\u062d\u062f \u0644\u0644\u0645\u0631\u064a\u0636."
                : "Internal notes and tasks between nursing, surgeon, anesthesia, and legal affairs before sending the unified patient notification."}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isAr ? "\u0645\u0648\u062b\u0642 \u0641\u064a \u0627\u0644\u0633\u062c\u0644" : "Audit-ready"}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isUnavailable = !action.targetUserId;
            const unavailableMessage = isAr ? action.missingTargetMessageAr : action.missingTargetMessage;

            return (
              <button
                key={action.key}
                type="button"
                disabled={loading || isUnavailable}
                title={isUnavailable ? unavailableMessage : undefined}
                aria-disabled={loading || isUnavailable}
                onClick={() => addQuickAction(action)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-start text-sm font-medium transition ${
                  isUnavailable
                    ? "cursor-not-allowed border-[#D8DCE3] bg-[#F3F4F6] text-[#9CA3AF]"
                    : "border-[#D8DCE3] bg-[#F8FAFC] text-[#2F2F2F] hover:border-[#002B5C] hover:bg-white hover:text-[#002B5C]"
                } disabled:opacity-60`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isUnavailable ? "text-[#9CA3AF]" : "text-[#4B9CD3]"}`} />
                <span className="flex flex-col gap-0.5">
                  <span>{isAr ? action.labelAr : action.label}</span>
                  {isUnavailable ? (
                    <span className="text-[11px] font-normal text-[#9CA3AF]">{unavailableMessage}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[#D8DCE3] bg-white p-5">
        <label className="text-sm font-semibold text-[#2F2F2F]">
          {isAr ? "\u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0627\u062d\u0638\u0629 \u0633\u0631\u064a\u0639\u0629" : "Add quick note"}
        </label>

        <div className="mt-2 flex gap-2">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="min-h-[88px] flex-1 resize-none rounded-lg border border-[#D8DCE3] px-3 py-2 text-sm outline-none focus:border-[#002B5C]"
            placeholder={
              isAr
                ? "\u0645\u062b\u0627\u0644: \u064a\u0631\u062c\u0649 \u062a\u0623\u0643\u064a\u062f \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062a\u062e\u062f\u064a\u0631 \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0644\u0644\u0645\u0631\u064a\u0636."
                : "Example: Please confirm anesthesia review before sending the consent to the patient."
            }
          />

          <button
            type="button"
            disabled={loading}
            onClick={addNote}
            className="self-stretch rounded-lg bg-[#002B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#001F42] disabled:opacity-60"
          >
            {isAr ? "\u0625\u0636\u0627\u0641\u0629" : "Add"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#D8DCE3] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[#002B5C]">
            {isAr ? "\u0633\u062c\u0644 \u0627\u0644\u062a\u0639\u0627\u0648\u0646" : "Collaboration Timeline"}
          </h4>
          <span className="text-xs text-[#6B7280]">
            {isAr ? "\u062f\u0627\u062e\u0644\u064a\u061b \u0644\u0627 \u064a\u0631\u0633\u0644 \u0645\u0628\u0627\u0634\u0631\u0629 \u0644\u0644\u0645\u0631\u064a\u0636" : "Internal; not sent directly to patient"}
          </span>
        </div>

        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#D8DCE3] bg-[#F8FAFC] p-4 text-sm text-[#6B7280]">
              {isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0623\u0648 \u0645\u0647\u0627\u0645 \u062d\u062a\u0649 \u0627\u0644\u0622\u0646." : "No collaboration events yet."}
            </div>
          ) : (
            events.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-lg border border-[#EEF1F5] bg-[#F8FAFC] p-3">
                <div className="mt-0.5">
                  {item.taskStatus === "COMPLETED" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-amber-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#2F2F2F]">
                      {item.communicationType || "NOTE"}
                    </p>
                    <span className="rounded-full border border-[#D8DCE3] bg-white px-2 py-0.5 text-[11px] text-[#6B7280]">
                      {item.taskStatus || item.priority || "NORMAL"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-[#6B7280]">{item.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}