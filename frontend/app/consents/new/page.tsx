"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import ConsentIntelligencePanel from "@/components/governance/ConsentIntelligencePanel";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import SignatureMethodSelector from "@/components/governance/SignatureMethodSelector";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

export default function NewConsentPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [consentTypeId, setConsentTypeId] = useState("");
  const [linkedProcedureId, setLinkedProcedureId] = useState("");
  const [practitioner, setPractitioner] = useState("");
  const [signerType, setSignerType] = useState("PATIENT");
  const [signatureMethod, setSignatureMethod] = useState("SMS_OTP");
  const [language, setLanguage] = useState("bilingual");
  const [expiresAt, setExpiresAt] = useState("");
  const [recommendations, setRecommendations] = useState({
    requiredConsents: [] as string[],
    recommendedConsents: [] as string[],
    missingConsents: [] as string[],
    expiredConsents: [] as string[],
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const patientIdParam = new URLSearchParams(window.location.search).get("patientId") ?? "";
    setPatientId(patientIdParam);
  }, []);

  async function previewIntelligence() {
    const output = await apiFetch<typeof recommendations>("/api/v1/intelligence/consents", {
      method: "POST",
      body: JSON.stringify({
        procedureCode: linkedProcedureId,
        highRisk: Boolean(linkedProcedureId),
        serviceModel: "general",
      }),
    });
    setRecommendations(output);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const created = await apiFetch<{ id: string }>("/api/v1/consents", {
      method: "POST",
      body: JSON.stringify({
        patientId,
        caseId: caseId || null,
        consentTypeId: consentTypeId || null,
        linkedProcedureId: linkedProcedureId || null,
        signerType,
        signerName: practitioner,
        signatureMethod,
        language,
        expiresAt: expiresAt || null,
        intelligenceInput: {
          highRisk: Boolean(linkedProcedureId),
          serviceModel: "general",
        },
      }),
    });

    router.push(`/consents/${created.id}`);
  }

  return (
    <AuthGuard>
      <AppShell title="New Consent" subtitle="Create consent draft and prepare signature flow">
        {!enabled ? <GovernanceDisabledNotice /> : null}
        {enabled ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} required />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Case ID (optional)" value={caseId} onChange={(e) => setCaseId(e.target.value)} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Consent Type" value={consentTypeId} onChange={(e) => setConsentTypeId(e.target.value)} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Linked Procedure" value={linkedProcedureId} onChange={(e) => setLinkedProcedureId(e.target.value)} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Responsible Practitioner" value={practitioner} onChange={(e) => setPractitioner(e.target.value)} />
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={signerType} onChange={(e) => setSignerType(e.target.value)}>
                <option value="PATIENT">Patient</option>
                <option value="GUARDIAN">Guardian</option>
                <option value="SURROGATE">Surrogate</option>
              </select>
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="bilingual">Bilingual</option>
                <option value="ar">Arabic</option>
                <option value="en">English</option>
              </select>
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>

            <SignatureMethodSelector value={signatureMethod} onChange={setSignatureMethod} />
            <ConsentIntelligencePanel {...recommendations} />

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void previewIntelligence()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Preview</button>
              <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">Generate Draft</button>
              <button type="button" onClick={() => router.push("/consents")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
            </div>
          </form>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
