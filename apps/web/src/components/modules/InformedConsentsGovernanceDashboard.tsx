"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModuleShell from "@/components/ModuleShell";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type ModuleAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

type TemplateVersion = {
  id: string;
  versionLabel: string;
  versionNumber: number;
  status: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdByUserId?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
};

type TemplateItem = {
  id: string;
  templateCode: string;
  titleAr: string;
  titleEn: string;
  consentType: string;
  specialty: string;
  department?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  category?: { nameAr?: string | null; nameEn?: string | null } | null;
  versions?: TemplateVersion[];
};

type CommitteeReview = {
  id: string;
  templateId?: string | null;
  templateVersionId?: string | null;
  committeeType: "LEGAL" | "MEDICAL" | "QUALITY" | "COMPLIANCE";
  decision: "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  reviewerUserId?: string | null;
  commentsAr?: string | null;
  commentsEn?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};

type GovernancePayload = {
  templates: TemplateItem[];
  categories: Array<{ id: string; nameAr: string; nameEn: string }>;
};

const REVIEW_LABELS: Record<CommitteeReview["committeeType"], string> = {
  LEGAL: "Legal",
  MEDICAL: "Medical",
  QUALITY: "Quality",
  COMPLIANCE: "Compliance",
};

export default function InformedConsentsGovernanceDashboard({ auth }: { auth: ModuleAuth }) {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [reviews, setReviews] = useState<CommitteeReview[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [library, reviewList] = await Promise.all([
        apiFetch<GovernancePayload>("/api/modules/informed-consents/library"),
        apiFetch<CommitteeReview[]>("/api/modules/informed-consents/library", {
          method: "POST",
          body: JSON.stringify({
            action: "list_committee_reviews",
            payload: {},
          }),
        }).catch(() => []),
      ]);

      const nextTemplates = Array.isArray(library?.templates) ? library.templates : [];
      setTemplates(nextTemplates);
      setReviews(Array.isArray(reviewList) ? reviewList : []);
      setSelectedTemplateId((prev) => prev || nextTemplates[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load governance dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) || null,
    [templates, selectedTemplateId],
  );

  const latestVersion = selectedTemplate?.versions?.[0] || null;

  const selectedReviews = useMemo(() => {
    if (!selectedTemplate) return [];
    return reviews
      .filter((item) => item.templateId === selectedTemplate.id || item.templateVersionId === latestVersion?.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [latestVersion?.id, reviews, selectedTemplate]);

  const latestByCommittee = useMemo(() => {
    const map = new Map<string, CommitteeReview>();
    for (const review of selectedReviews) {
      if (!map.has(review.committeeType)) {
        map.set(review.committeeType, review);
      }
    }
    return map;
  }, [selectedReviews]);

  const queue = useMemo(() => {
    const statusCount = {
      DRAFT: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      ACTIVE: 0,
      RETIRED: 0,
      ARCHIVED: 0,
    };

    for (const template of templates) {
      const status = (template.versions?.[0]?.status || template.status || "DRAFT").toUpperCase();
      if (status in statusCount) {
        statusCount[status as keyof typeof statusCount] += 1;
      }
    }

    return {
      draft: statusCount.DRAFT,
      pendingLegal: reviews.filter((r) => r.committeeType === "LEGAL" && r.decision === "PENDING").length,
      pendingMedical: reviews.filter((r) => r.committeeType === "MEDICAL" && r.decision === "PENDING").length,
      pendingCompliance: reviews.filter((r) => r.committeeType === "COMPLIANCE" && r.decision === "PENDING").length,
      approved: statusCount.APPROVED,
      active: statusCount.ACTIVE,
      retired: statusCount.RETIRED + statusCount.ARCHIVED,
    };
  }, [reviews, templates]);

  const runAction = useCallback(
    async (body: Record<string, unknown>) => {
      if (!selectedTemplate || !latestVersion) return;
      setSubmitting(true);
      setError("");
      setSuccess("");
      try {
        await apiFetch("/api/modules/informed-consents/library", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setSuccess(locale === "ar" ? "تم تنفيذ الإجراء بنجاح" : "Action completed successfully");
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setSubmitting(false);
      }
    },
    [latestVersion, load, locale, selectedTemplate],
  );

  return (
    <ModuleShell
      auth={auth}
      moduleKey="informed-consents"
      title={{ ar: "حوكمة الموافقات المستنيرة", en: "Informed Consent Governance" }}
      subtitle={{
        ar: "لوحة تشغيل مؤسسية للمراجعات القانونية والطبية والامتثال وإدارة إصدارات القوالب.",
        en: "Enterprise operations console for legal/medical/compliance review and template lifecycle management.",
      }}
    >
      <div className="space-y-4">
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
        {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div> : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Draft</div><div className="text-2xl font-semibold">{queue.draft}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Pending Legal</div><div className="text-2xl font-semibold">{queue.pendingLegal}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Pending Medical</div><div className="text-2xl font-semibold">{queue.pendingMedical}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Pending Compliance</div><div className="text-2xl font-semibold">{queue.pendingCompliance}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Approved</div><div className="text-2xl font-semibold">{queue.approved}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Active</div><div className="text-2xl font-semibold">{queue.active}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Retired</div><div className="text-2xl font-semibold">{queue.retired}</div></div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold">Template Governance Queue</div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {!loading && templates.map((template) => {
                const selected = template.id === selectedTemplateId;
                const title = locale === "ar" ? template.titleAr : template.titleEn;
                const status = template.versions?.[0]?.status || template.status;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${selected ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <div className="font-medium text-slate-900">{title}</div>
                    <div className="text-xs text-slate-600">{template.templateCode} • {template.specialty} • {status}</div>
                  </button>
                );
              })}
              {!loading && templates.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">No templates found.</div>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="text-sm font-semibold">Template Details</div>
            {selectedTemplate ? (
              <>
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <div><span className="text-slate-500">Template:</span> <span className="font-medium">{locale === "ar" ? selectedTemplate.titleAr : selectedTemplate.titleEn}</span></div>
                  <div><span className="text-slate-500">Category:</span> <span className="font-medium">{locale === "ar" ? selectedTemplate.category?.nameAr : selectedTemplate.category?.nameEn}</span></div>
                  <div><span className="text-slate-500">Specialty:</span> <span className="font-medium">{selectedTemplate.specialty}</span></div>
                  <div><span className="text-slate-500">Department:</span> <span className="font-medium">{selectedTemplate.department || "-"}</span></div>
                  <div><span className="text-slate-500">Language:</span> <span className="font-medium">Arabic + English</span></div>
                  <div><span className="text-slate-500">Version:</span> <span className="font-medium">{latestVersion?.versionLabel || "-"}</span></div>
                  <div><span className="text-slate-500">Status:</span> <span className="font-medium">{latestVersion?.status || selectedTemplate.status}</span></div>
                  <div><span className="text-slate-500">Legal:</span> <span className="font-medium">{latestByCommittee.get("LEGAL")?.decision || "PENDING"}</span></div>
                  <div><span className="text-slate-500">Medical:</span> <span className="font-medium">{latestByCommittee.get("MEDICAL")?.decision || "PENDING"}</span></div>
                  <div><span className="text-slate-500">Compliance:</span> <span className="font-medium">{latestByCommittee.get("COMPLIANCE")?.decision || "PENDING"}</span></div>
                  <div><span className="text-slate-500">Effective:</span> <span className="font-medium">{latestVersion?.effectiveFrom ? new Date(latestVersion.effectiveFrom).toLocaleString() : "-"}</span></div>
                  <div><span className="text-slate-500">Retired:</span> <span className="font-medium">{latestVersion?.effectiveTo ? new Date(latestVersion.effectiveTo).toLocaleString() : "-"}</span></div>
                  <div><span className="text-slate-500">Created by:</span> <span className="font-medium">{latestVersion?.createdByUserId || "-"}</span></div>
                  <div><span className="text-slate-500">Approved by:</span> <span className="font-medium">{latestVersion?.approvedByUserId || "-"}</span></div>
                </div>

                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  <button disabled={submitting} className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => void runAction({ action: "set_version_status", payload: { templateId: selectedTemplate.id, templateVersionId: latestVersion?.id, status: "UNDER_REVIEW" } })}>Submit for Review</button>
                  <button disabled={submitting} className="rounded border border-emerald-300 px-3 py-2 text-sm" onClick={() => void runAction({ action: "submit_committee_review", payload: { templateId: selectedTemplate.id, templateVersionId: latestVersion?.id, committeeType: "LEGAL", decision: "APPROVED" } })}>Approve Legal</button>
                  <button disabled={submitting} className="rounded border border-emerald-300 px-3 py-2 text-sm" onClick={() => void runAction({ action: "submit_committee_review", payload: { templateId: selectedTemplate.id, templateVersionId: latestVersion?.id, committeeType: "MEDICAL", decision: "APPROVED" } })}>Approve Medical</button>
                  <button disabled={submitting} className="rounded border border-emerald-300 px-3 py-2 text-sm" onClick={() => void runAction({ action: "submit_committee_review", payload: { templateId: selectedTemplate.id, templateVersionId: latestVersion?.id, committeeType: "COMPLIANCE", decision: "APPROVED" } })}>Approve Compliance</button>
                  <button disabled={submitting} className="rounded border border-amber-300 px-3 py-2 text-sm" onClick={() => void runAction({ action: "submit_committee_review", payload: { templateId: selectedTemplate.id, templateVersionId: latestVersion?.id, committeeType: "LEGAL", decision: "CHANGES_REQUESTED" } })}>Request Revision</button>
                  <button disabled={submitting} className="rounded border border-rose-300 px-3 py-2 text-sm" onClick={() => void runAction({ action: "submit_committee_review", payload: { templateId: selectedTemplate.id, templateVersionId: latestVersion?.id, committeeType: "LEGAL", decision: "REJECTED" } })}>Reject</button>
                  <button disabled={submitting} className="rounded border border-blue-300 px-3 py-2 text-sm" onClick={() => void runAction({ action: "set_version_status", payload: { templateId: selectedTemplate.id, templateVersionId: latestVersion?.id, status: "ACTIVE" } })}>Activate</button>
                  <button disabled={submitting} className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => void runAction({ action: "set_version_status", payload: { templateId: selectedTemplate.id, templateVersionId: latestVersion?.id, status: "ARCHIVED" } })}>Retire</button>
                  <button disabled={submitting} className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => void runAction({ action: "create_version", payload: { templateId: selectedTemplate.id, cloneFromVersionId: latestVersion?.id } })}>Clone / New Version</button>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Review Comments & Revision History</div>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="px-3 py-2 text-left">Committee</th>
                          <th className="px-3 py-2 text-left">Decision</th>
                          <th className="px-3 py-2 text-left">Reviewer</th>
                          <th className="px-3 py-2 text-left">Comment</th>
                          <th className="px-3 py-2 text-left">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReviews.map((review) => (
                          <tr key={review.id} className="border-t border-slate-200">
                            <td className="px-3 py-2">{REVIEW_LABELS[review.committeeType]}</td>
                            <td className="px-3 py-2">{review.decision}</td>
                            <td className="px-3 py-2">{review.reviewerUserId || "-"}</td>
                            <td className="px-3 py-2">{(locale === "ar" ? review.commentsAr : review.commentsEn) || review.commentsEn || review.commentsAr || "-"}</td>
                            <td className="px-3 py-2">{new Date(review.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                        {selectedReviews.length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-slate-500" colSpan={5}>No review comments yet.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">Select a template to view details and governance actions.</div>
            )}
          </div>
        </section>
      </div>
    </ModuleShell>
  );
}
