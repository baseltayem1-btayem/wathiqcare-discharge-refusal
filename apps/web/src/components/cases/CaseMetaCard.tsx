"use client";

import { useI18n } from "@/i18n/I18nProvider";

type CaseMetaCardProps = {
  patientName?: string | null;
  patientMrn?: string | null;
  status?: string | null;
  roomNumber?: string | null;
  attendingPhysician?: string | null;
};

function translateStatus(status: string | null | undefined, isArabic: boolean): string {
  if (!status) return "-";
  if (!isArabic) return status;

  const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, "_");

  const statusMap: Record<string, string> = {
    open: "مفتوحة",
    new: "جديدة",
    pending: "قيد الانتظار",
    in_progress: "قيد التنفيذ",
    completed: "مكتملة",
    closed: "مغلقة",
    cancelled: "ملغاة",
    draft: "مسودة",
    final: "نهائية",
    approved: "معتمدة",
    rejected: "مرفوضة",
    escalated: "مُصعّدة",
    on_hold: "معلّقة",
    generated: "تم الإنشاء",
    failed: "فشلت",
  };

  return statusMap[normalized] ?? status;
}

export default function CaseMetaCard({
  patientName,
  patientMrn,
  status,
  roomNumber,
  attendingPhysician,
}: CaseMetaCardProps) {
  const { lang } = useI18n();
  const isArabic = lang === "ar";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">{isArabic ? "بيانات الحالة" : "Case Metadata"}</h3>
      <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-slate-500">{isArabic ? "المريض" : "Patient"}</dt>
          <dd className="font-medium text-slate-900">{patientName || "-"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">MRN</dt>
          <dd className="font-medium text-slate-900">{patientMrn || "-"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{isArabic ? "الحالة" : "Status"}</dt>
          <dd className="font-medium text-slate-900">{translateStatus(status, isArabic)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{isArabic ? "الغرفة" : "Room"}</dt>
          <dd className="font-medium text-slate-900">{roomNumber || "-"}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-slate-500">{isArabic ? "الطبيب المعالج" : "Attending Physician"}</dt>
          <dd className="font-medium text-slate-900">{attendingPhysician || "-"}</dd>
        </div>
      </dl>
    </section>
  );
}
