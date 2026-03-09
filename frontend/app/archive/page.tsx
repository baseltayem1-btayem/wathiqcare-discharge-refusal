"use client";

import AuthGuard from "@/components/AuthGuard";
import SecondaryActionButton from "@/ui/components/SecondaryActionButton";
import StatusBadge from "@/ui/components/StatusBadge";

const archiveRows = [
  { patient: "Fatimah Al-Harbi", caseId: "C-1048", formType: "Consent", date: "2026-03-08", status: "Archived" },
  { patient: "Abdulrahman Al-Qahtani", caseId: "C-1044", formType: "Agreement", date: "2026-03-08", status: "Indexed" },
  { patient: "Nora Al-Otaibi", caseId: "C-1039", formType: "ROI", date: "2026-03-07", status: "Failed" },
];

export default function ArchivePage() {
  return (
    <AuthGuard>
      <div className="space-y-4">
        <header>
          <p className="ui-kicker">Archive Operations</p>
          <h1 className="ui-title">Archive</h1>
          <p className="ui-subtitle">Filterable archive registry with verification, indexing, and metadata actions.</p>
        </header>

        <section className="ui-panel p-4">
          <h2 className="text-base font-semibold text-[var(--ui-text)]">Filters</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <input className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" placeholder="Patient" />
            <input className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" placeholder="Case" />
            <input className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" placeholder="Form Type" />
            <input className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" placeholder="Date Range" />
            <input className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" placeholder="Archive Status" />
          </div>
        </section>

        <section className="ui-panel overflow-x-auto p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--ui-muted)]">
                <th className="px-2 py-2">Patient</th>
                <th className="px-2 py-2">Case</th>
                <th className="px-2 py-2">Form Type</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Archive Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {archiveRows.map((row) => (
                <tr key={`${row.caseId}-${row.formType}`} className="border-t border-[var(--ui-border)]">
                  <td className="px-2 py-2">{row.patient}</td>
                  <td className="px-2 py-2">{row.caseId}</td>
                  <td className="px-2 py-2">{row.formType}</td>
                  <td className="px-2 py-2">{row.date}</td>
                  <td className="px-2 py-2"><StatusBadge status={row.status} /></td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <SecondaryActionButton type="button" className="px-2 py-1 text-xs">Open PDF</SecondaryActionButton>
                      <SecondaryActionButton type="button" className="px-2 py-1 text-xs">Verify Index</SecondaryActionButton>
                      <SecondaryActionButton type="button" className="px-2 py-1 text-xs">Re-index</SecondaryActionButton>
                      <SecondaryActionButton type="button" className="px-2 py-1 text-xs">View Metadata</SecondaryActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AuthGuard>
  );
}
