"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import AuditTimeline from "@/ui/components/AuditTimeline";
import PDFActionBar from "@/ui/components/PDFActionBar";
import SignatureMethodSelector from "@/ui/components/SignatureMethodSelector";
import StatusBadge from "@/ui/components/StatusBadge";

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

  return (
    <AuthGuard>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <section className="space-y-4">
          <header>
            <p className="ui-kicker">Consent Detail</p>
            <h1 className="ui-title">Consent {params.id}</h1>
          </header>

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
              <p className="mt-2 text-sm text-[var(--ui-muted)]">Consent form preview area. Backend rendering remains unchanged and can be integrated here safely.</p>
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
              <PDFActionBar />
              <div className="ui-panel p-4 text-sm text-[var(--ui-muted)]">Generate Final PDF, Download, Send Copy, and Archive Record actions are available in this panel.</div>
            </section>
          ) : null}

          {activeTab === "archive" ? (
            <section className="ui-panel p-4">
              <h3 className="text-base font-semibold text-[var(--ui-text)]">Archive</h3>
              <p className="mt-2 text-sm text-[var(--ui-muted)]">Archive status, indexing metadata, and re-index actions can be surfaced here.</p>
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
            <div className="flex items-center justify-between"><dt>Status</dt><dd><StatusBadge status="Pending" /></dd></div>
            <div className="flex items-center justify-between"><dt>Linked Case</dt><dd>C-1048</dd></div>
            <div className="flex items-center justify-between"><dt>Linked Patient</dt><dd>MRN-1048</dd></div>
          </dl>
        </aside>
      </div>
    </AuthGuard>
  );
}
