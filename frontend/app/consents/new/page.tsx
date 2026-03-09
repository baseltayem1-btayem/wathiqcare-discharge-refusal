"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import PrimaryActionButton from "@/ui/components/PrimaryActionButton";
import SecondaryActionButton from "@/ui/components/SecondaryActionButton";
import { apiFetch } from "@/utils/api";

type SignatureMethod = "SMS_OTP" | "TABLET_SIGNATURE" | "NAFATH";

type StartSessionResponse = {
  ok: boolean;
  session: {
    sessionId: string;
    method: SignatureMethod;
    expiresAt: string;
    challengeHint: string;
  };
};

type VerifySessionResponse = {
  ok: boolean;
  signatureRecord: string;
  verifiedAt: string;
};

type CreateConsentResponse = {
  ok: boolean;
  module: string;
  document: {
    id: string;
    documentCode: string;
    fileName: string;
    status: string;
  };
};

function NewConsentPageContent() {
  const router = useRouter();
  const query = useSearchParams();

  const initialCaseId = query.get("caseId") ?? "";
  const initialIntent = query.get("intent") ?? "";

  const [caseId, setCaseId] = useState(initialCaseId);
  const [patientName, setPatientName] = useState("");
  const [patientMrn, setPatientMrn] = useState("");
  const [consentPurpose, setConsentPurpose] = useState("Informed consent for treatment");

  const [signatureMethod, setSignatureMethod] = useState<SignatureMethod>(
    initialIntent === "signature" ? "SMS_OTP" : "TABLET_SIGNATURE"
  );
  const [recipient, setRecipient] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [challengeHint, setChallengeHint] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verified, setVerified] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canStartSession = useMemo(() => {
    if (signatureMethod === "SMS_OTP") {
      return recipient.trim().length > 0;
    }
    return true;
  }, [recipient, signatureMethod]);

  async function startSession() {
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const response = await apiFetch<StartSessionResponse>("/api/platform/v1/signature/session/start", {
        method: "POST",
        body: JSON.stringify({
          method: signatureMethod,
          recipient: recipient.trim() || undefined,
        }),
      });

      setSessionId(response.session.sessionId);
      setChallengeHint(response.session.challengeHint);
      setVerified(false);
      setMessage(`Signature session started (${response.session.method}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start signature session");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifySession() {
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      await apiFetch<VerifySessionResponse>("/api/platform/v1/signature/session/verify", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          verificationCode,
          method: signatureMethod,
        }),
      });

      setVerified(true);
      setMessage("Signature verified successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify signature session");
      setVerified(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function createConsentDocument() {
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const response = await apiFetch<CreateConsentResponse>("/api/platform/v1/consents", {
        method: "POST",
        body: JSON.stringify({
          caseId: caseId.trim() || undefined,
          payload: {
            patient_name: patientName.trim(),
            patient_mrn: patientMrn.trim(),
            consent_purpose: consentPurpose.trim(),
            workflow_source: "informed_consent",
          },
          signatureMethod,
          signatureSessionId: sessionId,
        }),
      });

      setMessage(`Consent document created successfully: ${response.document.documentCode}`);
      router.push(`/consents/${response.document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create informed consent document");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-4">
        <header>
          <p className="ui-kicker">Production Consent Flow</p>
          <h1 className="ui-title">Create Informed Consent</h1>
          <p className="ui-subtitle">Operational flow: complete form, start signature session, verify signer, and generate final consent document.</p>
        </header>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div> : null}

        <section className="ui-panel p-4">
          <h2 className="text-base font-semibold text-[var(--ui-text)]">1) Consent Data</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Case ID</span>
              <input value={caseId} onChange={(event) => setCaseId(event.target.value)} className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Patient Name</span>
              <input value={patientName} onChange={(event) => setPatientName(event.target.value)} className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Patient MRN</span>
              <input value={patientMrn} onChange={(event) => setPatientMrn(event.target.value)} className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Consent Purpose</span>
              <input value={consentPurpose} onChange={(event) => setConsentPurpose(event.target.value)} className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" />
            </label>
          </div>
        </section>

        <section className="ui-panel p-4">
          <h2 className="text-base font-semibold text-[var(--ui-text)]">2) Signature Method</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <button type="button" onClick={() => setSignatureMethod("SMS_OTP")} className={signatureMethod === "SMS_OTP" ? "rounded-xl border border-[var(--ui-primary)] bg-[var(--ui-primary-soft)] p-3 text-sm font-semibold" : "rounded-xl border border-[var(--ui-border)] p-3 text-sm"}>SMS OTP</button>
            <button type="button" onClick={() => setSignatureMethod("NAFATH")} className={signatureMethod === "NAFATH" ? "rounded-xl border border-[var(--ui-primary)] bg-[var(--ui-primary-soft)] p-3 text-sm font-semibold" : "rounded-xl border border-[var(--ui-border)] p-3 text-sm"}>Nafath</button>
            <button type="button" onClick={() => setSignatureMethod("TABLET_SIGNATURE")} className={signatureMethod === "TABLET_SIGNATURE" ? "rounded-xl border border-[var(--ui-primary)] bg-[var(--ui-primary-soft)] p-3 text-sm font-semibold" : "rounded-xl border border-[var(--ui-border)] p-3 text-sm"}>Tablet Signature</button>
          </div>

          {signatureMethod === "SMS_OTP" ? (
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-medium">Recipient Mobile</span>
              <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="+9665XXXXXXXX" className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" />
            </label>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <PrimaryActionButton type="button" onClick={startSession} disabled={!canStartSession || submitting}>Start Signature Session</PrimaryActionButton>
            <SecondaryActionButton type="button" onClick={() => setSessionId("")} disabled={submitting}>Reset Session</SecondaryActionButton>
          </div>

          {sessionId ? (
            <div className="mt-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3 text-sm">
              <p><strong>Session ID:</strong> {sessionId}</p>
              <p><strong>Challenge Hint:</strong> {challengeHint}</p>
            </div>
          ) : null}
        </section>

        <section className="ui-panel p-4">
          <h2 className="text-base font-semibold text-[var(--ui-text)]">3) Verify & Generate Final Document</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
              placeholder="Enter OTP / verification code"
              className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm"
            />
            <SecondaryActionButton type="button" onClick={verifySession} disabled={!sessionId || !verificationCode || submitting}>Verify Signature</SecondaryActionButton>
            <PrimaryActionButton type="button" onClick={createConsentDocument} disabled={!verified || submitting}>Generate Informed Consent</PrimaryActionButton>
          </div>
          <p className="mt-2 text-xs text-[var(--ui-muted)]">Generation is blocked until signature verification is completed.</p>
        </section>
      </div>
    </AuthGuard>
  );
}

export default function NewConsentPage() {
  return (
    <Suspense fallback={<AuthGuard><div className="ui-panel p-4 text-sm text-[var(--ui-muted)]">Loading consent workflow...</div></AuthGuard>}>
      <NewConsentPageContent />
    </Suspense>
  );
}
