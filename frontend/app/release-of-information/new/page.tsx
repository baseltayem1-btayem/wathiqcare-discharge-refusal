"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import RoidRequestForm from "@/components/governance/RoidRequestForm";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

export default function NewRoiPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [draft, setDraft] = useState({
    requesterName: "",
    requesterRelationship: "",
    purpose: "",
    documentsRequested: "",
    dateRange: "",
    identityVerificationMethod: "sms_otp",
    authorizedRecipient: "",
    minimumNecessaryConfirmed: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const patientIdParam = new URLSearchParams(window.location.search).get("patientId") ?? "";
    setPatientId(patientIdParam);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();

    await apiFetch("/api/v1/roi", {
      method: "POST",
      body: JSON.stringify({
        patientId,
        requesterName: draft.requesterName,
        requesterRelationship: draft.requesterRelationship,
        purpose: draft.purpose,
        documentsRequested: [draft.documentsRequested],
        dateRange: { raw: draft.dateRange },
        authorizedRecipient: draft.authorizedRecipient,
        identityVerificationMethod: draft.identityVerificationMethod,
        minimumNecessaryConfirmed: draft.minimumNecessaryConfirmed,
      }),
    });

    router.push("/release-of-information");
  }

  return (
    <AuthGuard>
      <AppShell title="New ROI Request" subtitle="Request > verify identity > review > release > archive">
        {!enabled ? <GovernanceDisabledNotice /> : null}

        {enabled ? (
          <form onSubmit={submit} className="space-y-4">
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} required />
            <RoidRequestForm value={draft} onChange={setDraft} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Send OTP</button>
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Verify Identity</button>
              <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">Submit for Review</button>
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Approve</button>
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Release Documents</button>
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Archive</button>
            </div>
          </form>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
