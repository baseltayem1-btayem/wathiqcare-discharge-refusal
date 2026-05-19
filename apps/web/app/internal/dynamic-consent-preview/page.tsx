"use client";

/**
 * Internal Dynamic Consent Preview Page
 *
 * Internal-only, non-production preview for the dynamic consent engine.
 * Adds in-page controls for:
 *  - Renderer mode (default | legal-grade)
 *  - Specialty demo presets (cardiology, general-surgery, orthopedics,
 *    anesthesia, dama, blood-transfusion)
 *  - Language (en | ar | bilingual)
 *  - Print / window.print()
 *  - Audit metadata inspection panel
 *
 * Feature-gated, no production navigation exposure, no document creation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type RendererMode = "default" | "legal-grade";
type PreviewLanguage = "en" | "ar" | "bilingual";

interface PreviewMetadata {
  patientName: string;
  patientMrn: string;
  encounterNo: string;
  caseNumber: string;
  specialty: string;
  language: string;
  generatedAt: string;
}

interface PreviewAudit {
  hash: string;
  generatedAt: string;
  payloadFingerprint?: string;
  templateId?: string;
  templateVersion?: string;
}

interface DemoSummary {
  id: string;
  labelEn: string;
  labelAr: string;
}

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

interface PreviewResponse {
  success: boolean;
  error?: string;
  engine?: string;
  renderer?: RendererMode;
  demo?: string | null;
  templateId?: string;
  templateVersion?: string;
  html?: string;
  titleAr?: string;
  titleEn?: string;
  warnings?: string[];
  metadata?: PreviewMetadata;
  audit?: PreviewAudit;
  availableDemos?: DemoSummary[];
  evidence?: EvidencePackage | null;
  verificationUrl?: string | null;
  suggestedFilename?: string | null;
  contentType?: string | null;
}

const DEFAULT_DEMOS: DemoSummary[] = [
  { id: "cardiology", labelEn: "Cardiology — Cardiac Catheterization", labelAr: "أمراض القلب" },
  { id: "general-surgery", labelEn: "General Surgery — Laparoscopic Cholecystectomy", labelAr: "جراحة عامة" },
  { id: "orthopedics", labelEn: "Orthopedics — Total Knee Arthroplasty", labelAr: "جراحة العظام" },
  { id: "anesthesia", labelEn: "Anesthesia — Separate Consent", labelAr: "التخدير" },
  { id: "dama", labelEn: "DAMA — Discharge Against Medical Advice", labelAr: "الخروج خلافاً للنصيحة" },
  { id: "blood-transfusion", labelEn: "Blood Transfusion — Packed Red Cells", labelAr: "نقل الدم" },
];

export default function DynamicConsentPreviewPage() {
  const searchParams = useSearchParams();
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialRenderer: RendererMode =
    (searchParams?.get("renderer") as RendererMode | null) === "legal-grade"
      ? "legal-grade"
      : "legal-grade";
  const initialDemo = searchParams?.get("demo") ?? "cardiology";
  const initialLang = (searchParams?.get("language") as PreviewLanguage | null) ?? "bilingual";

  const [rendererMode, setRendererMode] = useState<RendererMode>(initialRenderer);
  const [demoId, setDemoId] = useState<string>(initialDemo);
  const [language, setLanguage] = useState<PreviewLanguage>(initialLang);
  const [showAuditPanel, setShowAuditPanel] = useState<boolean>(false);
  const [evidenceEnabled, setEvidenceEnabled] = useState<boolean>(
    searchParams?.get("evidence") === "true",
  );
  const [pdfDownloading, setPdfDownloading] = useState<boolean>(false);
  const [pdfNotice, setPdfNotice] = useState<{ kind: "info" | "warn" | "error"; message: string } | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  const demos = useMemo(
    () => preview?.availableDemos ?? DEFAULT_DEMOS,
    [preview?.availableDemos],
  );

  const buildPreviewUrl = useCallback(() => {
    const params = new URLSearchParams();
    // Always ensure feature-flag bypass for internal preview surface.
    params.set("engine", "dynamic-preview");
    params.set("renderer", rendererMode);
    params.set("demo", demoId);
    params.set("language", language);
    if (evidenceEnabled) {
      params.set("evidence", "true");
    }
    return `/api/internal/dynamic-consent/preview?${params.toString()}`;
  }, [rendererMode, demoId, language, evidenceEnabled]);

  useEffect(() => {
    let cancelled = false;
    async function fetchPreview() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(buildPreviewUrl());
        const data: PreviewResponse = await response.json();
        if (cancelled) return;
        if (!response.ok || !data.success) {
          setError(data.error || "Failed to load preview");
          setPreview(null);
        } else {
          setPreview(data);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setPreview(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPreview();
    return () => {
      cancelled = true;
    };
  }, [buildPreviewUrl]);

  // Render the HTML inside a same-origin iframe for proper print isolation
  // (so the preview's embedded <style> doesn't leak into the app shell).
  useEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame || !preview?.html) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(preview.html);
    doc.close();
  }, [preview?.html]);

  const handlePrint = useCallback(() => {
    const frame = previewFrameRef.current;
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    setPdfNotice(null);
    setPdfDownloading(true);
    try {
      const params = new URLSearchParams();
      params.set("engine", "dynamic-preview");
      params.set("renderer", "legal-grade");
      params.set("evidence", "true");
      params.set("demo", demoId);
      params.set("language", language);
      const response = await fetch(
        `/api/internal/dynamic-consent/pdf-preview?${params.toString()}`,
      );
      const contentType = response.headers.get("content-type") ?? "";
      if (response.status === 501 || contentType.includes("application/json")) {
        let detail = "";
        try {
          const json = await response.json();
          detail = json?.detail || json?.message || "";
        } catch {
          /* ignore */
        }
        setPdfNotice({
          kind: "warn",
          message:
            "PDF binary renderer unavailable; use Print / Save as PDF for now." +
            (detail ? ` (${detail})` : ""),
        });
        return;
      }
      if (!response.ok) {
        setPdfNotice({
          kind: "error",
          message: `PDF preview request failed with status ${response.status}.`,
        });
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] ?? "wathiqcare-consent-preview.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPdfNotice({
        kind: "info",
        message: `Downloaded experimental PDF preview (${filename}).`,
      });
    } catch (err) {
      setPdfNotice({
        kind: "error",
        message:
          err instanceof Error
            ? `PDF preview request error: ${err.message}`
            : "PDF preview request error.",
      });
    } finally {
      setPdfDownloading(false);
    }
  }, [demoId, language]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header + Controls */}
        <div className="mb-6 rounded-xl bg-white shadow-sm border border-slate-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Dynamic Consent — Legal-Grade Preview
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Internal, feature-gated rendering surface. No documents are created. No
                patient records are modified.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
                engine: {preview?.engine ?? "dynamic-consent-preview"}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-700">
                renderer: {preview?.renderer ?? rendererMode}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="flex flex-col text-xs font-medium text-slate-700">
              <span className="mb-1 uppercase tracking-wider text-slate-500">Renderer</span>
              <select
                value={rendererMode}
                onChange={(e) => setRendererMode(e.target.value as RendererMode)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="legal-grade">Legal-Grade (new)</option>
                <option value="default">Default (baseline)</option>
              </select>
            </label>

            <label className="flex flex-col text-xs font-medium text-slate-700">
              <span className="mb-1 uppercase tracking-wider text-slate-500">Specialty Demo</span>
              <select
                value={demoId}
                onChange={(e) => setDemoId(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                {demos.map((demo) => (
                  <option key={demo.id} value={demo.id}>
                    {demo.labelEn}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-xs font-medium text-slate-700">
              <span className="mb-1 uppercase tracking-wider text-slate-500">Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as PreviewLanguage)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="bilingual">Bilingual (EN + AR)</option>
                <option value="en">English only</option>
                <option value="ar">العربية فقط</option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={!preview?.html}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40"
              >
                Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfDownloading}
                className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-indigo-300 bg-indigo-50 text-indigo-800 text-sm hover:bg-indigo-100 disabled:opacity-50"
                title="Internal experimental PDF binary preview (requires renderer=legal-grade and evidence=true)"
              >
                {pdfDownloading ? "Generating…" : "Download Experimental PDF"}
              </button>
              <button
                type="button"
                onClick={() => setEvidenceEnabled((v) => !v)}
                className={[
                  "inline-flex items-center justify-center px-3 py-2 rounded-md border text-sm",
                  evidenceEnabled
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
                title="Toggle internal legal-evidence package metadata"
              >
                {evidenceEnabled ? "Evidence: ON" : "Evidence: OFF"}
              </button>
              <button
                type="button"
                onClick={() => setShowAuditPanel((v) => !v)}
                className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-700 text-sm hover:bg-slate-50"
              >
                {showAuditPanel ? "Hide audit" : "Audit"}
              </button>
            </div>
          </div>
          {pdfNotice && (
            <div
              className={[
                "mt-3 rounded-md border px-3 py-2 text-xs",
                pdfNotice.kind === "info" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-800",
                pdfNotice.kind === "warn" &&
                  "border-amber-200 bg-amber-50 text-amber-800",
                pdfNotice.kind === "error" &&
                  "border-red-200 bg-red-50 text-red-800",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {pdfNotice.message}
            </div>
          )}
        </div>

        {/* Loading / Error states */}
        {loading && (
          <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-6 mb-6">
            <div className="animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-72 bg-slate-100 rounded" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-5 mb-6">
            <h2 className="text-base font-semibold text-red-800 mb-1">Preview unavailable</h2>
            <p className="text-sm text-red-700">{error}</p>
            <p className="text-xs text-red-700/80 mt-2 font-mono">
              Enable with ENABLE_DYNAMIC_CONSENT_ENGINE=true or use ?engine=dynamic-preview.
            </p>
          </div>
        )}

        {/* Audit panel */}
        {showAuditPanel && preview && (
          <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
              Audit &amp; Evidence Metadata
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <AuditField label="Template ID" value={preview.templateId} mono />
              <AuditField label="Template Version" value={preview.templateVersion} mono />
              <AuditField label="Audit Hash" value={preview.audit?.hash} mono breakAll />
              <AuditField
                label="Payload Fingerprint"
                value={preview.audit?.payloadFingerprint}
                mono
                breakAll
              />
              <AuditField label="Generated At" value={preview.audit?.generatedAt} mono />
              <AuditField label="Demo Preset" value={preview.demo ?? "(none)"} />
              <AuditField label="Patient" value={preview.metadata?.patientName} />
              <AuditField label="MRN" value={preview.metadata?.patientMrn} mono />
              <AuditField label="Case" value={preview.metadata?.caseNumber} mono />
              <AuditField label="Encounter" value={preview.metadata?.encounterNo} mono />
              <AuditField label="Specialty" value={preview.metadata?.specialty} />
              <AuditField label="Language" value={preview.metadata?.language} />
            </div>
            {preview.warnings && preview.warnings.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
                  Validation Warnings
                </h3>
                <ul className="space-y-1 text-sm text-amber-800 list-disc list-inside">
                  {preview.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Evidence Package panel */}
        {evidenceEnabled && preview?.evidence && (
          <div className="rounded-xl bg-white shadow-sm border border-emerald-200 p-5 mb-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                  Legal Evidence Package (Preview)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Internal-only proof-of-concept. Not connected to production informed-consent
                  workflow. No PDFs persisted; no database writes.
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-700">
                {preview.contentType ?? "text/html-preview"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <AuditField label="Evidence ID" value={preview.evidence.evidenceId} mono />
              <AuditField
                label="Generated By"
                value={preview.evidence.generatedBy}
                mono
              />
              <AuditField
                label="Template Hash"
                value={preview.evidence.templateHash}
                mono
                breakAll
              />
              <AuditField
                label="Payload Hash"
                value={preview.evidence.payloadHash}
                mono
                breakAll
              />
              <AuditField
                label="Audit Hash"
                value={preview.evidence.auditHash}
                mono
                breakAll
              />
              <AuditField
                label="Generated At"
                value={preview.evidence.generatedAt}
                mono
              />
              <AuditField
                label="Suggested Filename"
                value={preview.suggestedFilename ?? undefined}
                mono
                breakAll
              />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Verification URL (placeholder)
                </div>
                <div className="text-xs font-mono mt-0.5 break-all">
                  <a
                    href={preview.evidence.verificationUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="text-emerald-700 hover:underline"
                  >
                    {preview.evidence.verificationUrl}
                  </a>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Verification portal is not yet live; URL is reserved for the
                  /verify/&lt;evidenceId&gt; surface.
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  QR Placeholder
                </div>
                <pre className="text-xs font-mono mt-0.5 bg-slate-50 border border-slate-200 rounded p-2 whitespace-pre-wrap break-all">
{preview.evidence.qrPlaceholder.payload}
                </pre>
                <div className="text-[10px] text-slate-500 mt-1">
                  isReal = {String(preview.evidence.qrPlaceholder.isReal)} — real QR encoding
                  to be wired in a follow-up.
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Legal Footer
                </div>
                <div className="text-xs mt-0.5 text-slate-800">
                  {preview.evidence.legalFooter}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HTML Preview (sandboxed iframe) */}
        {preview?.html && (
          <div className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Rendered Preview
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {preview.titleEn}
                  {preview.titleAr ? ` · ${preview.titleAr}` : ""}
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                {preview.templateId} · v{preview.templateVersion}
              </span>
            </div>
            <iframe
              ref={previewFrameRef}
              title="Dynamic Consent Preview"
              sandbox="allow-same-origin allow-modals"
              className="w-full border-0 h-[calc(100vh-280px)] min-h-[720px]"
            />
          </div>
        )}

        {/* Safety Notice */}
        <div className="mt-6 rounded-xl bg-sky-50 border border-sky-200 p-4 text-sm text-sky-900">
          <h3 className="font-semibold mb-1">Internal preview · safety notice</h3>
          <ul className="space-y-0.5 text-sky-800">
            <li>· No consent documents are created.</li>
            <li>· No patient records are modified.</li>
            <li>· No PDFs are generated, persisted, or stored.</li>
            <li>· No database writes occur from this route.</li>
            <li>· Feature-gated; not exposed in production navigation.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function AuditField({
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
