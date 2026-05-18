"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { captureFingerprintVerification, detectDigitalPersona4500, DIGITALPERSONA_LOCAL_AGENT_ENDPOINT } from "@/lib/signature/digitalpersona-local-agent-client";
import { apiFetch } from "@/utils/api";

type ScreenMode = "patient-review" | "signature" | "witness" | "interpreter" | "audit-trail" | "evidence-export";

type TimelineEvent = {
  id: string;
  action: string;
  actorRole?: string | null;
  actorUserId?: string | null;
  createdAt: string;
};

type ConsentDocument = {
  id: string;
  consentReference: string;
  status: string;
  patientName: string;
  mrn?: string | null;
  physicianName: string;
  plannedProcedure?: string | null;
  diagnosis?: string | null;
  risksAr?: string | null;
  risksEn?: string | null;
  alternativesAr?: string | null;
  alternativesEn?: string | null;
  refusalRisksAr?: string | null;
  refusalRisksEn?: string | null;
};

export default function InformedConsentsEnterpriseWorkflowScreens({
  documentId,
  mode,
}: {
  documentId: string;
  mode: ScreenMode;
}) {
  const [doc, setDoc] = useState<ConsentDocument | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [signerName, setSignerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [biometricSaving, setBiometricSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [biometricStatus, setBiometricStatus] = useState<"idle" | "detecting" | "ready" | "verifying" | "submitted" | "error">("idle");
  const [biometricMessage, setBiometricMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [document, timelineData] = await Promise.all([
          apiFetch<ConsentDocument>(`/api/modules/informed-consents/documents/${documentId}`),
          mode === "audit-trail"
            ? apiFetch<TimelineEvent[]>(`/api/modules/informed-consents/documents/${documentId}/timeline`).catch(() => [])
            : Promise.resolve([]),
        ]);

        if (!mounted) return;
        setDoc(document);
        setTimeline(Array.isArray(timelineData) ? timelineData : []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load document");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [documentId, mode]);

  const title = useMemo(() => {
    if (mode === "patient-review") return "Patient Review Screen";
    if (mode === "signature") return "Signature Screen";
    if (mode === "witness") return "Witness Confirmation Screen";
    if (mode === "interpreter") return "Interpreter Confirmation Screen";
    if (mode === "audit-trail") return "Legal Audit Trail Viewer";
    return "Consent Evidence Package Export";
  }, [mode]);

  async function captureSignature(role: "PATIENT" | "WITNESS" | "INTERPRETER") {
    if (!signerName.trim()) {
      setError("Signer name is required");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/modules/informed-consents/documents/${documentId}/sign`, {
        method: "POST",
        body: JSON.stringify({
          role,
          signerName: signerName.trim(),
          signatureMethod: "OTP",
        }),
      });
      setSuccess(`${role} signature captured successfully.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to capture signature");
    } finally {
      setSaving(false);
    }
  }

  async function detectBiometricAgent() {
    setBiometricStatus("detecting");
    setBiometricMessage("");
    try {
      const detection = await detectDigitalPersona4500();
      setBiometricStatus(detection.available ? "ready" : "error");
      setBiometricMessage(
        detection.available
          ? `${detection.sdkProvider} ${detection.deviceModel} local agent is reachable.`
          : "DigitalPersona local agent is not reachable.",
      );
    } catch (e) {
      setBiometricStatus("error");
      setBiometricMessage(e instanceof Error ? e.message : "Failed to detect local biometric agent");
    }
  }

  async function captureBiometricSignature() {
    if (!signerName.trim()) {
      setError("Signer name is required");
      return;
    }

    setBiometricSaving(true);
    setError("");
    setSuccess("");
    setBiometricMessage("");
    setBiometricStatus("verifying");
    try {
      const verificationResult = await captureFingerprintVerification({ method: "biometric-fingerprint" });
      const result = await apiFetch<{ evidence?: { evidenceId?: string; evidenceHash?: string } }>(
        "/api/modules/informed-consents/signature/biometric",
        {
          method: "POST",
          body: JSON.stringify({
            documentId,
            role: "PATIENT",
            signerName: signerName.trim(),
            acknowledgmentAccepted: true,
            verificationResult,
          }),
        },
      );
      setBiometricStatus("submitted");
      setSuccess(
        `Biometric verification submitted for patient signature. Evidence ID: ${result.evidence?.evidenceId || "-"}, hash: ${result.evidence?.evidenceHash || "-"}`,
      );
    } catch (e) {
      setBiometricStatus("error");
      setError(e instanceof Error ? e.message : "Failed to capture biometric signature");
    } finally {
      setBiometricSaving(false);
    }
  }

  async function exportEvidence() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiFetch<{ verificationToken?: string; checksumSha256?: string }>(
        `/api/modules/informed-consents/documents/${documentId}/evidence-package`,
        { method: "POST" },
      );
      setSuccess(
        `Evidence package generated. Token: ${result.verificationToken || "-"}, checksum: ${result.checksumSha256 || "-"}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate evidence package");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="p-6 text-sm text-slate-600">Loading...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">Document ID: {documentId}</p>
        {doc ? (
          <p className="text-sm text-slate-600">Reference: {doc.consentReference} | Status: {doc.status}</p>
        ) : null}
      </header>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

      {mode === "patient-review" && doc ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-sm">
          <p><strong>Patient:</strong> {doc.patientName} ({doc.mrn || "-"})</p>
          <p><strong>Physician:</strong> {doc.physicianName}</p>
          <p><strong>Diagnosis:</strong> {doc.diagnosis || "-"}</p>
          <p><strong>Procedure:</strong> {doc.plannedProcedure || "-"}</p>
          <p><strong>Risks (AR):</strong> {doc.risksAr || "-"}</p>
          <p><strong>Alternatives (AR):</strong> {doc.alternativesAr || "-"}</p>
          <p><strong>Refusal Risks (AR):</strong> {doc.refusalRisksAr || "-"}</p>
          <div className="pt-2">
            <Link className="rounded border border-slate-300 px-3 py-2 text-sm" href={`/modules/informed-consents/${documentId}/preview?lang=bilingual`}>
              Open bilingual preview
            </Link>
          </div>
        </section>
      ) : null}

      {(mode === "signature" || mode === "witness" || mode === "interpreter") ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor="signerName">Signer Name</label>
          <input
            id="signerName"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Enter signer full name"
          />
          {mode === "signature" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={saving || biometricSaving} onClick={() => void captureSignature("PATIENT")} className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">
                  {saving ? "Submitting..." : "Submit OTP Signature"}
                </button>
                <button type="button" disabled={saving || biometricSaving || biometricStatus === "detecting" || biometricStatus === "verifying"} onClick={() => void detectBiometricAgent()} className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">
                  {biometricStatus === "detecting" ? <LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : null}
                  Detect DigitalPersona Local Agent
                </button>
                <button type="button" disabled={saving || biometricSaving || biometricStatus === "detecting" || biometricStatus === "verifying"} onClick={() => void captureBiometricSignature()} className="rounded bg-sky-700 px-3 py-2 text-sm text-white disabled:opacity-50">
                  {biometricStatus === "verifying" ? <LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : null}
                  Verify and Submit Biometric Signature
                </button>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <div><strong>Local agent endpoint:</strong> {DIGITALPERSONA_LOCAL_AGENT_ENDPOINT}</div>
                <div><strong>Status:</strong> {biometricStatus}</div>
                <div><strong>Message:</strong> {biometricMessage || "Biometric flow is Local Agent only and remains feature-flagged off by default."}</div>
                <div className="mt-2 text-amber-800">HID DigitalPersona SDK or approved HID driver is required. Windows Hello WBF alone is not sufficient. Production activation requires Legal, PDPL, Cybersecurity, and vendor SDK approval.</div>
              </div>
            </div>
          ) : null}
          {mode === "witness" ? (
            <button type="button" disabled={saving} onClick={() => void captureSignature("WITNESS")} className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">
              {saving ? "Submitting..." : "Confirm Witness Signature"}
            </button>
          ) : null}
          {mode === "interpreter" ? (
            <button type="button" disabled={saving} onClick={() => void captureSignature("INTERPRETER")} className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">
              {saving ? "Submitting..." : "Confirm Interpreter Signature"}
            </button>
          ) : null}
        </section>
      ) : null}

      {mode === "audit-trail" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Audit Timeline</h2>
          <div className="space-y-2 text-sm">
            {timeline.map((event) => (
              <div key={event.id} className="rounded border border-slate-200 p-2">
                <div><strong>Action:</strong> {event.action}</div>
                <div><strong>Actor:</strong> {event.actorRole || "-"} ({event.actorUserId || "-"})</div>
                <div><strong>Time:</strong> {new Date(event.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {timeline.length === 0 ? <div className="text-slate-500">No audit events found.</div> : null}
          </div>
        </section>
      ) : null}

      {mode === "evidence-export" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-sm text-slate-700">Generate immutable evidence package, verification token, and checksum for legal archive.</p>
          <button type="button" disabled={saving} onClick={() => void exportEvidence()} className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">
            {saving ? "Generating..." : "Generate Evidence Package"}
          </button>
          <Link className="inline-block rounded border border-slate-300 px-3 py-2 text-sm" href={`/api/modules/informed-consents/documents/${documentId}/evidence-package`} target="_blank">
            View evidence metadata
          </Link>
        </section>
      ) : null}
    </main>
  );
}
