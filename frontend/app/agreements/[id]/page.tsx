"use client";

import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import AuditTimeline from "@/ui/components/AuditTimeline";
import PDFActionBar from "@/ui/components/PDFActionBar";

export default function AgreementDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <AuthGuard>
      <div className="space-y-4">
        <header>
          <p className="ui-kicker">Agreement Detail</p>
          <h1 className="ui-title">Agreement {params.id}</h1>
          <p className="ui-subtitle">Agreement detail view with signature, PDF finalization, archive and audit states.</p>
        </header>

        <section className="ui-panel p-4">
          <h3 className="text-base font-semibold text-[var(--ui-text)]">Agreement Summary</h3>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <p className="rounded-xl border border-[var(--ui-border)] p-3">Type: Home Healthcare Agreement</p>
            <p className="rounded-xl border border-[var(--ui-border)] p-3">Linked Case: C-1048</p>
            <p className="rounded-xl border border-[var(--ui-border)] p-3">Linked Patient: MRN-1048</p>
            <p className="rounded-xl border border-[var(--ui-border)] p-3">Status: Pending Signature</p>
          </div>
        </section>

        <PDFActionBar />

        <AuditTimeline
          items={[
            { label: "Created", timestamp: "2026-03-08 09:12" },
            { label: "Sent for Signature", timestamp: "2026-03-08 09:20" },
            { label: "Signature Verified", timestamp: "2026-03-08 09:33" },
            { label: "PDF Generated", timestamp: "2026-03-08 09:38" },
            { label: "Archived", timestamp: "2026-03-08 10:02" },
          ]}
        />
      </div>
    </AuthGuard>
  );
}
