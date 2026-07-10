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
}

export function ApprovedPdfViewer({ assembly, loading = false, reviewed, onOpenPreview, onMarkReviewed }: ApprovedPdfViewerProps) {
  const { lang } = useI18n();
  const consentForm = assembly?.consentForm;
  const approvedPdfUrl = resolveAssemblyApprovedPdfUrl(assembly);
  const patientCopyPdfUrl = resolveAssemblyPatientCopyPdfUrl(assembly);
  const hasApprovedPdfSource = isAssemblyApprovedPdfSourceVerified(assembly);
  return (
    <WorkspaceCard className="overflow-hidden">
      <WorkspaceCardHeader
        icon={<FileCheck2 className="size-5" />}
        title={lang === "ar" ? "Ø¹Ø§Ø±Ø¶ Ø§Ù„Ù€ PDF Ø§Ù„Ù…Ø¹ØªÙ…Ø¯" : "Approved PDF viewer"}
        description={lang === "ar" ? "ÙŠØ¹Ø±Ø¶ Ø§Ù„Ù…ØµØ¯Ø± Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ Ø§Ù„ÙØ¹Ù„ÙŠ Ø§Ù„Ù‚Ø§Ø¯Ù… Ù…Ù† ØªØ¯ÙÙ‚ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ø­Ø§Ù„ÙŠ Ø¯ÙˆÙ† Ø£ÙŠ Ø¨Ø¯Ø§Ø¦Ù„ Ø£Ùˆ Ù†Øµ Ù…ÙˆÙ„Ø¯." : "Displays the real approved source from the current consent flow with no placeholders or generated consent text."}
        action={
          hasApprovedPdfSource ? (
            <WorkspaceBadge tone="green">
              <ShieldCheck className="size-3.5" /> {lang === "ar" ? "Ø§Ù„Ù…ØµØ¯Ø± Ù…Ø¹ØªÙ…Ø¯" : "Source verified"}
            </WorkspaceBadge>
          ) : null
        }
      />

      <div className="space-y-4 px-5 py-5">
        {loading ? (
          <LoadingState
            title={lang === "ar" ? "Ø¬Ø§Ø±ÙŠ ØªØ¬Ù‡ÙŠØ² Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©" : "Preparing preview"}
            message={lang === "ar" ? "ÙŠØªÙ… ØªØ­Ù…ÙŠÙ„ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ù€ IMC Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ ÙˆØ±Ø¨Ø· Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø¯ÙˆÙ† ØªØºÙŠÙŠØ± Ø§Ù„Ù…Ù†Ø·Ù‚." : "Loading the approved IMC form and current field bindings without changing logic."}
          />
        ) : !assembly ? (
          <EmptyState
            title={lang === "ar" ? "Ù„Ù… ÙŠØªÙ… ØªØ­Ù…ÙŠÙ„ Ø­Ø²Ù…Ø© Ø¨Ø¹Ø¯" : "No package loaded yet"}
            message={lang === "ar" ? "Ø§Ø®ØªØ± Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø«Ù… Ø­Ù…Ù‘Ù„ Ø§Ù„Ø­Ø²Ù…Ø© Ù„Ø¥Ø¸Ù‡Ø§Ø± Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ù€ PDF Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ Ù‡Ù†Ø§." : "Select the procedure and load the package to display the approved PDF here."}
          />
        ) : !hasApprovedPdfSource ? (
          <ErrorState
            title={lang === "ar" ? "Ù…ØµØ¯Ø± Ø§Ù„Ù€ PDF Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ ØºÙŠØ± Ù…ØªØ§Ø­" : "Approved PDF source unavailable"}
            message={lang === "ar" ? "ÙØ´Ù„-Ø§Ù„Ø¥ØºÙ„Ø§Ù‚ Ù…Ø§ Ø²Ø§Ù„ ÙØ¹Ø§Ù„Ø§Ù‹. Ù„Ø§ ÙŠÙ…ÙƒÙ† Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø£Ùˆ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ø­ØªÙ‰ ÙŠØªÙˆÙØ± Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ Ø§Ù„ÙØ¹Ù„ÙŠ Ù…Ù† Ù†ÙØ³ Ù…Ø³Ø§Ø± Ø§Ù„Ø­ÙˆÙƒÙ…Ø©." : "Fail-closed governance remains active. Preview review and sending stay blocked until the actual approved form is available from the same governance path."}
          />
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-4">
              <WorkspaceField label={lang === "ar" ? "Ù…Ø¹Ø±Ù Ø§Ù„Ù†Ù…ÙˆØ°Ø¬" : "Form ID"} value={consentForm?.id || "â€”"} mono />
              <WorkspaceField label={lang === "ar" ? "Ø±Ù…Ø² Ø§Ù„Ù†Ù…ÙˆØ°Ø¬" : "Form code"} value={consentForm?.code || "â€”"} mono />
              <WorkspaceField label={lang === "ar" ? "Ø§Ù„Ø¥ØµØ¯Ø§Ø±" : "Version"} value={consentForm?.version || "â€”"} />
              <WorkspaceField label={lang === "ar" ? "Ø§Ù„Ù†ÙˆØ¹" : "Form type"} value={consentForm?.formType || "â€”"} />
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#172554_100%)] px-5 py-3 text-white">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">
                    {lang === "ar" ? "Ù…ØµØ¯Ø± Ù…Ø¹ØªÙ…Ø¯ ÙØ¹Ù„ÙŠ" : "Real approved source"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">{consentForm?.titleEn || assembly.procedureNameEn}</p>
                </div>
                <div className="flex items-center gap-2">
                  {reviewed ? (
                    <WorkspaceBadge tone="green">
                      <CheckCircle2 className="size-3.5" /> {lang === "ar" ? "ØªÙ…Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©" : "Preview reviewed"}
                    </WorkspaceBadge>
                  ) : null}
                  <Button variant="outline" size="sm" uppercase={false} className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={onOpenPreview}>
                    <Eye className="mr-1 size-3.5" /> {lang === "ar" ? "ÙØªØ­ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø©" : "Open full preview"}
                  </Button>
                </div>
              </div>

              <PdfObjectEmbedViewer
                title={lang === "ar" ? "Ù…Ø¹Ø§ÙŠÙ†Ø© Ù…Ù„Ù Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ù…Ø¹ØªÙ…Ø¯" : "Approved consent PDF preview"}
                src={approvedPdfUrl}
                className="rounded-none border-0 shadow-none"
                viewerClassName="h-[72vh] min-h-[720px]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {lang === "ar" ? "Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù…ØµØ¯Ø± ÙˆØ§Ù„Ø¥Ø±Ø³Ø§Ù„" : "Source review & dispatch gate"}
                </p>
                <p className="mt-1 truncate text-sm text-slate-700">{approvedPdfUrl}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={approvedPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                  <ExternalLink className="size-3.5" /> {lang === "ar" ? "فتح نموذج التوقيع" : "Open signing form"}
                </a>
                {patientCopyPdfUrl ? (
                  <a href={patientCopyPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100">
                    <ExternalLink className="size-3.5" /> {lang === "ar" ? "فتح نسخة المريض" : "Open patient copy"}
                  </a>
                ) : null}
                <Button variant={reviewed ? "outline" : "brand"} size="sm" uppercase={false} disabled={reviewed} className="rounded-xl" onClick={onMarkReviewed}>
                  {reviewed ? (lang === "ar" ? "ØªÙ… ÙˆØ³Ù… Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©" : "Marked reviewed") : (lang === "ar" ? "ØªØ£ÙƒÙŠØ¯ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©" : "Mark Preview Reviewed")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </WorkspaceCard>
  );
}

