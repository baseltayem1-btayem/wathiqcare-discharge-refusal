"use client";

import { Bot, CheckCircle2, FileBadge2, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { ClinicalKnowledgeAssembly } from "../../types";
import type { Readiness } from "../../hooks/useProductionWorkspace";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader } from "../WorkspaceAtoms";
import { EmptyState } from "./EmptyState";
import { isAssemblyApprovedPdfSourceVerified } from "../../utils/approvedPdfSource";

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <WorkspaceBadge tone={ok ? "green" : "gold"}>{ok ? "OK" : "Pending"}</WorkspaceBadge>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

interface ComplianceReadinessPanelProps {
  assembly?: ClinicalKnowledgeAssembly;
  readiness: Readiness;
  reviewMode: boolean;
}

export function ComplianceReadinessPanel({ assembly, readiness, reviewMode }: ComplianceReadinessPanelProps) {
  const { lang } = useI18n();
  const consentForm = assembly?.consentForm;
  const approvedPdfUrl = consentForm?.pdfTemplateUrl?.trim() || "";
  const hasApprovedPdfSource = isAssemblyApprovedPdfSourceVerified(assembly);
  const publishedEducation = (assembly?.educationMaterials || []).filter((item) => item.status === "PUBLISHED").length;
  const totalEducation = assembly?.educationMaterials.length || 0;

  return (
    <WorkspaceCard className="overflow-hidden">
      <WorkspaceCardHeader
        icon={<ShieldCheck className="size-5" />}
        title={lang === "ar" ? "لوحة الامتثال والجاهزية" : "Compliance & readiness panel"}
        description={lang === "ar" ? "مؤشرات الحوكمة، الجاهزية القانونية، واستعداد المحتوى قبل الإرسال." : "Governance, legal evidence, and content readiness signals before dispatch."}
      />
      <div className="space-y-4 px-5 py-5">
        {!assembly ? (
          <EmptyState compact title={lang === "ar" ? "بانتظار تحميل الحزمة" : "Awaiting package load"} message={lang === "ar" ? "ستظهر مؤشرات الجاهزية بمجرد حل الإجراء إلى الحزمة المعرفية الحالية." : "Readiness indicators will appear once the procedure resolves to the current clinical package."} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{lang === "ar" ? "مؤشر الحوكمة" : "Governance posture"}</p>
                <p className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-900">
                  <FileBadge2 className="size-4 text-blue-700" />
                  {hasApprovedPdfSource ? (lang === "ar" ? "مصدر PDF موثق" : "Approved PDF verified") : (lang === "ar" ? "المصدر غير مكتمل" : "Source incomplete")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{lang === "ar" ? "الجاهزية القانونية" : "Legal evidence readiness"}</p>
                <p className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-900">
                  <ShieldAlert className="size-4 text-amber-700" />
                  {readiness.previewReviewed && readiness.draftApproved && readiness.allowlisted
                    ? lang === "ar"
                      ? "البوابات القانونية جاهزة"
                      : "Legal gates satisfied"
                    : lang === "ar"
                      ? "بوابات قانونية متبقية"
                      : "Legal gates pending"}
                </p>
              </div>
            </div>

            <StatusRow
              label={lang === "ar" ? "مصدر PDF المعتمد" : "Approved PDF source"}
              ok={hasApprovedPdfSource}
              detail={hasApprovedPdfSource
                ? lang === "ar"
                  ? "يعتمد العرض على pdfTemplateUrl الحالي مع فشل-إغلاق الحوكمة كما هو."
                  : "Viewer is bound to the current pdfTemplateUrl with fail-closed governance unchanged."
                : lang === "ar"
                  ? "لا يوجد مصدر معتمد متاح، لذلك تبقى المراجعة والإرسال محجوبين."
                  : "No approved source is available, so review and send remain blocked."}
            />

            <StatusRow
              label={lang === "ar" ? "الامتثال للمحتوى والتعليم" : "Content & education readiness"}
              ok={readiness.educationReady}
              detail={lang === "ar"
                ? `${publishedEducation} من ${totalEducation} مادة تعليمية منشورة.`
                : `${publishedEducation} of ${totalEducation} education assets are published.`}
            />

            <StatusRow
              label={lang === "ar" ? "الـ AI والاقتراحات السريرية" : "AI & clinical guidance"}
              ok={(assembly.suggestions || []).length >= 0}
              detail={lang === "ar"
                ? `عدد الاقتراحات الحالية: ${assembly.suggestions.length}. هذه اللوحة تعرض الجاهزية فقط ولا تولد نص موافقة جديد.`
                : `Current suggestions: ${assembly.suggestions.length}. This panel reports readiness only and does not generate new consent text.`}
            />

            <StatusRow
              label={lang === "ar" ? "وضع المراجعة الداخلية" : "Internal review mode"}
              ok={reviewMode}
              detail={reviewMode
                ? lang === "ar"
                  ? "التفاصيل الداخلية مفعلة من دون تغيير في تدفق المريض أو الإرسال."
                  : "Internal reviewer detail is enabled without changing patient or dispatch flow."
                : lang === "ar"
                  ? "يمكن تفعيل الوضع لعرض تفاصيل مراجعة إضافية فقط."
                  : "Enable this mode to expose additional reviewer-only detail."}
            />

            <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_100%)] px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="size-4 text-blue-700" />
                <span>{lang === "ar" ? "ضمانات الواجهة" : "Presentation-only safeguards"}</span>
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />{lang === "ar" ? "لا تغيير في public signing routes أو final PDF generation." : "No changes to public signing routes or final PDF generation."}</li>
                <li className="flex items-start gap-2"><Bot className="mt-0.5 size-3.5 shrink-0 text-blue-700" />{lang === "ar" ? "لوحة AI تعرض مؤشرات الجاهزية فقط، ولا تولد محتوى موافقة جديداً." : "AI panel reports readiness only and does not generate new consent content."}</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </WorkspaceCard>
  );
}