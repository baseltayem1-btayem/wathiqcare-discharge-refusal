"use client";

import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import SmartDataGrid from "@/ui/components/SmartDataGrid";

type PatientRow = {
  mrn: string;
  name: string;
  nationalId: string;
  mobile: string;
  guardian: string;
  activeCases: number;
  pendingConsents: number;
  lastActivity: string;
};

const patientRows: PatientRow[] = [
  {
    mrn: "MRN-1048",
    name: "Fatimah Al-Harbi",
    nationalId: "1029384756",
    mobile: "+966500001111",
    guardian: "Hamad Al-Harbi",
    activeCases: 2,
    pendingConsents: 1,
    lastActivity: "Today 10:21",
  },
  {
    mrn: "MRN-1052",
    name: "Abdulrahman Al-Qahtani",
    nationalId: "2048573910",
    mobile: "+966500002222",
    guardian: "Self",
    activeCases: 1,
    pendingConsents: 2,
    lastActivity: "Today 09:02",
  },
  {
    mrn: "MRN-1060",
    name: "Nora Al-Otaibi",
    nationalId: "3094758601",
    mobile: "+966500003333",
    guardian: "Salem Al-Otaibi",
    activeCases: 3,
    pendingConsents: 0,
    lastActivity: "Yesterday 17:40",
  },
];

export default function PatientsPage() {
  return (
    <AuthGuard>
      <div className="space-y-4">
        <header>
          <p className="ui-kicker">Patients Registry</p>
          <h1 className="ui-title">Patients</h1>
          <p className="ui-subtitle">Medico-legal patient index with consent, agreement, ROI, and activity context.</p>
        </header>

        <SmartDataGrid
          title="Patients List"
          rows={patientRows}
          columns={[
            { key: "mrn", label: "MRN", sortable: true },
            { key: "name", label: "Name", sortable: true },
            { key: "nationalId", label: "National ID", sortable: true },
            { key: "mobile", label: "Mobile", sortable: true },
            { key: "guardian", label: "Guardian", sortable: true },
            { key: "activeCases", label: "Active Cases", sortable: true },
            { key: "pendingConsents", label: "Pending Consents", sortable: true },
            { key: "lastActivity", label: "Last Activity", sortable: true },
          ]}
        />

        <section className="ui-panel p-4">
          <h2 className="text-sm font-semibold text-[var(--ui-text)]">Quick Actions</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {patientRows.map((row) => (
              <div key={row.mrn} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-2">
                <p className="font-semibold">{row.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link href={`/patients/${row.mrn}`} className="rounded-lg bg-[var(--ui-primary)] px-2 py-1 text-white">View</Link>
                  <Link href="/consents/new" className="rounded-lg border border-[var(--ui-border)] px-2 py-1">New Consent</Link>
                  <Link href="/agreements/new" className="rounded-lg border border-[var(--ui-border)] px-2 py-1">New Agreement</Link>
                  <Link href="/release-of-information/new" className="rounded-lg border border-[var(--ui-border)] px-2 py-1">ROI Request</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
