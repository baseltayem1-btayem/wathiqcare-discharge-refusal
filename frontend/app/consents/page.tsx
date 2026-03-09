"use client";

import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import SmartDataGrid from "@/ui/components/SmartDataGrid";

const consentRows = [
  { consentId: "CN-8801", patient: "Fatimah Al-Harbi", caseId: "C-1048", signer: "Patient", method: "SMS OTP", status: "Pending" },
  { consentId: "CN-8792", patient: "Abdulrahman Al-Qahtani", caseId: "C-1044", signer: "Guardian", method: "Nafath", status: "Verified" },
  { consentId: "CN-8780", patient: "Nora Al-Otaibi", caseId: "C-1039", signer: "Patient", method: "Tablet", status: "Archived" },
];

export default function ConsentsPage() {
  return (
    <AuthGuard>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="ui-kicker">Consent Workspace</p>
            <h1 className="ui-title">Consents</h1>
            <p className="ui-subtitle">Consent operations with signer method, archive status, and linked case context.</p>
          </div>
          <Link href="/consents/new" className="rounded-xl bg-[var(--ui-primary)] px-3 py-2 text-sm font-semibold text-white">New Consent</Link>
        </header>

        <SmartDataGrid
          title="Consents Registry"
          rows={consentRows}
          columns={[
            { key: "consentId", label: "Consent", sortable: true },
            { key: "patient", label: "Patient", sortable: true },
            { key: "caseId", label: "Case", sortable: true },
            { key: "signer", label: "Signer", sortable: true },
            { key: "method", label: "Method", sortable: true },
            { key: "status", label: "Status", sortable: true, kind: "status" },
          ]}
        />

        <section className="ui-panel p-4">
          <h2 className="text-sm font-semibold text-[var(--ui-text)]">Open Consent Records</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {consentRows.map((row) => (
              <Link key={row.consentId} href={`/consents/${row.consentId}`} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-2">
                View {row.consentId}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
