"use client";

import { CheckCircle2, Clock3, FileLock2, Link2, ShieldEllipsis } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { SecureSigningResult, TimelineEvent } from "../../types";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader } from "../WorkspaceAtoms";
import { EmptyState } from "./EmptyState";

const STATUS_TONE: Record<TimelineEvent["status"], "green" | "gold" | "red"> = {
  completed: "green",
  pending: "gold",
  blocked: "red",
};

interface AuditEvidenceTimelineProps {
  timeline: TimelineEvent[];
  signingResult?: SecureSigningResult;
}

export function AuditEvidenceTimeline({ timeline, signingResult }: AuditEvidenceTimelineProps) {
  const { lang } = useI18n();

  return (
    <WorkspaceCard className="overflow-hidden">
      <WorkspaceCardHeader
        icon={<ShieldEllipsis className="size-5" />}
        title={lang === "ar" ? "الخط الزمني للتدقيق والأدلة" : "Audit & evidence timeline"}
        description={lang === "ar" ? "تسلسل الأحداث الموثقة الناتجة عن المراجعة والإرسال وسير جلسة التوقيع الحالية." : "Evidence-bearing events from review, dispatch, and the current secure-signing workflow."}
        action={timeline.length ? <WorkspaceBadge tone="green">{timeline.length} {lang === "ar" ? "حدث" : "events"}</WorkspaceBadge> : null}
      />
      <div className="space-y-4 px-5 py-5">
        {signingResult ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{lang === "ar" ? "معرف الجلسة" : "Session ID"}</p>
              <p className="mt-2 break-all text-xs font-medium text-slate-800">{signingResult.sessionId}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{lang === "ar" ? "رابط التوقيع" : "Signing URL"}</p>
              <p className="mt-2 break-all text-xs font-medium text-slate-800">{signingResult.signingUrl}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{lang === "ar" ? "التسليم" : "Delivery"}</p>
              <p className="mt-2 text-xs font-medium text-slate-800">SMS: {signingResult.smsDeliveryStatus} • Email: {signingResult.emailDeliveryStatus || "n/a"}</p>
            </div>
          </div>
        ) : null}

        {timeline.length === 0 ? (
          <EmptyState
            compact
            title={lang === "ar" ? "لا توجد أحداث تدقيق بعد" : "No audit events yet"}
            message={lang === "ar" ? "ستظهر الأدلة الزمنية هنا بعد تنفيذ dry-run أو إرسال جلسة التوقيع للمريض." : "Timeline evidence will appear here after dry-run validation or a patient send action."}
          />
        ) : (
          <div className="space-y-3">
            {timeline.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{lang === "ar" ? event.summaryAr : event.summaryEn}</p>
                    <p className="mt-1 text-xs text-slate-500">{event.actorName} • {new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                  <WorkspaceBadge tone={STATUS_TONE[event.status]}>{event.status}</WorkspaceBadge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> {event.type}</span>
                  {event.evidenceHash ? <span className="inline-flex items-center gap-1 break-all"><FileLock2 className="size-3.5" /> {event.evidenceHash}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
          <div className="flex items-start gap-2">
            <Link2 className="mt-0.5 size-3.5 shrink-0 text-blue-700" />
            <span>
              {lang === "ar"
                ? "هذه اللوحة تعرض الأثر التدقيقي الموجود حالياً فقط. منطق التدقيق، الـ hashes، والروابط التشغيلية الحالية لم يتغير."
                : "This panel only presents existing audit state. Audit logic, evidence hashes, and operational links are unchanged."}
            </span>
          </div>
        </div>
      </div>
    </WorkspaceCard>
  );
}