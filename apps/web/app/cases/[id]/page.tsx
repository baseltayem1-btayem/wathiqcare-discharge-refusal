"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Package,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/card";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupLabel,
} from "@/components/design-system/radio-group";

type ApiErrorPayload = {
  detail?: string;
  message?: string;
};

type CaseData = {
  id: string;
  mrn: string;
  patient: string;
  physician: string;
  diagnosis: string;
  status: string;
};

type PresentationPayload = {
  language: string;
  interpreter_used: boolean;
  presented_to: string;
  presented_by: string;
};

type SignatureOutcome = "signed" | "refused_to_sign" | "unable_to_sign";

type SignaturePayload = {
  outcome: SignatureOutcome;
  signer_name: string;
  reason: string;
};

type WitnessPayload = {
  witness_name: string;
  witness_role: string;
};

type ConsentFormPayload = {
  processingPurpose: string;
  lawfulBasis: string;
  consentType: string;
  consentMethod: string;
  documentVersion: string;
  witnessName: string;
  otpReference: string;
};

type ReadinessState = {
  ready_for_legal: boolean;
  reason?: string;
};

type LegalPackageMeta = {
  version: number;
  download_url: string;
};

type CaseApiRecord = {
  id: string;
  medicalRecordNo?: string | null;
  patientName?: string | null;
  status?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
};

type WorkflowApiRecord = {
  attending_physician?: string | null;
  discussion_summary?: string | null;
  refusal_reason?: string | null;
  escalation_required?: boolean;
  refusal_form_generated_at?: string | null;
  financial_notice_generated_at?: string | null;
  documents?: Array<{ templateKey?: string; template_key?: string }>;
};

type ConsentRecordSummary = {
  id: string;
  processingPurpose?: string;
  lawfulBasis?: string;
  consentMethod?: string;
  documentHash?: string | null;
  consentedAt?: string;
};

type LegalReadinessReport = {
  status: string;
  readyForLegal: boolean;
  blockers: string[];
  checklist: Array<{
    key: string;
    label: string;
    required: boolean;
    satisfied: boolean;
    reason: string;
  }>;
  evidence?: {
    consentCount?: number;
    documentCount?: number;
    auditChainVerified?: boolean;
  };
};

type AuditChainResponse = {
  events: Array<{
    id: string;
    eventType: string;
    actorRole?: string | null;
    payloadSummary: string;
    currentHash: string;
    previousHash?: string | null;
    createdAt: string;
  }>;
  verification?: {
    verified: boolean;
    totalEvents: number;
  };
};

