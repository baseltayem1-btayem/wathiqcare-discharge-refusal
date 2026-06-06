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
        labelAr: "??? ?????? ???? ???????",
        icon: Syringe,
        targetUserId: anesthesiologistUserId,
        missingTargetMessage: "Anesthesiologist user is not selected.",
        missingTargetMessageAr: "?? ??? ????? ???? ???????.",
        defaultMessage: "Please review the anesthesia consent before the unified patient notification is sent.",
        defaultMessageAr: "???? ?????? ?????? ??????? ??? ????? ????? ????????? ?????? ??????.",
      },
      {
        key: "SURGEON_REVIEW",
        label: "Request Surgeon Review",
        labelAr: "??? ?????? ??????",
        icon: Stethoscope,
        targetUserId: surgeonUserId,
        missingTargetMessage: "Surgeon user is not selected.",
        missingTargetMessageAr: "?? ??? ????? ??????.",
        defaultMessage: "Please review the surgical consent before the unified patient notification is sent.",
        defaultMessageAr: "???? ?????? ?????? ??????? ??????? ??? ????? ????? ????????? ?????? ??????.",
      },
      {
        key: "TASK",
        label: "Request Nursing Clarification",
        labelAr: "??? ????? ?? ???????",
        icon: UserRoundCheck,
        targetUserId: nursingUserId,
        missingTargetMessage: "Nursing user is not selected.",
        missingTargetMessageAr: "?? ??? ????? ?????? ???????.",
        defaultMessage: "Please clarify the nursing preparation requirements before sending the consent package.",
        defaultMessageAr: "???? ????? ??????? ??????? ???????? ??? ????? ???? ?????????.",
      },
      {
        key: "LEGAL_REVIEW",
        label: "Request Legal Review",
        labelAr: "??? ?????? ???????",
        icon: Gavel,
        targetUserId: legalReviewerUserId,
        missingTargetMessage: "Legal reviewer user is not selected.",
        missingTargetMessageAr: "?? ??? ????? ??????? ????????.",
        defaultMessage: "Please review the consent wording and legal sufficiency before patient notification.",
        defaultMessageAr: "???? ?????? ????? ???????? ???????? ????????? ??? ????? ??????.",
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
          ? "?????? ?????? ?? ???????? ??? ??????."
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
        setError(payload?.error || (isAr ? "???? ????? ???? ???????." : "Failed to create collaboration event."));
        return;
      }

      setEvents((prev) => [payload.event, ...prev]);
    } catch {
      setError(isAr ? "??? ??? ????? ??????? ???????." : "Server communication failed.");
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
                {isAr ? "??????? ??????? ??? ???????" : "Pre-Send Clinical Collaboration"}
              </h3>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              {isAr
                ? "??????? ????? ?????? ??? ??????? ??????? ????? ??????? ??????? ????????? ??? ????? ????? ????????? ?????? ??????."
                : "Internal notes and tasks between nursing, surgeon, anesthesia, and legal affairs before sending the unified patient notification."}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isAr ? "???? ?? ?????" : "Audit-ready"}
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

            return (
              <button
                key={action.key}
                type="button"
                disabled={loading}
                onClick={() => addQuickAction(action)}
                className="flex items-center gap-3 rounded-lg border border-[#D8DCE3] bg-[#F8FAFC] px-4 py-3 text-start text-sm font-medium text-[#2F2F2F] transition hover:border-[#002B5C] hover:bg-white hover:text-[#002B5C] disabled:opacity-60"
              >
                <Icon className="h-4 w-4 shrink-0 text-[#4B9CD3]" />
                {isAr ? action.labelAr : action.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[#D8DCE3] bg-white p-5">
        <label className="text-sm font-semibold text-[#2F2F2F]">
          {isAr ? "????? ?????? ?????" : "Add quick note"}
        </label>

        <div className="mt-2 flex gap-2">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="min-h-[88px] flex-1 resize-none rounded-lg border border-[#D8DCE3] px-3 py-2 text-sm outline-none focus:border-[#002B5C]"
            placeholder={
              isAr
                ? "????: ???? ????? ?????? ??????? ??? ????? ???????? ??????."
                : "Example: Please confirm anesthesia review before sending the consent to the patient."
            }
          />

          <button
            type="button"
            disabled={loading}
            onClick={addNote}
            className="self-stretch rounded-lg bg-[#002B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#001F42] disabled:opacity-60"
          >
            {isAr ? "?????" : "Add"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#D8DCE3] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[#002B5C]">
            {isAr ? "??? ???????" : "Collaboration Timeline"}
          </h4>
          <span className="text-xs text-[#6B7280]">
            {isAr ? "????? ??? ???? ?????? ??????" : "Internal; not sent directly to patient"}
          </span>
        </div>

        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#D8DCE3] bg-[#F8FAFC] p-4 text-sm text-[#6B7280]">
              {isAr ? "?? ???? ??????? ?? ???? ??? ????." : "No collaboration events yet."}
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