"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Shield,
  FileText,
  Plus,
  Eye,
  MessageSquare,
  CheckCheck
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/ui/StatusBadge";
import KPICard from "@/components/ui/KPICard";
import Modal from "@/components/ui/Modal";
import ActionButton from "@/components/ui/ActionButton";
import CaseCard from "@/components/ui/case-card";
import AlertBox from "@/components/ui/alert-box";
import { useI18n } from "@/i18n/I18nProvider";
import { legalEscalationService } from "@/lib/services/legalEscalation.service";
import type { LegalEscalationCase, LegalEscalationNote, LegalEscalationPriority } from "@/types/legal-escalation";

const PRIORITY_COLORS: Record<LegalEscalationPriority, string> = {
  low: "text-slate-600",
  medium: "text-amber-600",
  high: "text-orange-600",
  critical: "text-rose-700 font-bold",
};

export default function LegalEscalationPage() {
  const { t } = useI18n();
  const [cases, setCases] = useState<LegalEscalationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<LegalEscalationCase | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEscalations();
  }, []);

  async function loadEscalations() {
    setLoading(true);
    try {
      const data = await legalEscalationService.listEscalations();
      setCases(data);
    } catch (error) {
      console.error("Failed to load escalations:", error);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    return {
      active: cases.filter((c) => c.status === "active").length,
      underReview: cases.filter((c) => c.status === "under-review").length,
      resolved: cases.filter((c) => c.status === "resolved").length,
      highRisk: cases.filter((c) => c.status === "high-risk").length,
    };
  }, [cases]);

  function openDetails(escalationCase: LegalEscalationCase) {
    setSelectedCase(escalationCase);
    setShowDetailsModal(true);
  }

  function openAddNote(escalationCase: LegalEscalationCase) {
    setSelectedCase(escalationCase);
    setNoteText("");
    setShowAddNoteModal(true);
  }

  function openResolve(escalationCase: LegalEscalationCase) {
    setSelectedCase(escalationCase);
    setResolutionNotes("");
    setShowResolveModal(true);
  }

  async function handleAddNote() {
    if (!selectedCase || !noteText.trim()) return;

    setSubmitting(true);
    try {
      const newNote = await legalEscalationService.addNote(
        selectedCase.caseId,
        noteText,
        "Current User"
      );
      
      setCases((prev) =>
        prev.map((c) =>
          c.id === selectedCase.id
            ? { ...c, notes: [...c.notes, newNote] }
            : c
        )
      );

      setShowAddNoteModal(false);
      setNoteText("");
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolveCase() {
    if (!selectedCase || !resolutionNotes.trim()) return;

    setSubmitting(true);
    try {
      await legalEscalationService.resolveCase(
        selectedCase.caseId,
        resolutionNotes
      );

      setCases((prev) =>
        prev.map((c) =>
          c.id === selectedCase.id
            ? { 
                ...c, 
                status: "resolved", 
                resolvedAt: new Date().toISOString(),
                resolutionNotes 
              }
            : c
        )
      );

      setShowResolveModal(false);
      setShowDetailsModal(false);
      setResolutionNotes("");
    } catch (error) {
      console.error("Failed to resolve case:", error);
      alert("Failed to resolve case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title="Legal Escalation"
        subtitle="Manage escalated discharge refusal cases requiring legal review and intervention."
        actions={
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <FileText className="h-4 w-4" />
            View All Cases
          </Link>
        }
      >
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            label={t("legalEscalation.kpi.activeCases")}
            value={loading ? "-" : stats.active}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="primary"
          />
          <KPICard
            label={t("legalEscalation.status.underReview")}
            value={loading ? "-" : stats.underReview}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <KPICard
            label={t("legalEscalation.kpi.resolvedCases")}
            value={loading ? "-" : stats.resolved}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
          <KPICard
            label={t("legalEscalation.kpi.highRiskCases")}
            value={loading ? "-" : stats.highRisk}
            icon={<Shield className="h-5 w-5" />}
            variant="danger"
          />
        </div>

        {/* Escalation Cases List */}
        <div className="mt-6 space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Escalation Cases</h2>

          {loading ? (
            <p className="text-sm text-slate-600">Loading escalation cases...</p>
          ) : cases.length === 0 ? (
            <AlertBox
              variant="info"
              icon={<Shield className="h-5 w-5" />}
              title="No escalation cases found"
              description="Cases requiring legal escalation will appear here"
            />
          ) : (
            <div className="space-y-4">
              {cases.map((escalationCase) => (
                <CaseCard
                  key={escalationCase.id}
                  title={escalationCase.caseNumber}
                  statusBadge={
                    <StatusBadge
                      variant={
                        escalationCase.status === "resolved"
                          ? "resolved"
                          : escalationCase.status === "high-risk"
                            ? "high-risk"
                            : escalationCase.status === "under-review"
                              ? "under-review"
                              : "active"
                      }
                      label={escalationCase.status.replace("-", " ").toUpperCase()}
                    />
                  }
                  reason={escalationCase.reason}
                  metadata={[
                    { label: "Patient", value: escalationCase.patientName },
                    {
                      label: "Escalated",
                      value: new Date(escalationCase.escalatedAt).toLocaleDateString(),
                    },
                    {
                      label: "Assigned",
                      value: escalationCase.assignedCounsel || "-",
                    },
                    {
                      label: "Priority",
                      value: (
                        <span className={`text-xs font-semibold ${PRIORITY_COLORS[escalationCase.priority]}`}>
                          {escalationCase.priority.toUpperCase()}
                        </span>
                      ),
                    },
                  ]}
                  actions={
                    <>
                      <button
                        onClick={() => openDetails(escalationCase)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </button>

                      {escalationCase.status !== "resolved" && (
                        <>
                          <button
                            onClick={() => openAddNote(escalationCase)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Add Note
                          </button>

                          <button
                            onClick={() => openResolve(escalationCase)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Resolve
                          </button>
                        </>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* View Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Escalation Case Details"
          size="lg"
        >
          {selectedCase && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">Case Number</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedCase.caseNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge
                      variant={
                        selectedCase.status === "resolved" ? "resolved" :
                        selectedCase.status === "high-risk" ? "high-risk" :
                        selectedCase.status === "under-review" ? "under-review" :
                        "active"
                      }
                      label={selectedCase.status.replace("-", " ").toUpperCase()}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Patient Name</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedCase.patientName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Priority</p>
                  <p className={`mt-1 text-sm font-semibold ${PRIORITY_COLORS[selectedCase.priority]}`}>
                    {selectedCase.priority.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Escalated Date</p>
                  <p className="mt-1 text-sm text-slate-900">
                    {new Date(selectedCase.escalatedAt).toLocaleString()}
                  </p>
                </div>
                {selectedCase.assignedCounsel && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Assigned Counsel</p>
                    <p className="mt-1 text-sm text-slate-900">{selectedCase.assignedCounsel}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Escalation Reason</p>
                <p className="mt-1 text-sm text-slate-700">{selectedCase.reason}</p>
              </div>

              {selectedCase.riskLevel && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Risk Level</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedCase.riskLevel}</p>
                </div>
              )}

              {selectedCase.resolutionNotes && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Resolution Notes</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedCase.resolutionNotes}</p>
                </div>
              )}

              {/* Case Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Case Timeline</h4>
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-700">Case Escalated</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(selectedCase.escalatedAt).toLocaleString()}
                    </p>
                  </div>
                  {selectedCase.resolvedAt && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-medium text-emerald-700">Case Resolved</p>
                      <p className="mt-1 text-xs text-emerald-600">
                        {new Date(selectedCase.resolvedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedCase.notes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Notes</h4>
                  <div className="mt-3 space-y-2">
                    {selectedCase.notes.map((note: LegalEscalationNote) => (
                      <div key={note.id} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-sm text-slate-700">{note.note}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <span>{note.author}</span>
                          <span>•</span>
                          <span>{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Add Note Modal */}
        <Modal
          isOpen={showAddNoteModal}
          onClose={() => setShowAddNoteModal(false)}
          title="Add Note"
          footer={
            <div className="flex gap-3">
              <ActionButton
                variant="outline"
                onClick={() => setShowAddNoteModal(false)}
              >
                Cancel
              </ActionButton>
              <ActionButton
                onClick={handleAddNote}
                disabled={!noteText.trim() || submitting}
                icon={<Plus className="h-4 w-4" />}
              >
                {submitting ? "Adding..." : "Add Note"}
              </ActionButton>
            </div>
          }
        >
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Note
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter legal note or observation..."
            />
          </div>
        </Modal>

        {/* Resolve Case Modal */}
        <Modal
          isOpen={showResolveModal}
          onClose={() => setShowResolveModal(false)}
          title="Resolve Escalation Case"
          footer={
            <div className="flex gap-3">
              <ActionButton
                variant="outline"
                onClick={() => setShowResolveModal(false)}
              >
                Cancel
              </ActionButton>
              <ActionButton
                variant="success"
                onClick={handleResolveCase}
                disabled={!resolutionNotes.trim() || submitting}
                icon={<CheckCheck className="h-4 w-4" />}
              >
                {submitting ? "Resolving..." : "Resolve Case"}
              </ActionButton>
            </div>
          }
        >
          <div>
            <p className="text-sm text-slate-600 mb-4">
              Please provide resolution notes for this escalation case.
            </p>
            <label className="block text-sm font-medium text-slate-700">
              Resolution Notes
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={5}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Describe how the case was resolved..."
              required
            />
          </div>
        </Modal>
      </AppShell>
    </AuthGuard>
  );
}
