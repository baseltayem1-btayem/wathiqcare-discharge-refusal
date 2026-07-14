"use client";

import { useCallback, useEffect, useState } from "react";

export type WitnessRequirementView = {
  id: string;
  witnessIndex: number;
  requiredRole: "NURSING_REPRESENTATIVE" | "PATIENT_EXPERIENCE_REPRESENTATIVE";
  status: "PENDING" | "ASSIGNED" | "SIGNED" | "REVOKED";
  policyVersion: string;
  assignedUserId: string | null;
  assignedAt: string | null;
  signatures: Array<{
    id: string;
    witnessRole: string;
    department: string | null;
    attestationVersion: string;
    signatureId: string;
    authenticationReference: string;
    signedAtKsa: string;
    documentHash: string;
  }>;
};

export type WitnessSigningWorkspaceProps = {
  documentId: string;
  /** SHA-256 of the exact document version presented to the witness. */
  documentHash: string;
  language?: "en" | "ar";
};

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  NURSING_REPRESENTATIVE: { en: "Nursing Representative", ar: "ممثل التمريض" },
  PATIENT_EXPERIENCE_REPRESENTATIVE: {
    en: "Patient Experience Representative",
    ar: "ممثل تجربة المريض",
  },
};

/**
 * Connected human-witness signing workspace. Lists the policy-issued witness
 * requirements for a consent document, lets authorized staff claim a task,
 * and captures the witness attestation + signature through the institutional
 * staff session (no SMS verification for staff).
 */
