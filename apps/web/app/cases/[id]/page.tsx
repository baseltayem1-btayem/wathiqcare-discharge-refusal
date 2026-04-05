"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Package,
} from "lucide-react";

import AppShell from "@/components/AppShell";
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

type CaseApiResponse = {
  id: string;
  mrn?: string;
  patient?: string;
  patientName?: string;
  physician?: string;
  attendingPhysician?: string;
  diagnosis?: string;
  status?: string;
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

type ReadinessState = {
  ready_for_legal: boolean;
  reason?: string;
};

type LegalPackageMeta = {
  version: number;
  download_url: string;
};

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

function toCaseData(payload: CaseApiResponse): CaseData {
  return {
    id: payload.id,
    mrn: payload.mrn ?? "",
    patient: payload.patient ?? payload.patientName ?? "",
    physician: payload.physician ?? payload.attendingPhysician ?? "",
    diagnosis: payload.diagnosis ?? "",
    status: payload.status ?? "unknown",
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
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
  const [readiness, setReadiness] = useState<ReadinessState | null>(null);
  const [legalPackage, setLegalPackage] = useState<LegalPackageMeta | null>(null);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

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
        const casePromise = apiFetch<CaseApiResponse>(`/api/cases/${caseId}`);

        const readinessPromise = apiFetch<ReadinessState>(
          `/api/discharge/cases/${caseId}/readiness`,
        ).catch(() => null);

        const legalPackagePromise = apiFetch<LegalPackageMeta>(
          `/api/discharge/cases/${caseId}/legal-package`,
        ).catch(() => null);

        const [caseResponse, readinessResponse, legalPackageResponse] =
          await Promise.all([casePromise, readinessPromise, legalPackagePromise]);

        if (cancelled) return;

        setCaseData(toCaseData(caseResponse));
        setReadiness(readinessResponse);
        setLegalPackage(legalPackageResponse);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(getErrorMessage(err, "Failed to load case"));
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

    const [readinessResponse, legalPackageResponse] = await Promise.all([
      apiFetch<ReadinessState>(`/api/discharge/cases/${caseId}/readiness`).catch(() => null),
      apiFetch<LegalPackageMeta>(`/api/discharge/cases/${caseId}/legal-package`).catch(() => null),
    ]);

    setReadiness(readinessResponse);
    setLegalPackage(legalPackageResponse);
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
    </AppShell>
  );
}