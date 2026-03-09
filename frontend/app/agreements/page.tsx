"use client";

import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import SmartDataGrid from "@/ui/components/SmartDataGrid";

const agreementRows = [
  { agreementId: "AG-4401", patient: "Fatimah Al-Harbi", caseId: "C-1048", type: "Home Healthcare", status: "Pending" },
  { agreementId: "AG-4390", patient: "Abdulrahman Al-Qahtani", caseId: "C-1044", type: "Financial Responsibility", status: "Verified" },
  { agreementId: "AG-4382", patient: "Nora Al-Otaibi", caseId: "C-1039", type: "Care Plan", status: "Archived" },
];

export default function AgreementsPage() {
  return (
    <AuthGuard>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="ui-kicker">Agreement Workspace</p>
            <h1 className="ui-title">Agreements</h1>
            <p className="ui-subtitle">Agreement lifecycle aligned with signature verification and archive traceability.</p>
          </div>
          <Link href="/agreements/new" className="rounded-xl bg-[var(--ui-primary)] px-3 py-2 text-sm font-semibold text-white">New Agreement</Link>
        </header>

        <SmartDataGrid
          title="Agreements Registry"
          rows={agreementRows}
          columns={[
            { key: "agreementId", label: "Agreement", sortable: true },
            { key: "patient", label: "Patient", sortable: true },
            { key: "caseId", label: "Case", sortable: true },
            { key: "type", label: "Type", sortable: true },
            { key: "status", label: "Status", sortable: true, kind: "status" },
          ]}
        />

        <section className="ui-panel p-4">
          <h2 className="text-sm font-semibold text-[var(--ui-text)]">Open Agreement Records</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {agreementRows.map((row) => (
              <Link key={row.agreementId} href={`/agreements/${row.agreementId}`} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-2">
                View {row.agreementId}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
