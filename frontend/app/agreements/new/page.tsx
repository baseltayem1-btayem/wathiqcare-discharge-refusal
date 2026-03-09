"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import PrimaryActionButton from "@/ui/components/PrimaryActionButton";
import SecondaryActionButton from "@/ui/components/SecondaryActionButton";
import { apiFetch } from "@/utils/api";

type Method = "SMS_OTP" | "TABLET_SIGNATURE" | "NAFATH";

export default function NewAgreementPage() {
  const router = useRouter();
  const [caseId, setCaseId] = useState("");
  const [agreementType, setAgreementType] = useState("home_care");
  const [method, setMethod] = useState<Method>("TABLET_SIGNATURE");
  const [recipient, setRecipient] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function startSession() {
    setError("");
    try {
      const response = await apiFetch<{ session: { sessionId: string } }>("/api/platform/v1/signature/session/start", {
        method: "POST",
        body: JSON.stringify({ method, recipient: recipient || undefined }),
      });
      setSessionId(response.session.sessionId);
      setMessage("Signature session started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    }
  }

  async function verifySession() {
    setError("");
    try {
      await apiFetch("/api/platform/v1/signature/session/verify", {
        method: "POST",
        body: JSON.stringify({ sessionId, verificationCode, method }),
      });
      setVerified(true);
      setMessage("Signature verified.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify session");
      setVerified(false);
    }
  }

  async function createAgreement() {
    setError("");
    try {
      const result = await apiFetch<{ document: { id: string } }>("/api/platform/v1/agreements", {
        method: "POST",
        body: JSON.stringify({
          caseId: caseId || undefined,
          payload: { agreement_type: agreementType },
          signatureMethod: method,
          signatureSessionId: sessionId,
        }),
      });
      setMessage("Agreement generated successfully.");
      router.push(`/agreements/${result.document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agreement");
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-4">
        <header>
          <p className="ui-kicker">Production Agreement Flow</p>
          <h1 className="ui-title">Create Agreement</h1>
        </header>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div> : null}

        <section className="ui-panel p-4 space-y-3">
          <input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="Case ID (optional)" className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" />
          <select value={agreementType} onChange={(e) => setAgreementType(e.target.value)} className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm">
            <option value="home_care">Home Care Agreement</option>
            <option value="medical_equipment">Medical Equipment Agreement</option>
          </select>
          <select value={method} onChange={(e) => setMethod(e.target.value as Method)} className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm">
            <option value="SMS_OTP">SMS OTP</option>
            <option value="NAFATH">Nafath</option>
            <option value="TABLET_SIGNATURE">Tablet Signature</option>
          </select>
          {method === "SMS_OTP" ? <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient phone" className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" /> : null}
          <div className="flex flex-wrap gap-2">
            <SecondaryActionButton type="button" onClick={startSession}>Start Session</SecondaryActionButton>
            <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="Verification code" className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm" />
            <SecondaryActionButton type="button" onClick={verifySession} disabled={!sessionId}>Verify</SecondaryActionButton>
            <PrimaryActionButton type="button" onClick={createAgreement} disabled={!verified}>Generate Agreement</PrimaryActionButton>
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
