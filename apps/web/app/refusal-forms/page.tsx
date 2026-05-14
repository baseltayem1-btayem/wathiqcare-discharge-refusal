"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Download,
  PenTool,
  FileSignature
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/ui/StatusBadge";
import StatCard from "@/components/ui/StatCard";
import Modal from "@/components/ui/Modal";
import ActionButton from "@/components/ui/ActionButton";
import { useI18n } from "@/i18n/I18nProvider";
import { refusalFormsService } from "@/lib/services/refusalForms.service";
import type { RefusalForm, SignatureData, RefusalFormType } from "@/types/refusal-forms";
import { downloadProtectedDocument } from "@/utils/protectedDocuments";

const FORM_TYPE_LABELS: Record<RefusalFormType, string> = {
  discharge_refusal: "Discharge Refusal Form",
  financial_responsibility: "Financial Responsibility Notice",
  home_healthcare: "Home Healthcare Agreement",
};

export default function RefusalFormsPage() {
  const { lang } = useI18n();
  const txt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [forms, setForms] = useState<RefusalForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<RefusalForm | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureData>({
    signerName: "",
    signerRelation: "",
    witnessName: "",
    witnessTitle: "",
    acknowledgedRisks: false,
    acknowledgedFinancial: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  async function loadForms() {
    setLoading(true);
    try {
      const data = await refusalFormsService.listForms();
      setForms(data);
    } catch (error) {
      console.error("Failed to load forms:", error);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    return {
      pending: forms.filter((f) => f.status === "pending").length,
      signed: forms.filter((f) => f.status === "signed").length,
      escalated: forms.filter((f) => f.status === "escalated").length,
      total: forms.length,
    };
  }, [forms]);

  function openDetails(form: RefusalForm) {
    setSelectedForm(form);
    setShowDetailsModal(true);
  }

  function openSignModal(form: RefusalForm) {
    setSelectedForm(form);
    setSignatureData({
      signerName: form.patientName || "",
      signerRelation: "Patient",
      witnessName: "",
      witnessTitle: "",
      acknowledgedRisks: false,
      acknowledgedFinancial: false,
    });
    setShowSignModal(true);
  }

  async function handleSignForm() {
    if (!selectedForm) return;

    if (!signatureData.acknowledgedRisks || !signatureData.acknowledgedFinancial) {
      alert(txt("Please acknowledge all requirements before signing.", "يرجى الإقرار بجميع المتطلبات قبل التوقيع."));
      return;
    }

    setSubmitting(true);
    try {
      await refusalFormsService.signForm(selectedForm.id, signatureData);

      // Update local state
      setForms((prev) =>
        prev.map((f) =>
          f.id === selectedForm.id
            ? {
              ...f,
              status: "signed",
              signedAt: new Date().toISOString(),
              signerName: signatureData.signerName,
              witnessName: signatureData.witnessName,
            }
            : f
        )
      );

      setShowSignModal(false);
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Failed to sign form:", error);
      alert(txt("Failed to sign form. Please try again.", "تعذر توقيع النموذج. يرجى المحاولة مرة أخرى."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload(form: RefusalForm) {
    if (!form.documentUrl) return;

    try {
      await downloadProtectedDocument(form.documentUrl, `${form.caseNumber || form.id}.html`);
    } catch (error) {
      console.error("Failed to download form:", error);
      alert(txt("Failed to download form. Please try again.", "تعذر تنزيل النموذج. يرجى المحاولة مرة أخرى."));
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={txt("Refusal Forms", "نماذج رفض الخروج")}
        subtitle={txt("Manage and track discharge refusal forms and financial responsibility notices.", "إدارة وتتبع نماذج رفض الخروج وإشعارات المسؤولية المالية.")}
        actions={
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <FileText className="h-4 w-4" />
            {txt("View Cases", "عرض الحالات")}
          </Link>
        }
      >
        {/* Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={txt("Total Forms", "إجمالي النماذج")}
            value={loading ? "-" : stats.total}
            icon={<FileText className="h-5 w-5" />}
            variant="default"
          />
          <StatCard
            title={txt("Pending Signature", "بانتظار التوقيع")}
            value={loading ? "-" : stats.pending}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <StatCard
            title={txt("Signed", "موقعة")}
            value={loading ? "-" : stats.signed}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title={txt("Escalated", "مصعدة")}
            value={loading ? "-" : stats.escalated}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="error"
          />
        </div>

        {/* Forms List */}
        <div className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{txt("Refusal Forms", "نماذج رفض الخروج")}</h2>

          {loading ? (
            <p className="text-sm text-slate-600">{txt("Loading forms...", "جارٍ تحميل النماذج...")}</p>
          ) : forms.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <FileSignature className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">{txt("No refusal forms found", "لم يتم العثور على نماذج رفض")}</p>
              <p className="mt-1 text-xs text-slate-500">{txt("Generated forms will appear here", "ستظهر النماذج المنشأة هنا")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {forms.map((form) => (
                <article
                  key={form.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {form.caseNumber}
                        </h3>
                        <StatusBadge
                          variant={
                            form.status === "signed" ? "success" :
                              form.status === "escalated" ? "escalated" :
                                form.status === "completed" ? "completed" :
                                  "pending"
                          }
                          label={form.status.toUpperCase()}
                        />
                      </div>

                      <p className="mt-1 text-sm text-slate-700">
                        <span className="font-medium">{FORM_TYPE_LABELS[form.formType]}</span>
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {txt("Patient", "المريض")}: {form.patientName}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {txt("Generated", "تم الإنشاء")}: {new Date(form.generatedAt).toLocaleDateString()}
                      </p>

                      {form.signedAt && (
                        <p className="mt-1 text-xs text-emerald-600 font-medium">
                          {txt("Signed", "تم التوقيع")}: {new Date(form.signedAt).toLocaleDateString()}
                        </p>
                      )}

                      {form.attendingPhysician && (
                        <p className="mt-1 text-xs text-slate-600">
                          {txt("Physician", "الطبيب")}: {form.attendingPhysician}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openDetails(form)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {txt("View", "عرض")}
                      </button>

                      {form.status === "pending" && (
                        <button
                          onClick={() => openSignModal(form)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          <PenTool className="h-3.5 w-3.5" />
                          {txt("Sign", "توقيع")}
                        </button>
                      )}

                      {form.documentUrl && (
                        <button
                          onClick={() => {
                            void handleDownload(form);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {txt("Download", "تنزيل")}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* View Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={txt("Form Details", "تفاصيل النموذج")}
          size="lg"
        >
          {selectedForm && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">{txt("Case Number", "رقم الحالة")}</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedForm.caseNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">{txt("Form Type", "نوع النموذج")}</p>
                  <p className="mt-1 text-sm text-slate-900">{FORM_TYPE_LABELS[selectedForm.formType]}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">{txt("Patient Name", "اسم المريض")}</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedForm.patientName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">{txt("Status", "الحالة")}</p>
                  <div className="mt-1">
                    <StatusBadge
                      variant={
                        selectedForm.status === "signed" ? "success" :
                          selectedForm.status === "escalated" ? "escalated" :
                            selectedForm.status === "completed" ? "completed" :
                              "pending"
                      }
                      label={
                        selectedForm.status === "signed"
                          ? txt("SIGNED", "موقّع")
                          : selectedForm.status === "escalated"
                            ? txt("ESCALATED", "مصعّد")
                            : selectedForm.status === "completed"
                              ? txt("COMPLETED", "مكتمل")
                              : txt("PENDING", "قيد الانتظار")
                      }
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">{txt("MRN", "الرقم الطبي (MRN)")}</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedForm.medicalRecordNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">{txt("Patient ID", "هوية المريض")}</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedForm.patientIdNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">{txt("Generated Date", "تاريخ الإنشاء")}</p>
                  <p className="mt-1 text-sm text-slate-900">
                    {new Date(selectedForm.generatedAt).toLocaleString()}
                  </p>
                </div>
                {selectedForm.signedAt && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">{txt("Signed Date", "تاريخ التوقيع")}</p>
                    <p className="mt-1 text-sm text-emerald-700 font-medium">
                      {new Date(selectedForm.signedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedForm.attendingPhysician && (
                <div>
                  <p className="text-xs font-medium text-slate-500">{txt("Attending Physician", "الطبيب المعالج")}</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedForm.attendingPhysician}</p>
                </div>
              )}

              {selectedForm.refusalReason && (
                <div>
                  <p className="text-xs font-medium text-slate-500">{txt("Refusal Reason", "سبب الرفض")}</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedForm.refusalReason}</p>
                </div>
              )}

              {selectedForm.signerName && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-900">{txt("Signature Information", "معلومات التوقيع")}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-emerald-800">
                      {txt("Signer", "الموقّع")}: {selectedForm.signerName}
                    </p>
                    {selectedForm.witnessName && (
                      <p className="text-xs text-emerald-800">
                        {txt("Witness", "الشاهد")}: {selectedForm.witnessName}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Sign Modal */}
        <Modal
          isOpen={showSignModal}
          onClose={() => setShowSignModal(false)}
          title={txt("Sign Refusal Form", "توقيع نموذج رفض الخروج")}
          size="md"
          footer={
            <div className="flex gap-3">
              <ActionButton
                variant="outline"
                onClick={() => setShowSignModal(false)}
              >
                {txt("Cancel", "إلغاء")}
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleSignForm}
                disabled={submitting}
                icon={<PenTool className="h-4 w-4" />}
              >
                {submitting ? txt("Signing...", "جارٍ التوقيع...") : txt("Sign Form", "توقيع النموذج")}
              </ActionButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="signerName" className="block text-sm font-medium text-slate-700">
                {txt("Signer Name *", "اسم الموقّع *")}
              </label>
              <input
                id="signerName"
                type="text"
                title={txt("Signer Name", "اسم الموقّع")}
                value={signatureData.signerName}
                onChange={(e) => setSignatureData({ ...signatureData, signerName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="signerRelation" className="block text-sm font-medium text-slate-700">
                {txt("Relation to Patient *", "صلة القرابة بالمريض *")}
              </label>
              <select
                id="signerRelation"
                title={txt("Relation to Patient", "صلة القرابة بالمريض")}
                value={signatureData.signerRelation}
                onChange={(e) => setSignatureData({ ...signatureData, signerRelation: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">{txt("Select relation", "اختر الصلة")}</option>
                <option value="Patient">{txt("Patient", "المريض")}</option>
                <option value="Guardian">{txt("Legal Guardian", "الولي القانوني")}</option>
                <option value="Family">{txt("Family Member", "أحد أفراد العائلة")}</option>
                <option value="Representative">{txt("Legal Representative", "الممثل القانوني")}</option>
              </select>
            </div>

            <div>
              <label htmlFor="witnessName" className="block text-sm font-medium text-slate-700">
                {txt("Witness Name *", "اسم الشاهد *")}
              </label>
              <input
                id="witnessName"
                type="text"
                title={txt("Witness Name", "اسم الشاهد")}
                value={signatureData.witnessName}
                onChange={(e) => setSignatureData({ ...signatureData, witnessName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="witnessTitle" className="block text-sm font-medium text-slate-700">
                {txt("Witness Title *", "صفة الشاهد *")}
              </label>
              <input
                id="witnessTitle"
                type="text"
                title={txt("Witness Title", "صفة الشاهد")}
                value={signatureData.witnessTitle}
                onChange={(e) => setSignatureData({ ...signatureData, witnessTitle: e.target.value })}
                placeholder={txt("e.g., Nurse, Social Worker", "مثال: ممرض، أخصائي اجتماعي")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="acknowledgeRisks"
                  checked={signatureData.acknowledgedRisks}
                  onChange={(e) => setSignatureData({ ...signatureData, acknowledgedRisks: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  required
                />
                <label htmlFor="acknowledgeRisks" className="text-sm text-slate-700">
                  {txt("I acknowledge that I have been informed of the medical risks associated with refusing the recommended discharge.", "أقر بأنني أُبلغت بالمخاطر الطبية المرتبطة برفض الخروج الموصى به.")}
                </label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="acknowledgeFinancial"
                  checked={signatureData.acknowledgedFinancial}
                  onChange={(e) => setSignatureData({ ...signatureData, acknowledgedFinancial: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  required
                />
                <label htmlFor="acknowledgeFinancial" className="text-sm text-slate-700">
                  {txt("I understand and accept full financial responsibility for any charges incurred beyond the medically necessary period.", "أفهم وأقبل المسؤولية المالية الكاملة عن أي تكاليف تُستحق بعد الفترة الضرورية طبيًا.")}
                </label>
              </div>
            </div>
          </div>
        </Modal>
      </AppShell>
    </AuthGuard>
  );
}
