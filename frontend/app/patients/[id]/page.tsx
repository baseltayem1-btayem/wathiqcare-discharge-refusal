"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import PatientProfileCard from "@/components/governance/PatientProfileCard";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

export default function PatientDetailsPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const params = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!enabled || !params.id) return;
    void apiFetch<Record<string, unknown>>(`/api/v1/patients/${params.id}`).then(setPatient);
  }, [enabled, params.id]);

  return (
    <AuthGuard>
      <AppShell title="Patient Profile" subtitle="Demographics, consent and records overview">
        {!enabled ? <GovernanceDisabledNotice /> : null}
        {enabled ? (
          <div className="space-y-4">
            <PatientProfileCard patient={patient} />

            <section className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">Active Consents</h3>
                <p className="mt-2 text-sm text-slate-600">Open case-linked consents and agreements are managed from the consents module.</p>
                <Link href={`/cases/new?patientId=${params.id}`} className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm">New Agreement</Link>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">Archived Documents</h3>
                <p className="mt-2 text-sm text-slate-600">Indexed records and legal documents.</p>
                <Link href={`/archive?patientId=${params.id}`} className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Open Archive</Link>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">ROI Requests</h3>
                <p className="mt-2 text-sm text-slate-600">Controlled release requests and approvals.</p>
                <Link href={`/release-of-information/new?patientId=${params.id}`} className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Request Release</Link>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">Audit Summary</h3>
                <p className="mt-2 text-sm text-slate-600">Traceability is logged through the existing audit logger.</p>
                <Link href={`/consents?patientId=${params.id}`} className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm">View Audit</Link>
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              <Link href={`/consents/new?patientId=${params.id}`} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">New Consent</Link>
              <Link href={`/cases/new?patientId=${params.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">New Agreement</Link>
              <Link href={`/release-of-information/new?patientId=${params.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Request Release</Link>
              <Link href={`/archive?patientId=${params.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Open Archive</Link>
            </div>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
