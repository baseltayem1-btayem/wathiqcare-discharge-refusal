"use client";

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
import { refusalFormsService } from "@/lib/services/refusalForms.service";
import type { RefusalForm, SignatureData, RefusalFormType } from "@/types/refusal-forms";
import { downloadProtectedDocument } from "@/utils/protectedDocuments";

const FORM_TYPE_LABELS: Record<RefusalFormType, string> = {
  discharge_refusal: "Discharge Refusal Form",
  financial_responsibility: "Financial Responsibility Notice",
  home_healthcare: "Home Healthcare Agreement",
};

export default function RefusalFormsPage() {
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
      alert("Please acknowledge all requirements before signing.");
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
      alert("Failed to sign form. Please try again.");
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
      alert("Failed to download form. Please try again.");
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title="Refusal Forms"
        subtitle="Manage and track discharge refusal forms and financial responsibility notices."
        actions={
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <FileText className="h-4 w-4" />
            View Cases
          </Link>
        }
      >
        {/* Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Forms"
            value={loading ? "-" : stats.total}
            icon={<FileText className="h-5 w-5" />}
            variant="default"
          />
          <StatCard
            title="Pending Signature"
            value={loading ? "-" : stats.pending}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <StatCard
            title="Signed"
            value={loading ? "-" : stats.signed}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="Escalated"
            value={loading ? "-" : stats.escalated}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="error"
          />
        </div>

        {/* Forms List */}
        <div className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Refusal Forms</h2>

          {loading ? (
            <p className="text-sm text-slate-600">Loading forms...</p>
          ) : forms.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <FileSignature className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">No refusal forms found</p>
              <p className="mt-1 text-xs text-slate-500">Generated forms will appear here</p>
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
                        Patient: {form.patientName}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Generated: {new Date(form.generatedAt).toLocaleDateString()}
                      </p>

                      {form.signedAt && (
                        <p className="mt-1 text-xs text-emerald-600 font-medium">
                          Signed: {new Date(form.signedAt).toLocaleDateString()}
                        </p>
                      )}

                      {form.attendingPhysician && (
                        <p className="mt-1 text-xs text-slate-600">
                          Physician: {form.attendingPhysician}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openDetails(form)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>

                      {form.status === "pending" && (
                        <button
                          onClick={() => openSignModal(form)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          <PenTool className="h-3.5 w-3.5" />
                          Sign
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
                          Download
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
          title="Form Details"
          size="lg"
        >
          {selectedForm && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">Case Number</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedForm.caseNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Form Type</p>
                  <p className="mt-1 text-sm text-slate-900">{FORM_TYPE_LABELS[selectedForm.formType]}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Patient Name</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedForm.patientName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge
                      variant={
                        selectedForm.status === "signed" ? "success" :
                          selectedForm.status === "escalated" ? "escalated" :
                            selectedForm.status === "completed" ? "completed" :
                              "pending"
                      }
                      label={selectedForm.status.toUpperCase()}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">MRN</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedForm.medicalRecordNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Patient ID</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedForm.patientIdNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Generated Date</p>
                  <p className="mt-1 text-sm text-slate-900">
                    {new Date(selectedForm.generatedAt).toLocaleString()}
                  </p>
                </div>
                {selectedForm.signedAt && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Signed Date</p>
                    <p className="mt-1 text-sm text-emerald-700 font-medium">
                      {new Date(selectedForm.signedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedForm.attendingPhysician && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Attending Physician</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedForm.attendingPhysician}</p>
                </div>
              )}

              {selectedForm.refusalReason && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Refusal Reason</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedForm.refusalReason}</p>
                </div>
              )}

              {selectedForm.signerName && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-900">Signature Information</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-emerald-800">
                      Signer: {selectedForm.signerName}
                    </p>
                    {selectedForm.witnessName && (
                      <p className="text-xs text-emerald-800">
                        Witness: {selectedForm.witnessName}
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
          title="Sign Refusal Form"
          size="md"
          footer={
            <div className="flex gap-3">
              <ActionButton
                variant="outline"
                onClick={() => setShowSignModal(false)}
              >
                Cancel
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleSignForm}
                disabled={submitting}
                icon={<PenTool className="h-4 w-4" />}
              >
                {submitting ? "Signing..." : "Sign Form"}
              </ActionButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Signer Name *
              </label>
              <input
                type="text"
                value={signatureData.signerName}
                onChange={(e) => setSignatureData({ ...signatureData, signerName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Relation to Patient *
              </label>
              <select
                value={signatureData.signerRelation}
                onChange={(e) => setSignatureData({ ...signatureData, signerRelation: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Select relation</option>
                <option value="Patient">Patient</option>
                <option value="Guardian">Legal Guardian</option>
                <option value="Family">Family Member</option>
                <option value="Representative">Legal Representative</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Witness Name *
              </label>
              <input
                type="text"
                value={signatureData.witnessName}
                onChange={(e) => setSignatureData({ ...signatureData, witnessName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Witness Title *
              </label>
              <input
                type="text"
                value={signatureData.witnessTitle}
                onChange={(e) => setSignatureData({ ...signatureData, witnessTitle: e.target.value })}
                placeholder="e.g., Nurse, Social Worker"
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
                  I acknowledge that I have been informed of the medical risks associated with refusing the recommended discharge.
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
                  I understand and accept full financial responsibility for any charges incurred beyond the medically necessary period.
                </label>
              </div>
            </div>
          </div>
        </Modal>
      </AppShell>
    </AuthGuard>
  );
}
