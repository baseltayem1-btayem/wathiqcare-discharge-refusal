"use client";
import { isAssemblyApprovedPdfSourceVerified, resolveAssemblyApprovedPdfUrl, resolveAssemblyPatientCopyPdfUrl } from "../../utils/approvedPdfSource";

import { CheckCircle2, ExternalLink, Eye, FileCheck2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/design-system";
import { useI18n } from "@/i18n/I18nProvider";
import type { ClinicalKnowledgeAssembly } from "../../types";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader, WorkspaceField } from "../WorkspaceAtoms";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { PdfObjectEmbedViewer } from "../PdfObjectEmbedViewer";

interface ApprovedPdfViewerProps {
  assembly?: ClinicalKnowledgeAssembly;
  loading?: boolean;
  reviewed: boolean;
  onOpenPreview: () => void;
  onMarkReviewed: () => void;
  draftPdfUrl?: string;
  draftPdfLoading?: boolean;
  draftPdfError?: string;
}

export function ApprovedPdfViewer({
  assembly,
  loading = false,
  reviewed,
  onOpenPreview,
  onMarkReviewed,
  draftPdfUrl,
  draftPdfLoading = false,
  draftPdfError,
}: ApprovedPdfViewerProps) {
  const { lang } = useI18n();
  const consentForm = assembly?.consentForm;
  const approvedPdfUrl = resolveAssemblyApprovedPdfUrl(assembly);
  const patientCopyPdfUrl = resolveAssemblyPatientCopyPdfUrl(assembly);
  const hasApprovedPdfSource = isAssemblyApprovedPdfSourceVerified(assembly);
  const displayedPdfUrl = draftPdfUrl || approvedPdfUrl;
  return (
    <WorkspaceCard className="overflow-hidden">
      <WorkspaceCardHeader
        icon={<FileCheck2 className="size-5" />}
        title={lang === "ar" ? "عارض الـ PDF المعتمد" : "Approved PDF viewer"}
        description={lang === "ar" ? "يعرض المصدر المعتمد الفعلي القادم من تدفق الموافقة الحالي دون أي بدائل أو نص مولد." : "Displays the real approved source from the current consent flow with no placeholders or generated consent text."}
        action={
          hasApprovedPdfSource ? (
            <WorkspaceBadge tone="green">
              <ShieldCheck className="size-3.5" /> {lang === "ar" ? "المصدر معتمد" : "Source verified"}
            </WorkspaceBadge>
          ) : null
        }
      />

      <div className="space-y-4 px-5 py-5">
        {loading ? (
          <LoadingState
            title={lang === "ar" ? "جاري تجهيز المعاينة" : "Preparing preview"}
            message={lang === "ar" ? "يتم تحميل نموذج الـ IMC المعتمد وربط الحقول الحالية دون تغيير المنطق." : "Loading the approved IMC form and current field bindings without changing logic."}
          />
        ) : !assembly ? (
          <EmptyState
            title={lang === "ar" ? "لم يتم تحميل حزمة بعد" : "No package loaded yet"}
            message={lang === "ar" ? "اختر الإجراء ثم حمّل الحزمة لإظهار نموذج الـ PDF المعتمد هنا." : "Select the procedure and load the package to display the approved PDF here."}
          />
        ) : !hasApprovedPdfSource ? (
          <ErrorState
            title={lang === "ar" ? "مصدر الـ PDF المعتمد غير متاح" : "Approved PDF source unavailable"}
            message={lang === "ar" ? "فشل-الإغلاق ما زال فعالاً. لا يمكن مراجعة المعاينة أو الإرسال حتى يتوفر النموذج المعتمد الفعلي من نفس مسار الحوكمة." : "Fail-closed governance remains active. Preview review and sending stay blocked until the actual approved form is available from the same governance path."}
          />
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-4">
              <WorkspaceField label={lang === "ar" ? "معرف النموذج" : "Form ID"} value={consentForm?.id || "—"} mono />
              <WorkspaceField label={lang === "ar" ? "رمز النموذج" : "Form code"} value={consentForm?.code || "—"} mono />
              <WorkspaceField label={lang === "ar" ? "الإصدار" : "Version"} value={consentForm?.version || "—"} />
              <WorkspaceField label={lang === "ar" ? "النوع" : "Form type"} value={consentForm?.formType || "—"} />
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#172554_100%)] px-5 py-3 text-white">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">
                    {lang === "ar" ? "مصدر معتمد فعلي" : "Real approved source"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">{consentForm?.titleEn || assembly.procedureNameEn}</p>
                </div>
                <div className="flex items-center gap-2">
                  {reviewed ? (
                    <WorkspaceBadge tone="green">
                      <CheckCircle2 className="size-3.5" /> {lang === "ar" ? "تمت المراجعة" : "Preview reviewed"}
                    </WorkspaceBadge>
                  ) : null}
                  <Button variant="outline" size="sm" className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={onOpenPreview}>
                    <Eye className="mr-1 size-3.5" /> {lang === "ar" ? "فتح المعاينة الكاملة" : "Open full preview"}
                  </Button>
                </div>
              </div>

              {draftPdfLoading ? (
                <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800">
                  Doctor-completed draft is being generated from the approved PDF source.
                </div>
              ) : null}
              {draftPdfError ? (
                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                  {draftPdfError}
                </div>
              ) : null}
              {draftPdfUrl ? (
                <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
                  Showing doctor-completed draft PDF overlay. The original approved PDF remains immutable.
                </div>
              ) : null}

              <PdfObjectEmbedViewer
                title={lang === "ar" ? "معاينة ملف الموافقة المعتمد" : "Approved consent PDF preview"}
                src={displayedPdfUrl}
                className="rounded-none border-0 shadow-none"
                viewerClassName="h-[60vh] min-h-[520px]"
                onLoad={() => {}}
                onError={() => {}}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {lang === "ar" ? "مراجعة المصدر والإرسال" : "Source review & dispatch gate"}
                </p>
                <p className="mt-1 truncate text-sm text-slate-700">{displayedPdfUrl}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {draftPdfUrl ? (
                  <a href={draftPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 shadow-sm transition hover:bg-blue-100">
                    <ExternalLink className="size-3.5" /> Open filled draft
                  </a>
                ) : null}
                <a href={approvedPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                  <ExternalLink className="size-3.5" /> {lang === "ar" ? "\u0641\u062A\u062D \u0646\u0645\u0648\u0630\u062C \u0627\u0644\u062A\u0648\u0642\u064A\u0639" : "Open signing form"}
                </a>
                {patientCopyPdfUrl ? (
                  <a href={patientCopyPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100">
                    <ExternalLink className="size-3.5" /> {lang === "ar" ? "\u0641\u062A\u062D \u0646\u0633\u062E\u0629 \u0627\u0644\u0645\u0631\u064A\u0636" : "Open patient copy"}
                  </a>
                ) : null}
                <Button variant={reviewed ? "outline" : "default"} size="sm" disabled={reviewed} className="rounded-xl" onClick={onMarkReviewed}>
                  {reviewed ? (lang === "ar" ? "تم وسم المعاينة" : "Marked reviewed") : (lang === "ar" ? "تأكيد مراجعة المعاينة" : "Mark Preview Reviewed")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </WorkspaceCard>
  );
}