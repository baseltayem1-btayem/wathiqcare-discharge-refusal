"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import PrimaryActionButton from "@/ui/components/PrimaryActionButton";
import { apiFetch } from "@/utils/api";

export default function NewPatientPage() {
  const router = useRouter();
  const [patientName, setPatientName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [mrn, setMrn] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function registerPatient() {
    setError("");
    setMessage("");

    try {
      const created = await apiFetch<{ id: string; caseNumber: string }>("/api/cases", {
        method: "POST",
        body: JSON.stringify({
          caseType: "GENERAL",
          title: `Patient Registration - ${patientName}`,
          patientName,
          patientIdNumber: nationalId,
          medicalRecordNo: mrn,
          roomNumber,
          workflowType: "patient_registration",
        }),
      });

      setMessage(`Patient registered successfully under case ${created.caseNumber}.`);
      router.push("/cases");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register patient");
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-4">
        <header>
          <p className="ui-kicker">Patient Intake</p>
          <h1 className="ui-title">Register New Patient</h1>
          <p className="ui-subtitle">Creates a registration case and enables immediate downstream consent and agreement workflows.</p>
        </header>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div> : null}

        <section className="ui-panel p-4 grid gap-3 md:grid-cols-2">
          <input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient full name" className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" />
          <input value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="National ID" className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" />
          <input value={mrn} onChange={(e) => setMrn(e.target.value)} placeholder="Medical record number (MRN)" className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" />
          <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="Room number" className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" />
        </section>

        <PrimaryActionButton type="button" onClick={registerPatient} disabled={!patientName || !nationalId || !mrn}>Register Patient</PrimaryActionButton>
      </div>
    </AuthGuard>
  );
}
