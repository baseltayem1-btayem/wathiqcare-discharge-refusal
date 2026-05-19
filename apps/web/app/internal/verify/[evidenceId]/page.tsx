"use client";

/**
 * Internal Verification Portal Preview
 *
 * Internal-only proof-of-concept for the eventual `/verify/<evidenceId>`
 * production page. NO production exposure. NO DB lookup. NO real
 * verification. Sample data only for evidence IDs prefixed with `EV-`.
 *
 * Gated by `?engine=dynamic-preview` (or the feature flag); the API it
 * calls re-validates the gate server-side.
 */

import { use, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerificationStatus = "PREVIEW_ONLY" | "NOT_FOUND" | "ERROR";

interface VerificationResponse {
  success: boolean;
  status?: VerificationStatus;
  evidenceId?: string;
  error?: string;
  warning?: string;
  verification?: {
    authenticity: string;
    hashStatus: string;
    signerChainStatus: string;
    qrStatus: string;
  };
  metadata?: {
    templateId: string;
    templateVersion: string;
    patientMrnMasked: string;
    encounterNo: string;
    caseNumber: string;
    generatedAt: string;
    generatedBy: string;
    auditHash: string;
    templateHash: string;
    payloadHash: string;
    verificationUrl: string;
    qrPlaceholder: { payload: string; label: string; isReal: boolean };
    legalFooter: string;
  };
}

export default function InternalVerifyPage({
  params,
}: {
  params: Promise<{ evidenceId: string }>;
}) {
  const { evidenceId } = use(params);
  const searchParams = useSearchParams();
  const engineParam = searchParams?.get("engine");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationResponse | null>(null);

  const fetchVerification = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      sp.set("engine", "dynamic-preview");
      const response = await fetch(
        `/api/internal/dynamic-consent/verify/${encodeURIComponent(evidenceId)}?${sp.toString()}`,
      );
      const json: VerificationResponse = await response.json();
      if (!response.ok || !json.success) {
        setError(json.error || `Request failed (HTTP ${response.status})`);
        setData(json);
        return;
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [evidenceId]);

  useEffect(() => {
    if (engineParam !== "dynamic-preview") return;
    fetchVerification();
  }, [engineParam, fetchVerification]);

  if (engineParam !== "dynamic-preview") {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-3xl mx-auto rounded-xl bg-red-50 border border-red-200 p-6">
          <h1 className="text-lg font-bold text-red-900">
            Verification preview disabled
          </h1>
          <p className="text-sm text-red-800 mt-2">
            This internal verification preview requires the
            <code className="mx-1 font-mono px-1.5 py-0.5 rounded bg-red-100">
              ?engine=dynamic-preview
            </code>
            query parameter.
          </p>
          <p className="text-xs text-red-700/80 mt-3 font-mono">
            HTTP 403 — feature-gated internal route.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Verification Preview
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Internal proof-of-concept. Not a final legal verification.
                No DB lookup performed.
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-xs font-mono text-amber-800">
              status: PREVIEW ONLY
            </span>
          </div>
          <div className="mt-4 text-xs font-mono text-slate-700">
            evidence id: <span className="break-all">{evidenceId}</span>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 text-sm text-amber-900">
          <strong>Warning:</strong> This is a preview verification page and
          is <em>not</em> final legal verification. No hash chain is
          validated against a persisted record; no signer chain is
          asserted; no real QR code is rendered.
        </div>

        {loading && (
          <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-32 bg-slate-100 rounded" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-5">
            <h2 className="text-base font-semibold text-red-800 mb-1">
              Verification unavailable
            </h2>
            <p className="text-sm text-red-700">{error}</p>
            {data?.status === "NOT_FOUND" && (
              <p className="text-xs text-red-700/80 mt-2">
                The internal preview only resolves sample evidence IDs
                prefixed with <code className="font-mono">EV-</code>.
              </p>
            )}
          </div>
        )}

        {data?.success && data.metadata && data.verification && (
          <>
            <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
                Verification flags
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <VerifyFlag label="Authenticity" value={data.verification.authenticity} />
                <VerifyFlag label="Hash status" value={data.verification.hashStatus} />
                <VerifyFlag label="Signer chain" value={data.verification.signerChainStatus} />
                <VerifyFlag label="QR status" value={data.verification.qrStatus} />
              </div>
            </div>

            <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
                Evidence metadata
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Field label="Evidence ID" value={data.evidenceId} mono breakAll />
                <Field label="Template ID" value={data.metadata.templateId} mono />
                <Field label="Template Version" value={data.metadata.templateVersion} mono />
                <Field label="Patient MRN (masked)" value={data.metadata.patientMrnMasked} mono />
                <Field label="Case Number" value={data.metadata.caseNumber} mono />
                <Field label="Encounter Number" value={data.metadata.encounterNo} mono />
                <Field label="Generated At" value={data.metadata.generatedAt} mono />
                <Field label="Generated By" value={data.metadata.generatedBy} mono />
                <Field label="Audit Hash" value={data.metadata.auditHash} mono breakAll />
                <Field label="Template Hash" value={data.metadata.templateHash} mono breakAll />
                <Field label="Payload Hash" value={data.metadata.payloadHash} mono breakAll />
                <Field
                  label="Verification URL (placeholder)"
                  value={data.metadata.verificationUrl}
                  mono
                  breakAll
                />
              </div>
            </div>

            <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
                QR placeholder
              </h2>
              <div className="flex items-start gap-4">
                <div className="w-32 h-32 border-2 border-dashed border-slate-400 rounded-md flex items-center justify-center text-[10px] font-mono text-slate-500 text-center p-2">
                  {data.metadata.qrPlaceholder.label}
                </div>
                <pre className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded p-2 whitespace-pre-wrap break-all">
{data.metadata.qrPlaceholder.payload}
                </pre>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                isReal = {String(data.metadata.qrPlaceholder.isReal)} — real QR
                encoding is intentionally not wired in the preview.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
              {data.metadata.legalFooter}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  breakAll,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  breakAll?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </div>
      <div
        className={[
          "text-slate-900 mt-0.5",
          mono ? "font-mono text-xs" : "text-sm",
          breakAll ? "break-all" : "",
        ].join(" ")}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function VerifyFlag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </div>
      <div className="text-xs font-mono text-slate-800 mt-0.5">{value}</div>
    </div>
  );
}
