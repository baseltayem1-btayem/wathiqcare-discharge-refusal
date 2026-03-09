"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

type PatientRow = {
  id: string;
  mrn?: string | null;
  fullName: string;
  nationalId?: string | null;
  mobileNumber?: string | null;
  legalGuardianName?: string | null;
};

export default function PatientsPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [newName, setNewName] = useState("");
  const [newMrn, setNewMrn] = useState("");

  async function load() {
    if (!enabled) return;
    const data = await apiFetch<PatientRow[]>("/api/v1/patients");
    setRows(data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPatient(event: FormEvent) {
    event.preventDefault();
    await apiFetch("/api/v1/patients", {
      method: "POST",
      body: JSON.stringify({ fullName: newName, mrn: newMrn }),
    });
    setNewName("");
    setNewMrn("");
    await load();
  }

  return (
    <AuthGuard>
      <AppShell title="Patients" subtitle="Patient identity layer for consent and ROI workflows">
        {!enabled ? <GovernanceDisabledNotice /> : null}

        {enabled ? (
          <>
            <form onSubmit={createPatient} className="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="MRN" value={newMrn} onChange={(e) => setNewMrn(e.target.value)} />
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" type="submit">New Patient</button>
            </form>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">MRN</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">National ID</th>
                    <th className="px-3 py-2 text-left">Mobile</th>
                    <th className="px-3 py-2 text-left">Guardian</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">{row.mrn ?? "-"}</td>
                      <td className="px-3 py-2">{row.fullName}</td>
                      <td className="px-3 py-2">{row.nationalId ?? "-"}</td>
                      <td className="px-3 py-2">{row.mobileNumber ?? "-"}</td>
                      <td className="px-3 py-2">{row.legalGuardianName ?? "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/patients/${row.id}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1">View</Link>
                          <Link href={`/consents/new?patientId=${row.id}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1">Create Consent</Link>
                          <Link href={`/release-of-information/new?patientId=${row.id}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1">Create ROI Request</Link>
                          <Link href={`/archive?patientId=${row.id}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1">View Documents</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