export default function WitnessSigningWorkspace({
  documentId,
  documentHash,
  language = "en",
}: WitnessSigningWorkspaceProps) {
  const isAr = language === "ar";
  const [requirements, setRequirements] = useState<WitnessRequirementView[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [attestation, setAttestation] = useState({
    identityChecked: false,
    signatureInPresence: false,
    noObjectionOrCoercion: false,
  });

  const loadRequirements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/modules/informed-consents/documents/${encodeURIComponent(documentId)}/witness-requirements`,
        { credentials: "include" },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        requirements?: WitnessRequirementView[];
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Failed to load witness requirements");
      }
      setRequirements(payload.requirements ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load witness requirements");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadRequirements();
  }, [loadRequirements]);

  const claimTask = async (requirementId: string) => {
    setSubmitting(requirementId);
    setError("");
    try {
      const response = await fetch(
        `/api/modules/informed-consents/documents/${encodeURIComponent(documentId)}/witness-requirements`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ witnessRequirementId: requirementId }),
        },
      );
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Failed to claim witness task");
      }
      await loadRequirements();
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Failed to claim witness task");
    } finally {
      setSubmitting(null);
    }
  };

  const signAsWitness = async (requirement: WitnessRequirementView) => {
    if (
      !attestation.identityChecked ||
      !attestation.signatureInPresence ||
      !attestation.noObjectionOrCoercion
    ) {
      setError(
        isAr
          ? "يجب تأكيد جميع بنود إقرار الشاهد قبل التوقيع."
          : "All witness attestation items must be confirmed before signing.",
      );
      return;
    }
    setSubmitting(requirement.id);
    setError("");
    try {
      const response = await fetch(
        `/api/modules/informed-consents/documents/${encodeURIComponent(documentId)}/witness-signature`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "idempotency-key": `witness:${documentId}:${requirement.id}`,
          },
          body: JSON.stringify({
            witnessRequirementId: requirement.id,
            witnessRole: requirement.requiredRole,
            employeeId: employeeId.trim() || undefined,
            department: department.trim() || undefined,
            documentHash,
            attestation: { ...attestation, attestationVersion: "1.0.0" },
          }),
        },
      );
      const payload = (await response.json()) as { ok: boolean; error?: string; code?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Failed to capture witness signature");
      }
      await loadRequirements();
    } catch (signError) {
      setError(signError instanceof Error ? signError.message : "Failed to capture witness signature");
    } finally {
      setSubmitting(null);
    }
  };

  const attestationItems = [
    {
      key: "identityChecked" as const,
      en: "I checked the signatory's identity.",
      ar: "تحققت من هوية الموقّع.",
    },
    {
      key: "signatureInPresence" as const,
      en: "The signature occurred in my presence.",
      ar: "تم التوقيع في حضوري.",
    },
    {
      key: "noObjectionOrCoercion" as const,
      en: "I observed no objection or apparent coercion.",
      ar: "لم ألاحظ أي اعتراض أو إكراه ظاهر.",
    },
  ];

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="witness-signing-workspace"
    >
      <h2 className="text-base font-semibold text-slate-900">
        {isAr ? "توقيعات الشهود" : "Human Witness Signatures"}
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {isAr
          ? "تتم مصادقة الكادر عبر الجلسة المؤسسية. لا حاجة لرمز تحقق عبر الرسائل."
          : "Staff authenticate through the institutional session. No SMS verification is required for staff witnesses."}
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">{isAr ? "جارٍ التحميل..." : "Loading..."}</p>
      ) : requirements.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500" data-testid="witness-none-required">
          {isAr
            ? "لا يتطلب هذا المستند شاهدًا بشريًا وفق السياسة المُقيّمة."
            : "No human witness is required for this document under the evaluated policy."}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {requirements.map((requirement) => (
            <div
              key={requirement.id}
              className="rounded-xl border border-slate-200 p-3"
              data-testid={`witness-requirement-${requirement.witnessIndex}`}
              data-status={requirement.status}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {isAr
                      ? ROLE_LABELS[requirement.requiredRole]?.ar
                      : ROLE_LABELS[requirement.requiredRole]?.en}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isAr ? "الحالة" : "Status"}: {requirement.status}
                    {requirement.assignedUserId
                      ? ` · ${isAr ? "مُسند إلى" : "assigned to"} ${requirement.assignedUserId}`
                      : ""}
                  </p>
                </div>
                {requirement.status === "SIGNED" && requirement.signatures[0] ? (
                  <span
                    className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                    data-testid="witness-signed-pill"
                  >
                    ✓ {isAr ? "تم التوقيع" : "Signed"}{" "}
                    <bdi dir="ltr">{requirement.signatures[0].signedAtKsa}</bdi>
                  </span>
                ) : null}
              </div>

              {requirement.status !== "SIGNED" ? (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(event) => setEmployeeId(event.target.value)}
                      placeholder={isAr ? "الرقم الوظيفي" : "Employee ID"}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      dir="ltr"
                    />
                    <input
                      type="text"
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      placeholder={isAr ? "القسم" : "Department"}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <fieldset className="space-y-1">
                    {attestationItems.map((item) => (
                      <label key={item.key} className="flex items-start gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={attestation[item.key]}
                          onChange={(event) =>
                            setAttestation((current) => ({
                              ...current,
                              [item.key]: event.target.checked,
                            }))
                          }
                        />
                        <span>
                          {isAr ? item.ar : item.en}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <div className="flex gap-2">
                    {requirement.status === "PENDING" ? (
                      <button
                        type="button"
                        onClick={() => void claimTask(requirement.id)}
                        disabled={submitting !== null}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        data-testid="witness-claim-button"
                      >
                        {isAr ? "استلام المهمة" : "Claim task"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void signAsWitness(requirement)}
                      disabled={submitting !== null || !documentHash}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      data-testid="witness-sign-button"
                    >
                      {submitting === requirement.id
                        ? isAr
                          ? "جارٍ التوقيع..."
                          : "Signing..."
                        : isAr
                          ? "توقيع كشاهد"
                          : "Sign as witness"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {error ? (
        <div
          className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          data-testid="witness-error"
        >
          {error}
        </div>
      ) : null}
    </section>
  );
}