type DocumentSummary = {
  id: string;
  template_key?: string;
  title?: string;
  generationStatus?: string;
  generated_at?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getString(record: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!record) return "";

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getBoolean(record: Record<string, unknown> | null | undefined, key: string, fallback = false): boolean {
  if (!record) {
    return fallback;
  }

  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}

function mapCaseRecordToCaseData(record: CaseApiRecord): CaseData {
  const metadata = asRecord(record.metadata);
  const workflow = asRecord(metadata?.workflow);

  return {
    id: record.id,
    mrn:
      (typeof record.medicalRecordNo === "string" && record.medicalRecordNo.trim()) ||
      getString(metadata, "mrn", "medical_record_number") ||
      "N/A",
    patient:
      (typeof record.patientName === "string" && record.patientName.trim()) ||
      getString(metadata, "patient_name") ||
      "Unknown Patient",
    physician:
      getString(workflow, "attending_physician") ||
      getString(metadata, "attending_physician") ||
      "Not assigned",
    diagnosis:
      getString(workflow, "discussion_summary", "refusal_reason") ||
      (typeof record.title === "string" && record.title.trim()) ||
      "Discharge refusal workflow",
    status:
      (typeof record.status === "string" && record.status.trim()) ||
      "OPEN",
  };
}

function toReadinessState(workflow: WorkflowApiRecord | null): ReadinessState {
  if (!workflow) {
    return {
      ready_for_legal: false,
      reason: "Generate the legal evidence bundle to complete readiness.",
    };
  }

  const hasRequiredEvidence = Boolean(
    workflow.refusal_form_generated_at ||
    workflow.financial_notice_generated_at ||
    workflow.documents?.length,
  );

  if (workflow.escalation_required) {
    return {
      ready_for_legal: false,
      reason: "Legal escalation is still required before closure.",
    };
  }

  return {
    ready_for_legal: hasRequiredEvidence,
    reason: hasRequiredEvidence
      ? undefined
      : "Generate the refusal form or legal package to complete the case evidence.",
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    let errorPayload: ApiErrorPayload | null = null;

    try {
      errorPayload = (await response.json()) as ApiErrorPayload;
    } catch {
      errorPayload = null;
    }

    throw new Error(
      errorPayload?.detail ||
        errorPayload?.message ||
        `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function getErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  return error instanceof Error ? error.message : fallback;
}

export default function CasePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const caseId = typeof params?.id === "string" ? params.id : "";

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [presentation, setPresentation] = useState<PresentationPayload>({
    language: "",
    interpreter_used: false,
    presented_to: "",
    presented_by: "",
  });
  const [signature, setSignature] = useState<SignaturePayload>({
    outcome: "signed",
    signer_name: "",
    reason: "",
  });
  const [witness, setWitness] = useState<WitnessPayload>({
    witness_name: "",
    witness_role: "",
  });
  const [consentForm, setConsentForm] = useState<ConsentFormPayload>({
    processingPurpose: "Discharge refusal medico-legal processing",
    lawfulBasis: "PDPL healthcare and legal obligation basis",
    consentType: "informed_refusal_consent",
    consentMethod: "ELECTRONIC_SIGNATURE",
    documentVersion: "1.0",
    witnessName: "",
    otpReference: "",
  });
  const [readiness, setReadiness] = useState<ReadinessState | null>(null);
  const [legalReadinessReport, setLegalReadinessReport] = useState<LegalReadinessReport | null>(null);
  const [consentRecords, setConsentRecords] = useState<ConsentRecordSummary[]>([]);
  const [auditChain, setAuditChain] = useState<AuditChainResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [legalPackage, setLegalPackage] = useState<LegalPackageMeta | null>(null);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  async function reloadComplianceState(targetCaseId: string) {
    const [readinessReport, consentList, auditInfo, docs, pkg] = await Promise.all([
      apiFetch<LegalReadinessReport>(`/api/discharge/cases/${targetCaseId}/legal-readiness`).catch(() => null),
      apiFetch<ConsentRecordSummary[]>(`/api/discharge/cases/${targetCaseId}/consent`).catch(() => []),
      apiFetch<AuditChainResponse>(`/api/discharge/cases/${targetCaseId}/audit-chain`).catch(() => null),
      apiFetch<DocumentSummary[]>(`/api/discharge/cases/${targetCaseId}/documents`).catch(() => []),
      apiFetch<LegalPackageMeta>(`/api/discharge/cases/${targetCaseId}/legal-package`).catch(() => null),
    ]);

    setLegalReadinessReport(readinessReport);
    setConsentRecords(consentList ?? []);
    setAuditChain(auditInfo);
    setDocuments(docs ?? []);
    setLegalPackage(pkg);

    if (readinessReport) {
      setReadiness({
        ready_for_legal: readinessReport.readyForLegal,
        reason: readinessReport.blockers?.[0],
      });
      return;
    }

    if (docs?.length || pkg) {
      setReadiness({
        ready_for_legal: true,
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPage(): Promise<void> {
      if (!caseId) {
        setPageLoading(false);
        return;
      }

      setPageLoading(true);
      setError("");

      try {
        const [caseRecord, workflow, existingPackage, readinessReport, consentList, auditInfo, docs, readinessResponse] = await Promise.all([
          apiFetch<CaseApiRecord>(`/api/cases/${caseId}`),
          apiFetch<WorkflowApiRecord>(`/api/discharge/cases/${caseId}/workflow`).catch(() => null),
          apiFetch<LegalPackageMeta>(`/api/discharge/cases/${caseId}/legal-package`).catch(() => null),
          apiFetch<LegalReadinessReport>(`/api/discharge/cases/${caseId}/legal-readiness`).catch(() => null),
          apiFetch<ConsentRecordSummary[]>(`/api/discharge/cases/${caseId}/consent`).catch(() => []),
          apiFetch<AuditChainResponse>(`/api/discharge/cases/${caseId}/audit-chain`).catch(() => null),
          apiFetch<DocumentSummary[]>(`/api/discharge/cases/${caseId}/documents`).catch(() => []),
          apiFetch<ReadinessState>(`/api/discharge/cases/${caseId}/readiness`).catch(() => null),
        ]);

        if (cancelled) {
          return;
        }

        const caseMetadata = asRecord(caseRecord.metadata);
        const presentationMeta = asRecord(caseMetadata?.presentation);
        const signatureMeta = asRecord(caseMetadata?.signature);
        const witnessMeta = asRecord(caseMetadata?.witness);

        setPresentation({
          language: getString(presentationMeta, "language"),
          interpreter_used: getBoolean(presentationMeta, "interpreter_used", false),
          presented_to: getString(presentationMeta, "presented_to"),
          presented_by: getString(presentationMeta, "presented_by"),
        });

        const signatureOutcome = getString(signatureMeta, "outcome") as SignatureOutcome;
        setSignature({
          outcome:
            signatureOutcome === "refused_to_sign" ||
            signatureOutcome === "unable_to_sign" ||
            signatureOutcome === "signed"
              ? signatureOutcome
              : "signed",
          signer_name: getString(signatureMeta, "signer_name"),
          reason: getString(signatureMeta, "reason"),
        });

        const hydratedWitnessName = getString(witnessMeta, "witness_name");
        setWitness({
          witness_name: hydratedWitnessName,
          witness_role: getString(witnessMeta, "witness_role"),
        });

        setConsentForm((previous) => ({
          ...previous,
          witnessName: previous.witnessName || hydratedWitnessName,
        }));

        setCaseData(mapCaseRecordToCaseData(caseRecord));
        setReadiness(
          readinessReport
            ? {
                ready_for_legal: readinessReport.readyForLegal,
                reason: readinessReport.blockers?.[0],
              }
            : readinessResponse ?? toReadinessState(workflow),
        );
        setLegalReadinessReport(readinessReport);
        setConsentRecords(consentList ?? []);
        setAuditChain(auditInfo);
        setDocuments(docs ?? []);
        setLegalPackage(existingPackage);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        setError(getErrorMessage(err, "Failed to load case"));
        setCaseData(null);
        setReadiness(null);
        setLegalReadinessReport(null);
        setConsentRecords([]);
        setAuditChain(null);
        setDocuments([]);
        setLegalPackage(null);
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  async function refreshReadinessAndPackage(): Promise<void> {
    if (!caseId) return;

    await reloadComplianceState(caseId);
  }

  async function handleGenerateLegalPackage(): Promise<void> {
    if (!caseId) return;

    setLoading(true);
    setError("");

    try {
      const pkg = await apiFetch<LegalPackageMeta>(
        `/api/discharge/cases/${caseId}/legal-package`,
        { method: "POST" },
      );
      setLegalPackage(pkg);
      await reloadComplianceState(caseId);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to generate legal package"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePresentation(): Promise<void> {
    if (!caseId) return;

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/api/discharge/cases/${caseId}/presentation`, {
        method: "POST",
        body: JSON.stringify(presentation),
      });

      await refreshReadinessAndPackage();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to record presentation"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignature(): Promise<void> {
    if (!caseId) return;

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/api/discharge/cases/${caseId}/signature`, {
        method: "POST",
        body: JSON.stringify(signature),
      });

      await refreshReadinessAndPackage();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to record signature"));
    } finally {
      setLoading(false);
    }
  }

  async function handleWitness(): Promise<void> {
    if (!caseId) return;

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/api/discharge/cases/${caseId}/witness`, {
        method: "POST",
        body: JSON.stringify(witness),
      });

      await refreshReadinessAndPackage();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to record witness"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordConsent(): Promise<void> {
    if (!caseId) return;

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/api/discharge/cases/${caseId}/consent`, {
        method: "POST",
        body: JSON.stringify({
          ...consentForm,
          witnessName: consentForm.witnessName || witness.witness_name || undefined,
          otpReference: consentForm.otpReference || undefined,
          documentSnapshot: {
            presentation,
            signature,
            witness,
            consentForm,
          },
        }),
      });

      await refreshReadinessAndPackage();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to record consent"));
    } finally {
      setLoading(false);
    }
  }

  const steps = useMemo(
    () => [
      { key: "intake", label: "Case Intake" },
      { key: "presentation", label: "Presentation" },
      { key: "decision", label: "Patient Decision" },
      { key: "witness", label: "Witness" },
      { key: "readiness", label: "Legal Readiness" },
      { key: "package", label: "Package Generation" },
    ],
    [],
  );

  const stepStatus = useMemo(
    () => [
      "completed",
      presentation.language ? "completed" : "missing",
      signature.signer_name ? "completed" : "missing",
      witness.witness_name ? "completed" : "missing",
      readiness?.ready_for_legal ? "completed" : "missing",
      legalPackage ? "completed" : "missing",
    ],
    [legalPackage, presentation.language, readiness?.ready_for_legal, signature.signer_name, witness.witness_name],
  );

  const activeStep = stepStatus.findIndex((status) => status === "missing");

  if (!caseId) {
    return (
      <div className="p-8 text-center text-lg text-red-600">
        Invalid case route.
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="p-8 text-center text-lg text-slate-500">
        Loading case...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Card>
          <CardHeader>
            <CardTitle>Case Execution Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 font-medium text-red-600">
              {error || "Case could not be loaded."}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthGuard>
      <AppShell
        title="Case Execution Workspace"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/cases")}>
              <ArrowLeft className="h-4 w-4" />
              Back to Cases
            </Button>

            <Button
              variant="outline"
              onClick={handleGenerateLegalPackage}
              disabled={loading}
            >
              <Package className="h-4 w-4" />
              Generate Legal Package
            </Button>

            {legalPackage?.download_url ? (
              <a
                href={legalPackage.download_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </a>
            ) : null}
          </div>
        }
      >
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

      <div className="mb-6">
        <ol className="flex flex-wrap gap-2 md:gap-4">
          {steps.map((step, index) => (
            <li key={step.key} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-white ${
                  stepStatus[index] === "completed"
                    ? "bg-emerald-600"
                    : stepStatus[index] === "missing"
                      ? "bg-slate-300"
                      : "bg-cyan-600"
                }`}
              >
                {index + 1}
              </span>

              <span
                className={`text-sm font-medium ${
                  activeStep === index
                    ? "text-cyan-700"
                    : stepStatus[index] === "completed"
                      ? "text-emerald-700"
                      : "text-slate-500"
                }`}
              >
                {step.label}
              </span>

              {index < steps.length - 1 ? (
                <span className="mx-1 h-0.5 w-6 bg-slate-200" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Case Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div>
                <span className="font-semibold text-slate-700">MRN:</span>{" "}
                {caseData.mrn}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Patient:</span>{" "}
                {caseData.patient}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Physician:</span>{" "}
                {caseData.physician}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Diagnosis:</span>{" "}
                {caseData.diagnosis}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Status:</span>{" "}
                <Badge>{caseData.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legal Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">
                  Ready for Legal:
                </span>
                {readiness?.ready_for_legal ? (
                  <Badge variant="success">Yes</Badge>
                ) : (
                  <Badge variant="warning">No</Badge>
                )}
              </div>

              {readiness?.reason ? (
                <div className="text-sm text-amber-700">
                  Reason: {readiness.reason}
                </div>
              ) : null}

              <ul className="mt-2 space-y-1 text-sm">
                <li>
                  <Badge variant={presentation.language ? "success" : "outline"}>
                    Presentation recorded
                  </Badge>
                </li>
                <li>
                  <Badge variant={signature.signer_name ? "success" : "outline"}>
                    Signature outcome recorded
                  </Badge>
                </li>
                <li>
                  <Badge variant={witness.witness_name ? "success" : "outline"}>
                    Witness recorded
                  </Badge>
                </li>
                <li>
                  <Badge variant={legalPackage ? "success" : "outline"}>
                    Package generated
                  </Badge>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Presentation / Proof of Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Language"
                value={presentation.language}
                onChange={(e) =>
                  setPresentation((prev) => ({
                    ...prev,
                    language: e.target.value,
                  }))
                }
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={presentation.interpreter_used}
                  onChange={(e) =>
                    setPresentation((prev) => ({
                      ...prev,
                      interpreter_used: e.target.checked,
                    }))
                  }
                />
                Interpreter Used
              </label>

              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Presented To"
                value={presentation.presented_to}
                onChange={(e) =>
                  setPresentation((prev) => ({
                    ...prev,
                    presented_to: e.target.value,
                  }))
                }
              />

              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Presented By"
                value={presentation.presented_by}
                onChange={(e) =>
                  setPresentation((prev) => ({
                    ...prev,
                    presented_by: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col items-start justify-center gap-2">
              <Button variant="default" disabled={loading} onClick={handlePresentation}>
                Record Presentation
              </Button>

              {presentation.language ? (
                <Badge variant="success">Completed</Badge>
              ) : (
                <Badge variant="warning">Missing</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Patient Decision / Signature Outcome</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex gap-3">
                <RadioGroup
                  value={signature.outcome}
                  onValueChange={(value) =>
                    setSignature((prev) => ({
                      ...prev,
                      outcome: value as SignatureOutcome,
                    }))
                  }
                >
                  <RadioGroupLabel>
                    <RadioGroupItem value="signed" /> Signed
                  </RadioGroupLabel>
                  <RadioGroupLabel>
                    <RadioGroupItem value="refused_to_sign" /> Refused to Sign
                  </RadioGroupLabel>
                  <RadioGroupLabel>
                    <RadioGroupItem value="unable_to_sign" /> Unable to Sign
                  </RadioGroupLabel>
                </RadioGroup>
              </div>

              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Signer Name"
                value={signature.signer_name}
                onChange={(e) =>
                  setSignature((prev) => ({
                    ...prev,
                    signer_name: e.target.value,
                  }))
                }
              />

              {signature.outcome !== "signed" ? (
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Reason"
                  value={signature.reason}
                  onChange={(e) =>
                    setSignature((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                />
              ) : null}
            </div>

            <div className="flex flex-col items-start justify-center gap-2">
              <Button variant="default" disabled={loading} onClick={handleSignature}>
                Record Signature Outcome
              </Button>

              {signature.signer_name ? (
                <Badge variant="success">Completed</Badge>
              ) : (
                <Badge variant="warning">Missing</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Witness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Witness Name"
                value={witness.witness_name}
                onChange={(e) =>
                  setWitness((prev) => ({
                    ...prev,
                    witness_name: e.target.value,
                  }))
                }
              />

              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Witness Role"
                value={witness.witness_role}
                onChange={(e) =>
                  setWitness((prev) => ({
                    ...prev,
                    witness_role: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col items-start justify-center gap-2">
              <Button variant="default" disabled={loading} onClick={handleWitness}>
                Record Witness
              </Button>

              {witness.witness_name ? (
                <Badge variant="success">Completed</Badge>
              ) : (
                <Badge variant="warning">Missing</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Legal Package</CardTitle>
        </CardHeader>
        <CardContent>
          {legalPackage ? (
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-slate-700">Version:</span>{" "}
                {legalPackage.version}
              </div>

              <div>
                <Badge variant="success">Generated</Badge>
              </div>

              <a
                href={legalPackage.download_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Badge variant="warning">Not generated</Badge>
              <Button
                variant="default"
                disabled={loading}
                onClick={handleGenerateLegalPackage}
              >
                Generate Legal Package
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Legal Readiness Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          {legalReadinessReport ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={legalReadinessReport.readyForLegal ? "success" : "warning"}>
                  {legalReadinessReport.status}
                </Badge>
                <span className="text-sm text-slate-600">
                  Consent: {legalReadinessReport.evidence?.consentCount ?? 0} • Documents: {legalReadinessReport.evidence?.documentCount ?? 0}
                </span>
              </div>
              <ul className="space-y-2 text-sm">
                {legalReadinessReport.checklist.map((item) => (
                  <li key={item.key} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                    <div>
                      <div className="font-medium text-slate-800">{item.label}</div>
                      <div className="text-slate-500">{item.reason}</div>
                    </div>
                    <Badge variant={item.satisfied ? "success" : item.required ? "warning" : "outline"}>
                      {item.satisfied ? "Compliant" : item.required ? "Blocked" : "Optional"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-slate-600">No checklist has been evaluated yet.</div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consent & Signatures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant={consentRecords.length > 0 ? "success" : "warning"}>{consentRecords.length} consent record(s)</Badge>
              <Badge variant={signature.signer_name ? "success" : "warning"}>Signature {signature.signer_name ? "captured" : "missing"}</Badge>
              <Badge variant={witness.witness_name ? "success" : "outline"}>Witness {witness.witness_name ? "recorded" : "not required / pending"}</Badge>
            </div>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-3">
                <select aria-label="Consent method" className="w-full rounded border px-3 py-2 text-sm" value={consentForm.consentMethod} onChange={(e) => setConsentForm((prev) => ({ ...prev, consentMethod: e.target.value }))}>
                  <option value="ELECTRONIC_SIGNATURE">Electronic signature</option>
                  <option value="OTP">OTP</option>
                  <option value="WITNESS_ACKNOWLEDGMENT">Witness acknowledgment</option>
                  <option value="WRITTEN">Written</option>
                </select>
                <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Processing purpose" value={consentForm.processingPurpose} onChange={(e) => setConsentForm((prev) => ({ ...prev, processingPurpose: e.target.value }))} />
                <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Lawful basis" value={consentForm.lawfulBasis} onChange={(e) => setConsentForm((prev) => ({ ...prev, lawfulBasis: e.target.value }))} />
              </div>
              <div className="space-y-3">
                <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Consent type" value={consentForm.consentType} onChange={(e) => setConsentForm((prev) => ({ ...prev, consentType: e.target.value }))} />
                <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Document version" value={consentForm.documentVersion} onChange={(e) => setConsentForm((prev) => ({ ...prev, documentVersion: e.target.value }))} />
                <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Witness / confirmer name" value={consentForm.witnessName} onChange={(e) => setConsentForm((prev) => ({ ...prev, witnessName: e.target.value }))} />
                {consentForm.consentMethod === "OTP" ? (
                  <input className="w-full rounded border px-3 py-2 text-sm" placeholder="OTP reference" value={consentForm.otpReference} onChange={(e) => setConsentForm((prev) => ({ ...prev, otpReference: e.target.value }))} />
                ) : null}
              </div>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <Button variant="outline" disabled={loading} onClick={handleRecordConsent}>Record Consent Evidence</Button>
              <Badge variant={consentRecords.length > 0 ? "success" : "outline"}>{consentForm.consentMethod.replaceAll("_", " ")}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              {consentRecords.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No consent records saved yet.</div>
              ) : (
                consentRecords.slice(0, 5).map((record) => (
                  <div key={record.id} className="rounded-xl border border-slate-200 px-3 py-2">
                    <div className="font-medium text-slate-800">{record.processingPurpose || "Discharge refusal consent"}</div>
                    <div className="text-slate-500">Method: {record.consentMethod || "N/A"}</div>
                    <div className="text-slate-500">Hash: {record.documentHash?.slice(0, 16) || "—"}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignments & SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-600">Current workflow phase</span><Badge variant="outline">{steps[Math.max(activeStep, 0)]?.label || "Case Intake"}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-slate-600">Open blockers</span><Badge variant={readiness?.ready_for_legal ? "success" : "warning"}>{legalReadinessReport?.blockers?.length ?? 0}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-slate-600">Escalation required</span><Badge variant={legalReadinessReport?.readyForLegal ? "success" : "warning"}>{legalReadinessReport?.readyForLegal ? "No" : "Review required"}</Badge></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                The case remains case-centric; medical, legal, consent, audit, and export controls are evaluated from one workspace.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant={auditChain?.verification?.verified ? "success" : "warning"}>
                Hash chain {auditChain?.verification?.verified ? "verified" : "pending / attention"}
              </Badge>
              <span className="text-sm text-slate-600">{auditChain?.verification?.totalEvents ?? 0} event(s)</span>
            </div>
            <div className="space-y-2 text-sm">
              {auditChain?.events?.length ? auditChain.events.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="font-medium text-slate-800">{event.eventType}</div>
                  <div className="text-slate-500">{event.payloadSummary}</div>
                  <div className="text-slate-400">{new Date(event.createdAt).toLocaleString()}</div>
                </div>
              )) : <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No audit chain events available yet.</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {documents.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No generated documents found for this case yet.</div>
              ) : (
                documents.slice(0, 8).map((document) => (
                  <div key={document.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <div>
                      <div className="font-medium text-slate-800">{document.title || document.template_key || "Document"}</div>
                      <div className="text-slate-500">{document.generated_at ? new Date(document.generated_at).toLocaleString() : "Pending"}</div>
                    </div>
                    <Badge variant={document.generationStatus === "generated" ? "success" : "outline"}>{document.generationStatus || "draft"}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Security / Access Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {(auditChain?.events ?? []).filter((event) => /EXPORT|SIGNATURE|CONSENT|PRIVILEGED/i.test(event.eventType)).slice(0, 8).map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">{event.eventType}</span>
                  <Badge variant="outline">{event.actorRole || "system"}</Badge>
                </div>
                <div className="text-slate-500">{event.payloadSummary}</div>
                <div className="text-slate-400">Hash: {event.currentHash.slice(0, 16)}…</div>
              </div>
            ))}
            {(auditChain?.events ?? []).filter((event) => /EXPORT|SIGNATURE|CONSENT|PRIVILEGED/i.test(event.eventType)).length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No security-sensitive access events have been captured yet.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      </AppShell>
    </AuthGuard>
  );
}