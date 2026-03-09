"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import AuditTimeline from "@/ui/components/AuditTimeline";
import PDFActionBar from "@/ui/components/PDFActionBar";
import SignatureMethodSelector from "@/ui/components/SignatureMethodSelector";
import StatusBadge from "@/ui/components/StatusBadge";
import SecondaryActionButton from "@/ui/components/SecondaryActionButton";
import { apiFetch } from "@/utils/api";

type ConsentTab = "preview" | "signature" | "pdf" | "archive" | "audit";

const tabs: Array<{ key: ConsentTab; label: string }> = [
  { key: "preview", label: "Form Preview" },
  { key: "signature", label: "Signature" },
  { key: "pdf", label: "PDF" },
  { key: "archive", label: "Archive" },
  { key: "audit", label: "Audit" },
];

const signatureSteps = [
  "1 Review Form",
  "2 Select Signature Method",
  "3 Verify Signature",
  "4 Generate PDF",
  "5 Archive",
];

export default function ConsentDetailPage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<ConsentTab>("preview");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [documentData, setDocumentData] = useState<{
    id: string;
    titleEn: string;
    status: string;
    documentCode: string;
    fileName: string;
    previewHtml: string | null;
    metadata?: Record<string, unknown> | null;
    caseId?: string | null;
  } | null>(null);

  async function loadDocument() {
    setError("");
    try {
      const response = await apiFetch<{
        id: string;
        titleEn: string;
        status: string;
        documentCode: string;
        fileName: string;
        previewHtml: string | null;
        metadata?: Record<string, unknown> | null;
        caseId?: string | null;
      }>(`/api/documents/${params.id}`);
      setDocumentData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load consent document");
    }
  }

  useEffect(() => {
    void loadDocument();
  }, [params.id]);

  async function archiveRecord() {
    setError("");
    setMessage("");
    try {
      await apiFetch("/api/platform/v1/archive", {
        method: "POST",
        body: JSON.stringify({ documentId: params.id }),
      });
      setMessage("Consent document archived successfully.");
      await loadDocument();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive document");
    }
  }

  async function verifyArchive() {
    setError("");
    setMessage("");
    try {
      await apiFetch("/api/platform/v1/archive/verify", {
        method: "POST",
        body: JSON.stringify({ documentId: params.id }),
      });
      setMessage("Archive retrieval verified successfully.");
      await loadDocument();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify archive record");
    }
  }

  function previewDocument() {
    if (!documentData?.previewHtml) {
      setError("No preview content available for this document.");
      return;
    }

    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      setError("Popup blocked. Please allow popups to preview the document.");
      return;
    }

    popup.document.open();
    popup.document.write(documentData.previewHtml);
    popup.document.close();
  }

  function downloadDocument() {
    if (!documentData?.previewHtml) {
      setError("No downloadable content available for this document.");
      return;
    }

    const blob = new Blob([documentData.previewHtml], { type: "text/html" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = (documentData.fileName || `consent_${params.id}`).replace(/\.pdf$/i, ".html");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function shareDocument() {
    setError("");
    const shareText = `Consent ${documentData?.documentCode ?? params.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Consent Document", text: shareText });
        setMessage("Document share sent.");
        return;
      } catch {
        // Fallback to clipboard below.
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setMessage("Document reference copied to clipboard.");
    } catch {
      setError("Unable to share or copy document reference.");
    }
  }

  return (
    <AuthGuard>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <section className="space-y-4">
          <header>
            <p className="ui-kicker">Consent Detail</p>
            <h1 className="ui-title">Consent {params.id}</h1>
          </header>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
          {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div> : null}

          <div className="ui-panel p-2">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    tab.key === activeTab
                      ? "rounded-lg bg-[var(--ui-primary)] px-3 py-2 text-sm font-semibold text-white"
                      : "rounded-lg px-3 py-2 text-sm font-medium text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)]"
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "preview" ? (
            <section className="ui-panel p-4">
              <h3 className="text-base font-semibold text-[var(--ui-text)]">Form Preview</h3>
              <p className="mt-2 text-sm text-[var(--ui-muted)]">{documentData?.titleEn || "Loading consent form data..."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <SecondaryActionButton type="button" onClick={loadDocument}>Refresh</SecondaryActionButton>
                <SecondaryActionButton type="button" onClick={previewDocument}>Open Preview</SecondaryActionButton>
              </div>
            </section>
          ) : null}

          {activeTab === "signature" ? (
            <section className="space-y-4">
              <article className="ui-panel p-4">
                <h3 className="text-base font-semibold text-[var(--ui-text)]">Signature Flow</h3>
                <ol className="mt-3 grid gap-2 md:grid-cols-5">
                  {signatureSteps.map((step, index) => (
                    <li key={step} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3 text-sm">
                      <p className="font-semibold text-[var(--ui-text)]">{step}</p>
                      <p className="mt-1 text-xs text-[var(--ui-muted)]">{index === 1 ? "Current" : "Ready"}</p>
                    </li>
                  ))}
                </ol>
              </article>
              <SignatureMethodSelector />
            </section>
          ) : null}

          {activeTab === "pdf" ? (
            <section className="space-y-3">
              <PDFActionBar onPreview={previewDocument} onDownload={downloadDocument} onShare={shareDocument} />
              <div className="ui-panel p-4 text-sm text-[var(--ui-muted)]">
                Finalization actions are enabled. Use archive actions to complete the legal evidence chain.
              </div>
            </section>
          ) : null}

          {activeTab === "archive" ? (
            <section className="ui-panel p-4">
              <h3 className="text-base font-semibold text-[var(--ui-text)]">Archive</h3>
              <p className="mt-2 text-sm text-[var(--ui-muted)]">Archive actions are linked with platform archive endpoints.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <SecondaryActionButton type="button" onClick={archiveRecord}>Archive Record</SecondaryActionButton>
                <SecondaryActionButton type="button" onClick={verifyArchive}>Verify Retrieval</SecondaryActionButton>
              </div>
            </section>
          ) : null}

          {activeTab === "audit" ? (
            <AuditTimeline
              items={[
                { label: "Created", timestamp: "2026-03-08 09:12" },
                { label: "Sent for Signature", timestamp: "2026-03-08 09:20" },
                { label: "Signature Verified", timestamp: "2026-03-08 09:33" },
                { label: "PDF Generated", timestamp: "2026-03-08 09:38" },
                { label: "Archived", timestamp: "2026-03-08 10:02" },
              ]}
            />
          ) : null}
        </section>

        <aside className="ui-panel h-fit p-4">
          <h3 className="text-base font-semibold text-[var(--ui-text)]">Side Summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between"><dt>Signer</dt><dd>Fatimah Al-Harbi</dd></div>
            <div className="flex items-center justify-between"><dt>Method</dt><dd>SMS OTP</dd></div>
            <div className="flex items-center justify-between"><dt>Status</dt><dd><StatusBadge status={documentData?.status || "Pending"} /></dd></div>
            <div className="flex items-center justify-between"><dt>Linked Case</dt><dd>{documentData?.caseId || "N/A"}</dd></div>
            <div className="flex items-center justify-between"><dt>Linked Patient</dt><dd>MRN-1048</dd></div>
          </dl>
        </aside>
      </div>
    </AuthGuard>
  );
}
