"use client";

import { useMemo } from "react";
import { Eye, AlertTriangle, Check, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/design-system";
import { useI18n } from "@/i18n/I18nProvider";
import type { ClinicalKnowledgeAssembly } from "../types";
import { PdfObjectEmbedViewer } from "./PdfObjectEmbedViewer";

interface ConsentPreviewModalProps {
  open: boolean;
  assembly?: ClinicalKnowledgeAssembly;
  reviewMode?: boolean;
  onClose: () => void;
  onMarkReviewed?: () => void;
  reviewed?: boolean;
}

function Section({ title, children }: { title?: string | null; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {title && <h4 className="font-semibold text-xs text-slate-800">{title}</h4>}
      <div className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{children}</div>
    </div>
  );
}

export function ConsentPreviewModal({
  open,
  assembly,
  reviewMode = false,
  onClose,
  onMarkReviewed,
  reviewed,
}: ConsentPreviewModalProps) {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const consentForm = assembly?.consentForm;
  const sections = useMemo(() => {
    return (consentForm?.sections || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
  }, [consentForm]);
  const approvedPdfUrl = consentForm?.pdfTemplateUrl?.trim() || "";
  const consentFormMeta = consentForm as unknown as Record<string, unknown> | undefined;
  const governanceSnapshot = consentForm?.governanceSnapshot as Record<string, unknown> | null | undefined;
  const sourceVerified = Boolean(
    consentFormMeta?.sourceVerified === true ||
      governanceSnapshot?.sourceVerified === true,
  );
  const hasApprovedPdfSource = Boolean(approvedPdfUrl && sourceVerified);

  const approvedIllustrations = useMemo(
    () =>
      (assembly?.illustrations || []).filter(
        (i) => i.imageReviewStatus === "approved" && i.patientFacing && (i.procedureImageUrl || i.anatomyImageUrl),
      ),
    [assembly],
  );

  const draftIllustrations = useMemo(
    () =>
      reviewMode
        ? (assembly?.illustrations || []).filter(
            (i) => i.imageReviewStatus !== "approved" && (i.procedureImageUrl || i.anatomyImageUrl),
          )
        : [],
    [assembly, reviewMode],
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {isAr ? "معاينة الموافقة" : "Consent preview"}
          </DialogTitle>
          <DialogDescription>
            {isAr
              ? "هذه هي النسخة التي سيراها المريض قبل التوقيع."
              : "This is what the patient will see before signing."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-sm text-slate-800">
              {isAr && consentForm?.titleAr ? consentForm.titleAr : consentForm?.titleEn}
            </h3>
            <p className="text-[11px] text-slate-500">
              {consentForm
                ? `${consentForm.formType.replace(/_/g, " ")} • v${consentForm.version} • ${consentForm.riskLevel} risk`
                : assembly
                  ? `${assembly.procedureNameEn} — ${assembly.procedureNameAr || ""}`
                  : "No consent loaded"}
            </p>
          </div>

          {!hasApprovedPdfSource && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? "مصدر ملف الموافقة المعتمد غير متاح. لا يمكن مراجعة المعاينة أو الإرسال بدون النموذج المعتمد الفعلي."
                  : "The approved consent PDF source is unavailable. Preview review and sending are blocked without the actual approved form."}
              </span>
            </div>
          )}

          {hasApprovedPdfSource ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                <PdfObjectEmbedViewer
                  title={isAr ? "معاينة ملف الموافقة المعتمد" : "Approved consent PDF preview"}
                  src={approvedPdfUrl}
                  className="rounded-none border-0 shadow-none"
                  viewerClassName="h-[60vh] min-h-[520px]"
                />
              </div>
              <div className="text-[11px] text-slate-500">
                <a href={approvedPdfUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline underline-offset-2">
                  {isAr ? "فتح ملف الموافقة المعتمد في نافذة جديدة" : "Open the approved consent PDF in a new tab"}
                </a>
              </div>
            </div>
          ) : null}

          {hasApprovedPdfSource && sections.length > 0 ? (
            <div className="space-y-4">
              {sections.map((section) => (
                <Section key={section.id} title={isAr && section.titleAr ? section.titleAr : section.titleEn}>
                  {isAr && section.contentAr ? section.contentAr : section.contentEn}
                </Section>
              ))}
            </div>
          ) : null}

          {assembly && assembly.riskDisclosures.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-slate-800">
                {isAr ? "المخاطر والآثار الجانبية" : "Risks & side effects"}
              </h4>
              <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                {assembly.riskDisclosures.map((risk) => (
                  <li key={risk.id}>
                    <span className="font-medium text-slate-700">
                      {isAr && risk.titleAr ? risk.titleAr : risk.titleEn}
                    </span>
                    {" — "}
                    {isAr && risk.descriptionAr ? risk.descriptionAr : risk.descriptionEn}
                    {risk.incidenceRate && (
                      <span className="text-slate-400 ml-1">({risk.incidenceRate})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {assembly && assembly.educationMaterials.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-slate-800">
                {isAr ? "المواد التعليمية" : "Education materials"}
              </h4>
              <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                {assembly.educationMaterials.map((material) => (
                  <li key={material.id}>
                    {isAr && material.titleAr ? material.titleAr : material.titleEn}
                    {" "}
                    <span className="text-slate-400">
                      ({material.assetType}
                      {material.durationMinutes ? ` • ${material.durationMinutes} min` : ""})
                    </span>
                    {material.status !== "PUBLISHED" && (
                      <span className="ml-1 text-amber-600 font-medium">[Draft]</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {approvedIllustrations.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-slate-800">
                {isAr ? "الرسوم التوضيحية المعتمدة" : "Approved illustrations"}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {approvedIllustrations.map((illustration) => (
                  <div key={illustration.id} className="space-y-1">
                    <p className="text-[10px] font-medium text-slate-700 truncate">
                      {isAr && illustration.procedureNameAr ? illustration.procedureNameAr : illustration.procedureNameEn}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element -- patient-facing preview */}
                    <img
                      src={illustration.procedureImageUrl || illustration.anatomyImageUrl || ""}
                      alt={illustration.procedureNameEn}
                      className="w-full h-28 object-contain rounded border border-slate-200 bg-slate-50"
                    />
                    <p className="text-[9px] text-slate-500">
                      {isAr && illustration.patientDisplayDisclaimerAr
                        ? illustration.patientDisplayDisclaimerAr
                        : illustration.patientDisplayDisclaimerEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {draftIllustrations.length > 0 && (
            <div className="space-y-2 border-t border-dashed border-slate-200 pt-3">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" />
                {isAr ? "رسوم توضيحية مسودة (للمراجعة الداخلية فقط)" : "Draft illustrations (internal review only)"}
              </div>
              <div className="grid grid-cols-2 gap-3 opacity-70">
                {draftIllustrations.map((illustration) => (
                  <div key={illustration.id} className="space-y-1">
                    <p className="text-[10px] font-medium text-slate-700 truncate">
                      {illustration.procedureNameEn}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element -- internal review preview */}
                    <img
                      src={illustration.procedureImageUrl || illustration.anatomyImageUrl || ""}
                      alt={illustration.procedureNameEn}
                      className="w-full h-28 object-contain rounded border border-slate-200 bg-slate-50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onMarkReviewed && (
            <Button
              variant={reviewed ? "outline" : "brand"}
              size="sm"
              uppercase={false}
              onClick={onMarkReviewed}
              disabled={!hasApprovedPdfSource || reviewed}
              className="w-full sm:w-auto"
            >
              {reviewed ? (
                <>
                  <Check className="w-4 h-4 mr-1" /> Reviewed
                </>
              ) : (
                "Mark preview reviewed"
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" uppercase={false} onClick={onClose} className="w-full sm:w-auto">
            <X className="w-4 h-4 mr-1" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
