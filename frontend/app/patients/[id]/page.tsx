"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import AuditTimeline from "@/ui/components/AuditTimeline";
import DetailPanel from "@/ui/components/DetailPanel";
import SecondaryActionButton from "@/ui/components/SecondaryActionButton";

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  return (
    <AuthGuard>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="ui-kicker">Patient Profile</p>
            <h1 className="ui-title">Patient {patientId}</h1>
            <p className="ui-subtitle">Identity, guardian capacity, consents, documents, ROI requests, and audit coverage.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/consents/new" className="rounded-xl bg-[var(--ui-primary)] px-3 py-2 text-sm font-semibold text-white">New Consent</Link>
            <Link href="/agreements/new" className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm font-semibold">New Agreement</Link>
            <Link href="/release-of-information/new" className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm font-semibold">Release Request</Link>
            <Link href="/archive" className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm font-semibold">View Archive</Link>
            <SecondaryActionButton type="button">View Audit</SecondaryActionButton>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <section className="space-y-4">
            <DetailPanel
              title="Patient Identity"
              rows={[
                { label: "MRN", value: patientId },
                { label: "Name", value: "Fatimah Al-Harbi" },
                { label: "National ID", value: "1029384756" },
                { label: "Mobile", value: "+966500001111" },
              ]}
            />

            <DetailPanel
              title="Guardian / Capacity"
              rows={[
                { label: "Guardian", value: "Hamad Al-Harbi" },
                { label: "Capacity", value: "Supported Decision" },
                { label: "Relationship", value: "Father" },
              ]}
            />

            <section className="ui-panel p-4">
              <h3 className="text-base font-semibold text-[var(--ui-text)]">Active Consents</h3>
              <ul className="mt-3 space-y-2">
                <li className="rounded-xl border border-[var(--ui-border)] p-3 text-sm">Treatment Consent - Pending Signature</li>
                <li className="rounded-xl border border-[var(--ui-border)] p-3 text-sm">Data Privacy Consent - Verified</li>
              </ul>
            </section>

            <section className="ui-panel p-4">
              <h3 className="text-base font-semibold text-[var(--ui-text)]">Documents</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="rounded-xl border border-[var(--ui-border)] p-3">Discharge Refusal Form.pdf</li>
                <li className="rounded-xl border border-[var(--ui-border)] p-3">Consent Packet.pdf</li>
              </ul>
            </section>
          </section>

          <section className="space-y-4">
            <section className="ui-panel p-4">
              <h3 className="text-base font-semibold text-[var(--ui-text)]">ROI Requests</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="rounded-xl border border-[var(--ui-border)] p-3">ROI-8842 - Pending Review</li>
                <li className="rounded-xl border border-[var(--ui-border)] p-3">ROI-8731 - Archived</li>
              </ul>
            </section>

            <AuditTimeline
              items={[
                { label: "Created", timestamp: "2026-03-08 09:12" },
                { label: "Sent for Signature", timestamp: "2026-03-08 09:20" },
                { label: "Signature Verified", timestamp: "2026-03-08 09:33" },
                { label: "PDF Generated", timestamp: "2026-03-08 09:38" },
                { label: "Archived", timestamp: "2026-03-08 10:02" },
              ]}
            />
          </section>
        </div>
      </div>
    </AuthGuard>
  );
}
