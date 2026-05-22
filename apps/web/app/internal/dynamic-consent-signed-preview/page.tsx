"use client";

/**
 * Internal Signed Informed Consent Preview Page
 *
 * Internal-only, non-production preview that demonstrates an
 * end-to-end signed informed consent rendering flow using UAT
 * sample data exclusively. No production renderer or production
 * informed-consent workflow is touched. No database is written.
 * No public route is exposed.
 *
 * Gated by `?engine=dynamic-preview`. Default-deny.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface EvidenceQrPlaceholder {
  payload: string;
  label: string;
  isReal: boolean;
}

interface EvidencePackage {
  evidenceId: string;
  templateId: string;
  templateVersion: string;
  patientMrn: string;
  encounterNo: string;
  caseNumber: string;
  generatedAt: string;
  generatedBy: string;
  auditHash: string;
  templateHash: string;
  payloadHash: string;
  verificationUrl: string;
  qrPlaceholder: EvidenceQrPlaceholder;
  legalFooter: string;
}

interface SimulatedSignature {
  role: string;
  name: string;
  statement: string;
}

interface SignedPreviewResponse {
  success: boolean;
  error?: string;
  html?: string;
  evidence?: EvidencePackage;
  signatures?: SimulatedSignature[];
  signingMethod?: string;
  suggestedFilename?: string;
  generatedAt?: string;
  language?: string;
  warning?: string;
}

interface ValidationPanelResponse {
  success?: boolean;
  [key: string]: unknown;
}

const SAMPLE_PATIENT = {
  name: "نجيب الفلاح",
  mrn: "IMC-2026-02000",
  encounter: "ENC-UAT-2026-0001",
  caseNumber: "CASE-2026-0001",
  specialty: "Cardiology",
  diagnosis: "Pre-operative informed consent assessment",
  procedure: "Diagnostic Cardiac Catheterization",
  physician: "Dr. Ahmed Al-Salmi",
  physicianLicense: "LIC-ALH-001",
  anesthesia: "Local with sedation",
};

const SIGNED_PDF_ENDPOINT = "/api/internal/dynamic-consent/signed-pdf";
const VALIDATION_ENDPOINT = "/api/internal/dynamic-consent/validation";

const DEFAULT_SIGNATURES: SimulatedSignature[] = [
  { role: "Patient", name: SAMPLE_PATIENT.name, statement: "" },
  { role: "Physician", name: SAMPLE_PATIENT.physician, statement: "" },
  { role: "Witness", name: "UAT Nurse", statement: "" },
];

export default function DynamicConsentSignedPreviewPage() {
  const searchParams = useSearchParams();
  const engineParam = searchParams?.get("engine") ?? null;
  const enabled = engineParam === "dynamic-preview";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SignedPreviewResponse | null>(null);
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationPanelResponse | null>(
    null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const loadSigned = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${SIGNED_PDF_ENDPOINT}?engine=dynamic-preview&signed=true&format=html&language=bilingual`;
      const res = await fetch(url, { cache: "no-store" });
      const json: SignedPreviewResponse = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || `Request failed: ${res.status}`);
        setData(null);
        return;
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void loadSigned();
  }, [enabled, loadSigned]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !data?.html) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(data.html);
    doc.close();
  }, [data?.html]);

  const verificationHref = useMemo(() => {
    if (!data?.evidence?.evidenceId) return null;
    return `/internal/verify/${encodeURIComponent(
      data.evidence.evidenceId,
    )}?engine=dynamic-preview`;
  }, [data?.evidence?.evidenceId]);

  const handlePrint = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      return;
    }
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    setPdfStatus("Requesting binary PDF…");
    try {
      const res = await fetch(
        `${SIGNED_PDF_ENDPOINT}?engine=dynamic-preview&signed=true&language=bilingual`,
        { cache: "no-store" },
      );
      if (res.status === 501) {
        setPdfStatus(
          "PDF binary renderer unavailable in this environment. Use Print / Save as PDF instead.",
        );
        return;
      }
      if (!res.ok) {
        setPdfStatus(`Signed PDF request failed: ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const filename =
        data?.suggestedFilename ??
        `wathiqcare-signed-informed-consent-preview.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setPdfStatus(`Signed PDF downloaded: ${filename}`);
    } catch (err) {
      setPdfStatus(
        `Signed PDF error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [data?.suggestedFilename]);

  const handleOpenVerification = useCallback(() => {
    if (!verificationHref) return;
    window.open(verificationHref, "_blank", "noopener,noreferrer");
  }, [verificationHref]);

  const handleRunValidation = useCallback(async () => {
    setValidation(null);
    setValidationError(null);
    try {
      const url = `${VALIDATION_ENDPOINT}?engine=dynamic-preview&renderer=legal-grade&evidence=true&demo=cardiology&language=bilingual`;
      const res = await fetch(url, { cache: "no-store" });
      const json: ValidationPanelResponse = await res.json();
      if (!res.ok) {
        setValidationError(
          (json && (json.error as string)) || `Validation failed: ${res.status}`,
        );
        return;
      }
      setValidation(json);
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : String(err),
      );
    }
  }, []);

  if (!enabled) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-3xl mx-auto rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Dynamic Consent Signed Preview
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Dynamic consent signed preview is disabled.
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Append <code className="font-mono">?engine=dynamic-preview</code>{" "}
            to enable the internal preview surface.
          </p>
        </div>
      </main>
    );
  }

  const signatures = data?.signatures ?? DEFAULT_SIGNATURES;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-100 text-amber-900 px-4 py-2 text-sm">
          <strong>INTERNAL PREVIEW ONLY — NOT ACTIVE IN PRODUCTION.</strong>{" "}
          UAT/sample data; signatures are simulated; no DB write occurs.
        </div>

        <header className="mb-4 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            Signed Informed Consent — Internal Preview
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-xs font-mono text-sky-700">
            UAT sample
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-xs font-mono text-sky-700">
            bilingual
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-xs font-mono text-sky-700">
            preview-only
          </span>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Patient
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-500">Name</dt>
              <dd>{SAMPLE_PATIENT.name}</dd>
              <dt className="text-slate-500">MRN</dt>
              <dd className="font-mono">{SAMPLE_PATIENT.mrn}</dd>
              <dt className="text-slate-500">Encounter</dt>
              <dd className="font-mono">{SAMPLE_PATIENT.encounter}</dd>
              <dt className="text-slate-500">Case</dt>
              <dd className="font-mono">{SAMPLE_PATIENT.caseNumber}</dd>
            </dl>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Clinical Context
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-500">Specialty</dt>
              <dd>{SAMPLE_PATIENT.specialty}</dd>
              <dt className="text-slate-500">Diagnosis</dt>
              <dd>{SAMPLE_PATIENT.diagnosis}</dd>
              <dt className="text-slate-500">Procedure</dt>
              <dd>{SAMPLE_PATIENT.procedure}</dd>
              <dt className="text-slate-500">Anesthesia</dt>
              <dd>{SAMPLE_PATIENT.anesthesia}</dd>
            </dl>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Physician
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-500">Name</dt>
              <dd>{SAMPLE_PATIENT.physician}</dd>
              <dt className="text-slate-500">License</dt>
              <dd className="font-mono">{SAMPLE_PATIENT.physicianLicense}</dd>
              <dt className="text-slate-500">Role</dt>
              <dd>Cardiologist</dd>
            </dl>
          </div>
        </section>

        <section className="mb-4 rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Simulated Signatures (Preview)
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            No e-signature service, OTP, or DocuSign integration is used.
            Signing method:{" "}
            <code className="font-mono text-slate-700">
              {data?.signingMethod ?? "PREVIEW_SIMULATED_SIGNATURE"}
            </code>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {signatures.map((sig) => (
              <div
                key={sig.role}
                className="rounded-md border border-slate-300 bg-slate-50 p-3"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {sig.role} signed
                </div>
                <div className="mt-1 italic text-slate-900 text-sm">
                  Signed electronically by {sig.name}
                </div>
                <div className="mt-2 font-mono text-[10px] text-slate-500">
                  signed at: {data?.generatedAt ?? "—"}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              "Patient Signed",
              "Physician Signed",
              "Witness Confirmed",
              "Evidence Package Generated",
            ].map((label) => (
              <span
                key={label}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-mono text-emerald-700"
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Evidence QR / Barcode
          </h2>
          {data?.evidence ? (
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
              <div className="w-[180px] h-[180px] border-2 border-dashed border-slate-400 rounded-md bg-white flex items-center justify-center p-2">
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1.5">
                    QR Placeholder
                  </div>
                  <div className="font-mono text-[10px] break-all text-slate-700">
                    {data.evidence.qrPlaceholder.payload}
                  </div>
                </div>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-slate-500">Evidence ID</dt>
                <dd className="font-mono break-all">
                  {data.evidence.evidenceId}
                </dd>
                <dt className="text-slate-500">Audit hash (short)</dt>
                <dd className="font-mono break-all">
                  {data.evidence.auditHash.slice(0, 12)}
                </dd>
                <dt className="text-slate-500">Template version</dt>
                <dd className="font-mono">{data.evidence.templateVersion}</dd>
                <dt className="text-slate-500">Verification URL</dt>
                <dd className="font-mono break-all">
                  {verificationHref ?? data.evidence.verificationUrl}
                </dd>
              </dl>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Loading evidence package…</p>
          )}
        </section>

        <section className="mb-4 rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm hover:bg-slate-700"
            >
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm hover:bg-slate-50"
            >
              Download Signed Preview PDF
            </button>
            <button
              type="button"
              onClick={handleOpenVerification}
              disabled={!verificationHref}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm disabled:opacity-50 hover:bg-slate-50"
            >
              Open Verification Preview
            </button>
            <button
              type="button"
              onClick={handleRunValidation}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm hover:bg-slate-50"
            >
              Run Validation
            </button>
          </div>
          {pdfStatus && (
            <div className="mt-2 text-xs px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
              {pdfStatus}
            </div>
          )}
        </section>

        <section className="mb-4 rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Validation Panel
          </h2>
          {validationError && (
            <div className="mb-2 text-xs px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-rose-800">
              {validationError}
            </div>
          )}
          {!validation && !validationError && (
            <p className="text-sm text-slate-500">
              Click <em>Run Validation</em> to fetch the consolidated
              validation report (RTL, signature layout, evidence package,
              PDF capability, verification preview, pilot mode).
            </p>
          )}
          {validation && (
            <pre className="rounded-md bg-slate-900 text-slate-100 p-3 text-[11px] overflow-x-auto max-h-80">
              {JSON.stringify(validation, null, 2)}
            </pre>
          )}
        </section>

        <section className="mb-4 rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Rendered Signed Consent Document
          </h2>
          {loading && (
            <p className="text-sm text-slate-500">Loading signed preview…</p>
          )}
          {error && (
            <div className="mb-2 text-xs px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-rose-800">
              {error}
            </div>
          )}
          <iframe
            ref={iframeRef}
            title="Signed Informed Consent Preview"
            className="w-full min-h-[800px] border border-slate-200 rounded-md bg-white"
          />
        </section>

        <footer className="mt-6 text-[11px] text-slate-500 flex flex-wrap justify-between gap-2">
          <div>
            WathiqCare™ Internal Preview Surface · Dynamic Consent Engine ·
            UAT/sample data only
          </div>
          {data?.warning && <div className="text-amber-800">{data.warning}</div>}
        </footer>
      </div>
    </main>
  );
}
