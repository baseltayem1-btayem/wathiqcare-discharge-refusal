"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import TabletSignaturePad from "@/components/modules/informed-consent-signing/TabletSignaturePad";
import { FEATURE_UI_REFRESH_V1_1 } from "@/lib/config/ui-refresh-flag";
import PatientLandingV11 from "@/components/modules/public-signing/PatientLandingV11";

type PublicSigningDocumentPayload = {
  documentId: string;
  consentReference: string;
  status: string;
  signerRole: string;
  patientName: string;
  physicianName: string;
  diagnosis: string;
  plannedProcedure: string;
  templateTitleAr: string;
  templateTitleEn: string;
  versionLabel: string;
  sections: Array<{
    id: string;
    sectionKey: string;
    sectionKind: string;
    titleAr: string;
    titleEn: string;
    contentAr: string;
    contentEn: string;
  }>;
  legalTextAr: string;
  legalTextEn: string;
  pdplTextAr: string;
  pdplTextEn: string;
  signatureCaptured: boolean;
  decision: {
    status: "UNDECIDED" | "CONSENT_ACCEPTED" | "CONSENT_REFUSED";
    consentPresentedAt: string | null;
    selectedAt: string | null;
    refusalFormPresentedAt: string | null;
    refusalAcknowledged: boolean;
    refusalAcknowledgedAt: string | null;
    refusalSignedAt: string | null;
    refusalSignatureCaptured: boolean;
    refusalSignatureId: string | null;
    refusalForm: {
      patientName: string;
      mrn: string | null;
      procedure: string;
      physicianName: string;
      statementAr: string;
      statementEn: string;
      acknowledgementAr: string;
      acknowledgementEn: string;
      formHash: string;
    } | null;
  };
  education: {
    required: boolean;
    packageId: string | null;
    packageKey: string | null;
    titleAr: string | null;
    titleEn: string | null;
    versionId: string | null;
    versionLabel: string | null;
    contentHash: string | null;
    summary: { ar: string; en: string } | null;
    risks: Array<{ ar: string; en: string }>;
    benefits: Array<{ ar: string; en: string }>;
    faq: Array<{ questionAr: string; answerAr: string; questionEn: string; answerEn: string }>;
    preProcedureInstructions: Array<{ ar: string; en: string }>;
    postProcedureInstructions: Array<{ ar: string; en: string }>;
    assets: Array<{
      id: string;
      assetKey: string;
      assetType: string;
      title: string;
      locale: string;
      sourceUri: string | null;
      thumbnailUri: string | null;
      sortOrder: number;
    }>;
    viewedAt: string | null;
    completed: boolean;
    patientAcknowledged: boolean;
    acknowledgement: boolean;
    score: number | null;
    language: string | null;
    durationSeconds: number | null;
    scrollCompletion: number | null;
    assetViews: string[];
    completedAt: string | null;
  };
};

type PublicSignatureResult = {
  documentId: string;
  status: string;
  signatureId: string;
  signerRole: string;
  signerName: string;
  signatureMethod: string;
  signedAt: string;
  evidence: {
    documentHash: string;
    otpHash: string;
    educationCompleted: boolean;
    patientAcknowledged: boolean;
    decisionStatus: string;
  };
};

type ApiErrorPayload = {
  message?: string;
  error?: string;
  detail?: string;
};

type PublicEducationEventResponse = {
  ok: boolean;
  education: PublicSigningDocumentPayload["education"];
};

type PublicDecisionEventResponse = {
  ok: boolean;
  decision: PublicSigningDocumentPayload["decision"];
};

type EducationSectionKey = "summary" | "risks" | "benefits" | "faq" | "instructions";

// Pre-OTP bootstrap payload returned by GET /api/public-signing/document/[token]
// when no public signing session cookie is present. Contains ONLY non-PHI
// metadata so the OTP form can render without a session. See
// LIVE_SESSION_RACE_CONDITION_REPORT.md and PRE_OTP_BOOTSTRAP_FLOW.md.
type PreOtpBootstrap = {
  documentId: string;
  moduleType: string;
  signerRole: string;
  facilityName: string;
  templateTitleAr: string;
  templateTitleEn: string;
  locale: "ar" | "en" | "bilingual";
  educationRequired: boolean;
  maskedMobile: string | null;
  otpRequiredAt: string;
};

type WorkflowFetchPayload =
  | { phase: "pre-otp"; bootstrap: PreOtpBootstrap }
  | PublicSigningDocumentPayload;

async function readJsonSafe<T>(response: Response): Promise<T | ApiErrorPayload | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T | ApiErrorPayload;
  } catch {
    return { message: text };
  }
}

function getErrorMessage(payload: ApiErrorPayload | null | undefined, fallback: string): string {
  return payload?.message || payload?.detail || payload?.error || fallback;
}

function SectionBlock({ titleAr, titleEn, contentAr, contentEn }: { titleAr: string; titleEn: string; contentAr: string; contentEn: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2" dir="rtl">
          <h2 className="text-lg font-semibold text-slate-900">{titleAr}</h2>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{contentAr}</p>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">{titleEn}</h2>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{contentEn}</p>
        </div>
      </div>
    </section>
  );
}

function EducationList({ items }: { items: Array<{ ar: string; en: string }> }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <ul className="space-y-2 text-sm leading-7 text-slate-700" dir="rtl">
        {items.map((item, index) => <li key={`ar-${index}`}>{item.ar}</li>)}
      </ul>
      <ul className="space-y-2 text-sm leading-7 text-slate-700">
        {items.map((item, index) => <li key={`en-${index}`}>{item.en}</li>)}
      </ul>
    </div>
  );
}

function getDurationSeconds(startedAt: number | null): number {
  if (!startedAt) return 0;
  return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
}

export default function PublicSigningWorkflow({ token }: { token: string }) {
  const [documentData, setDocumentData] = useState<PublicSigningDocumentPayload | null>(null);
  const [bootstrap, setBootstrap] = useState<PreOtpBootstrap | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [signatureResult, setSignatureResult] = useState<PublicSignatureResult | null>(null);
  const [educationSubmitting, setEducationSubmitting] = useState(false);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [acknowledgementChecked, setAcknowledgementChecked] = useState(false);
  const [refusalAcknowledgementChecked, setRefusalAcknowledgementChecked] = useState(false);
  const [sectionViewed, setSectionViewed] = useState<Record<EducationSectionKey, boolean>>({
    summary: false,
    risks: false,
    benefits: false,
    faq: false,
    instructions: false,
  });
  const [faqViewed, setFaqViewed] = useState<string[]>([]);
  const [assetViews, setAssetViews] = useState<string[]>([]);
  const [scrollCompletion, setScrollCompletion] = useState(0);
  // --- OTP verification state (v1.0.1) ---
  const [otpMobile, setOtpMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequestResult, setOtpRequestResult] = useState<{ maskedPhone: string; expiresAt: string; deliveryStatus: string; fallbackMode: boolean } | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState("");
  const educationStartedAtRef = useRef<number | null>(null);
  const presentedSentRef = useRef(false);
  const completedSentRef = useRef(false);
  const refusalPresentedSentRef = useRef(false);
  const sectionRefs = useRef<Partial<Record<EducationSectionKey, HTMLElement | null>>>({});

  const educationRequired = Boolean(documentData?.education.required);
  const educationAcknowledged = Boolean(documentData?.education.acknowledgement || documentData?.education.patientAcknowledged);
  const isRefusalPath = documentData?.decision.status === "CONSENT_REFUSED";
  const faqTargets = documentData?.education.faq || [];

  const allEducationRequirementsMet = useMemo(() => {
    if (!documentData?.education.required) return true;
    const faqComplete = faqTargets.length === 0 || faqViewed.length >= faqTargets.length || sectionViewed.faq;
    return sectionViewed.summary
      && sectionViewed.risks
      && sectionViewed.benefits
      && faqComplete
      && sectionViewed.instructions
      && scrollCompletion >= 95;
  }, [documentData?.education.required, faqTargets.length, faqViewed.length, scrollCompletion, sectionViewed]);

  async function postEducationEvent(
    eventType: "EDUCATION_PRESENTED" | "EDUCATION_COMPLETED" | "EDUCATION_ACKNOWLEDGED",
    overrides?: Partial<{
      durationSeconds: number;
      scrollCompletion: number;
      assetViews: string[];
      acknowledgement: boolean;
    }>,
  ) {
    setEducationSubmitting(true);
    try {
      const response = await fetch(`/api/public-signing/document/${encodeURIComponent(token)}/education`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          eventType,
          language: documentData?.education.language || "bilingual",
          durationSeconds: overrides?.durationSeconds ?? getDurationSeconds(educationStartedAtRef.current),
          scrollCompletion: overrides?.scrollCompletion ?? scrollCompletion,
          assetViews: overrides?.assetViews ?? assetViews,
          acknowledgement: overrides?.acknowledgement,
        }),
      });
      const payload = await readJsonSafe<PublicEducationEventResponse>(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload as ApiErrorPayload, `Failed to record ${eventType}`));
      }
      const result = payload as PublicEducationEventResponse;
      setDocumentData((current) => current ? { ...current, education: result.education } : current);
    } finally {
      setEducationSubmitting(false);
    }
  }

  async function postDecisionEvent(
    eventType: "CONSENT_PRESENTED" | "CONSENT_ACCEPTED" | "CONSENT_REFUSED" | "REFUSAL_FORM_PRESENTED" | "REFUSAL_ACKNOWLEDGED",
    payload?: Partial<{ refusalAcknowledged: boolean }>,
  ) {
    setDecisionSubmitting(true);
    try {
      const response = await fetch(`/api/public-signing/document/${encodeURIComponent(token)}/decision`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          eventType,
          refusalAcknowledged: payload?.refusalAcknowledged,
        }),
      });
      const payloadResult = await readJsonSafe<PublicDecisionEventResponse>(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payloadResult as ApiErrorPayload, `Failed to record ${eventType}`));
      }
      const result = payloadResult as PublicDecisionEventResponse;
      setDocumentData((current) => current ? { ...current, decision: result.decision } : current);
    } finally {
      setDecisionSubmitting(false);
    }
  }

  const postEducationEventFromEffect = useEffectEvent((
    eventType: "EDUCATION_PRESENTED" | "EDUCATION_COMPLETED" | "EDUCATION_ACKNOWLEDGED",
    overrides?: Partial<{
      durationSeconds: number;
      scrollCompletion: number;
      assetViews: string[];
      acknowledgement: boolean;
    }>,
  ) => {
    void postEducationEvent(eventType, overrides).catch((eventError) => {
      setError(eventError instanceof Error ? eventError.message : `Failed to record ${eventType.toLowerCase()}`);
      if (eventType === "EDUCATION_PRESENTED") presentedSentRef.current = false;
      if (eventType === "EDUCATION_COMPLETED") completedSentRef.current = false;
    });
  });

  const postDecisionEventFromEffect = useEffectEvent((
    eventType: "CONSENT_PRESENTED" | "CONSENT_ACCEPTED" | "CONSENT_REFUSED" | "REFUSAL_FORM_PRESENTED" | "REFUSAL_ACKNOWLEDGED",
    payload?: Partial<{ refusalAcknowledged: boolean }>,
  ) => {
    void postDecisionEvent(eventType, payload).catch((eventError) => {
      setError(eventError instanceof Error ? eventError.message : `Failed to record ${eventType.toLowerCase()}`);
      if (eventType === "REFUSAL_FORM_PRESENTED") refusalPresentedSentRef.current = false;
    });
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/public-signing/document/${encodeURIComponent(token)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const payload = await readJsonSafe<WorkflowFetchPayload>(response);
        if (!response.ok) {
          throw new Error(getErrorMessage(payload as ApiErrorPayload, "Failed to load public signing document"));
        }
        if (!cancelled) {
          // Discriminate the pre-OTP bootstrap response (no session cookie yet)
          // from the full validated document response. See PRE_OTP_BOOTSTRAP_FLOW.md.
          if (payload && typeof payload === "object" && (payload as { phase?: string }).phase === "pre-otp") {
            setBootstrap((payload as { bootstrap: PreOtpBootstrap }).bootstrap);
            setDocumentData(null);
          } else {
            setBootstrap(null);
            setDocumentData(payload as PublicSigningDocumentPayload);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load public signing document");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  useEffect(() => {
    if (!documentData || !documentData.education.required) return;

    educationStartedAtRef.current = educationStartedAtRef.current || Date.now();
    setAcknowledgementChecked(documentData.education.acknowledgement || documentData.education.patientAcknowledged);
    setAssetViews(documentData.education.assetViews || []);
    setScrollCompletion(documentData.education.scrollCompletion || 0);
    setSectionViewed({
      summary: documentData.education.completed,
      risks: documentData.education.completed,
      benefits: documentData.education.completed,
      faq: documentData.education.completed,
      instructions: documentData.education.completed,
    });
    if (!documentData.education.viewedAt && !presentedSentRef.current) {
      presentedSentRef.current = true;
      postEducationEventFromEffect("EDUCATION_PRESENTED");
    }
    setRefusalAcknowledgementChecked(documentData.decision.refusalAcknowledged);
  }, [documentData]);

  // [WORKFLOW_SEQUENCE_CORRECTION] When the server returns a fully-validated
  // document payload (i.e., not the pre-OTP bootstrap), the public-signing
  // session cookie has already been issued and OTP is verified server-side.
  // Reflect that in client state so the corrected lifecycle (OTP → Education
  // → Consent Review → Decision → Signature) does not redundantly demand OTP
  // re-entry on returning visits.
  useEffect(() => {
    if (documentData && !otpVerified) {
      setOtpVerified(true);
    }
  }, [documentData, otpVerified]);

  useEffect(() => {
    if (!documentData || documentData.decision.status !== "CONSENT_REFUSED") return;
    if (documentData.decision.refusalFormPresentedAt || refusalPresentedSentRef.current) return;

    refusalPresentedSentRef.current = true;
    postDecisionEventFromEffect("REFUSAL_FORM_PRESENTED");
  }, [documentData]);

  useEffect(() => {
    if (!educationRequired || educationAcknowledged) return undefined;

    const onScroll = () => {
      const documentElement = document.documentElement;
      const scrollable = Math.max(1, documentElement.scrollHeight - window.innerHeight);
      const nextCompletion = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      setScrollCompletion((current) => (nextCompletion > current ? nextCompletion : current));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [educationAcknowledged, educationRequired]);

  useEffect(() => {
    if (!educationRequired || documentData?.education.completed) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        setSectionViewed((current) => {
          const next = { ...current };
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const sectionKey = entry.target.getAttribute("data-education-section") as EducationSectionKey | null;
            if (sectionKey) next[sectionKey] = true;
          }
          return next;
        });
      },
      { threshold: 0.35 },
    );

    for (const key of Object.keys(sectionRefs.current) as EducationSectionKey[]) {
      const element = sectionRefs.current[key];
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [documentData?.education.completed, educationRequired]);

  useEffect(() => {
    if (!documentData?.education.required) return;
    if (documentData.education.completed || completedSentRef.current) return;
    if (!allEducationRequirementsMet) return;

    completedSentRef.current = true;
    postEducationEventFromEffect("EDUCATION_COMPLETED", {
      durationSeconds: getDurationSeconds(educationStartedAtRef.current),
      scrollCompletion,
      assetViews,
    });
  }, [allEducationRequirementsMet, assetViews, documentData, scrollCompletion]);

  async function submitSignature() {
    if (documentData?.education.required && !educationAcknowledged) {
      setError("Education acknowledgement is required before signing");
      return;
    }
    if (documentData?.decision.status === "UNDECIDED") {
      setError("Patient decision is required before signing");
      return;
    }
    if (documentData?.decision.status === "CONSENT_REFUSED" && !documentData.decision.refusalAcknowledged) {
      setError("Refusal acknowledgement is required before signing the refusal form");
      return;
    }
    if (!signerName.trim()) {
      setError("Signer name is required");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/public-signing/document/${encodeURIComponent(token)}/sign`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signatureDataUrl,
        }),
      });
      const payload = await readJsonSafe<PublicSignatureResult>(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload as ApiErrorPayload, "Failed to submit public signature"));
      }

      const result = payload as PublicSignatureResult;
      setSignatureResult(result);
      setSuccess(`Signature captured at ${new Date(result.signedAt).toLocaleString()}. Evidence hash: ${result.evidence.documentHash}`);
      setDocumentData((current) => current ? { ...current, status: result.status, signatureCaptured: true } : current);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit public signature");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcknowledgement() {
    if (!acknowledgementChecked) {
      setError("Patient acknowledgement is required before continuing to consent");
      return;
    }

    setError("");
    try {
      await postEducationEvent("EDUCATION_ACKNOWLEDGED", {
        durationSeconds: getDurationSeconds(educationStartedAtRef.current),
        scrollCompletion,
        assetViews,
        acknowledgement: true,
      });
    } catch (acknowledgementError) {
      setError(acknowledgementError instanceof Error ? acknowledgementError.message : "Failed to record education acknowledgement");
    }
  }

  async function handleRefusalAcknowledgement() {
    if (!refusalAcknowledgementChecked) {
      setError("Refusal acknowledgement is required before signing the refusal form");
      return;
    }

    setError("");
    try {
      await postDecisionEvent("REFUSAL_ACKNOWLEDGED", { refusalAcknowledged: true });
    } catch (acknowledgementError) {
      setError(acknowledgementError instanceof Error ? acknowledgementError.message : "Failed to record refusal acknowledgement");
    }
  }

  function registerAssetView(assetKey: string) {
    setAssetViews((current) => (current.includes(assetKey) ? current : [...current, assetKey]));
  }

  // --- Decision handlers (v1.0.1) ---
  async function acceptConsent() {
    setError("");
    try {
      await postDecisionEvent("CONSENT_ACCEPTED");
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Failed to record consent acceptance");
    }
  }

  async function refuseConsent() {
    setError("");
    try {
      await postDecisionEvent("CONSENT_REFUSED");
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Failed to record consent refusal");
    }
  }

  // --- OTP handlers (v1.0.1) ---
  async function requestOtp() {
    if (otpBusy) return;
    setOtpBusy(true);
    setOtpError("");
    try {
      const response = await fetch(`/api/sign/${encodeURIComponent(token)}/request-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mobileNumber: otpMobile.trim(), locale: "ar" }),
      });
      const payload = await readJsonSafe<{ challengeId: string; expiresAt: string; deliveryStatus: "sent" | "failed"; fallbackMode: boolean; maskedPhone: string }>(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload as ApiErrorPayload, "Failed to send OTP"));
      }
      const result = payload as { challengeId: string; expiresAt: string; deliveryStatus: "sent" | "failed"; fallbackMode: boolean; maskedPhone: string };
      setOtpRequestResult({
        maskedPhone: result.maskedPhone,
        expiresAt: result.expiresAt,
        deliveryStatus: result.deliveryStatus,
        fallbackMode: result.fallbackMode,
      });
    } catch (requestError) {
      setOtpError(requestError instanceof Error ? requestError.message : "Failed to send OTP");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyOtp() {
    if (otpBusy) return;
    setOtpBusy(true);
    setOtpError("");
    try {
      const response = await fetch(`/api/sign/${encodeURIComponent(token)}/verify-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otpCode: otpCode.trim() }),
      });
      const payload = await readJsonSafe<{ verified: boolean; attemptsRemaining: number }>(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload as ApiErrorPayload, "Failed to verify OTP"));
      }
      const result = payload as { verified: boolean };
      setOtpVerified(Boolean(result.verified));
      if (!result.verified) {
        setOtpError("OTP not verified. Please re-enter the code.");
      } else if (bootstrap && !documentData) {
        // Pre-OTP bootstrap path: the cookie is now set server-side, so re-fetch
        // the document endpoint to receive the full validated workflow payload.
        setReloadKey((current) => current + 1);
      }
    } catch (verifyError) {
      setOtpError(verifyError instanceof Error ? verifyError.message : "Failed to verify OTP");
    } finally {
      setOtpBusy(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl p-6 text-sm text-slate-600">Loading public signing workflow...</main>;
  }

  // Pre-OTP bootstrap render. The session cookie does not exist yet (true cold
  // open from Mail/SMS). Render only the OTP form using non-PHI bootstrap
  // metadata; once verifyOtp() succeeds we re-fetch the full payload above.
  if (bootstrap && !documentData) {
    return (
      <main className="mx-auto max-w-5xl space-y-5 p-6">
        <section className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
          <div className="space-y-1">
            {bootstrap.facilityName ? (
              <p className="text-xs uppercase tracking-wide text-slate-500">{bootstrap.facilityName}</p>
            ) : null}
            <h1 className="text-xl font-semibold text-slate-900" dir="rtl">{bootstrap.templateTitleAr}</h1>
            <h2 className="text-base font-medium text-slate-700">{bootstrap.templateTitleEn}</h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Verify your mobile number to begin. We will send you a one-time password (OTP) to start the consent workflow.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700" htmlFor="otpMobile">Mobile Number</label>
            <input
              id="otpMobile"
              type="tel"
              value={otpMobile}
              onChange={(event) => setOtpMobile(event.target.value)}
              placeholder="+9665XXXXXXXX"
              disabled={otpBusy || Boolean(otpRequestResult)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={otpBusy || !otpMobile.trim()}
              className="inline-flex rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {otpBusy && !otpRequestResult ? "Sending OTP..." : otpRequestResult ? "OTP sent" : "Request OTP"}
            </button>
            {otpRequestResult ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <p>OTP delivery status: {otpRequestResult.deliveryStatus}</p>
                <p>Mobile: {otpRequestResult.maskedPhone}</p>
                <p>Expires at: {otpRequestResult.expiresAt ? new Date(otpRequestResult.expiresAt).toLocaleString() : "\u2014"}</p>
                {otpRequestResult.fallbackMode ? <p>SMS provider is not configured in this environment.</p> : null}
              </div>
            ) : null}
            {otpRequestResult ? (
              <div className="mt-2 space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="otpCode">OTP Code</label>
                <input
                  id="otpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  placeholder="123456"
                  disabled={otpBusy}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => void verifyOtp()}
                  disabled={otpBusy || !otpCode.trim()}
                  className="inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {otpBusy ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            ) : null}
            {otpError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{otpError}</div> : null}
          </div>
          <p className="mt-4 text-xs text-slate-500" data-pre-otp-marker="v1">
            Education review and full consent content will be presented after OTP verification.
          </p>
        </section>
      </main>
    );
  }

  if (!documentData) {
    return <main className="mx-auto max-w-5xl p-6 text-sm text-rose-700">{error || "Public signing workflow is unavailable."}</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      {/* --- Step indicator (v1.0.1 — corrected sequence) --- */}
      {(() => {
        // [WORKFLOW_SEQUENCE_CORRECTION] OTP precedes clinical content. The
        // lifecycle is now: OTP → Education → Consent Review → Decision →
        // Signature → Confirmation. Decision and signature still come after
        // education/consent review (legal requirement preserved).
        const baseStages = educationRequired
          ? ["OTP Verification", "Education", "Consent Review", "Decision", "Signature", "Confirmation"]
          : ["OTP Verification", "Consent Review", "Decision", "Signature", "Confirmation"];
        const stages = isRefusalPath
          ? (educationRequired
              ? ["OTP Verification", "Education", "Consent Review", "Decision", "Refusal Acknowledgement", "Refusal Signature"]
              : ["OTP Verification", "Consent Review", "Decision", "Refusal Acknowledgement", "Refusal Signature"])
          : baseStages;
        let currentIndex = 0;
        if (documentData.signatureCaptured) {
          currentIndex = stages.length - 1;
        } else if (documentData.decision.status !== "UNDECIDED" && (!isRefusalPath || documentData.decision.refusalAcknowledged)) {
          currentIndex = stages.indexOf(isRefusalPath ? "Refusal Signature" : "Signature");
        } else if (isRefusalPath) {
          currentIndex = stages.indexOf("Refusal Acknowledgement");
        } else if (educationRequired && !educationAcknowledged) {
          currentIndex = stages.indexOf("Education");
        } else {
          currentIndex = stages.indexOf("Decision");
        }
        if (currentIndex < 0) currentIndex = 0;
        // --- Controlled UI Refresh wiring: landing visual layer only ---
        // When FEATURE_UI_REFRESH_V1_1 is ON, swap the legacy step-indicator
        // + header pair for the v1.1 landing block. Decision/OTP/signature/
        // confirmation rendering further down remains UNCHANGED.
        if (FEATURE_UI_REFRESH_V1_1) {
          return (
            <PatientLandingV11
              titleEn={documentData.templateTitleEn}
              titleAr={documentData.templateTitleAr}
              description={`${documentData.consentReference} · ${documentData.versionLabel}`}
              consentTypeLabel="Procedure"
              consentTypeValue={documentData.plannedProcedure || documentData.templateTitleEn}
              physician={documentData.physicianName ? `Physician · ${documentData.physicianName}` : undefined}
              facility={documentData.consentReference ? `Reference · ${documentData.consentReference}` : undefined}
              trustBannerMessage="Your information is protected. This session is encrypted end-to-end."
              whatToExpectTitle="What to expect"
              whatToExpectItems={stages.map((label, index) => ({ id: `${index}-${label}`, text: label }))}
              currentStep={currentIndex + 1}
              totalSteps={stages.length}
            />
          );
        }
        return (
          <section aria-label="Workflow progress" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step {currentIndex + 1} of {stages.length} — {stages[currentIndex]}</p>
            <ol className="mt-3 flex flex-wrap gap-2 text-xs">
              {stages.map((label, index) => {
                const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
                const className =
                  state === "done"
                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800"
                    : state === "current"
                      ? "rounded-full border border-sky-300 bg-sky-50 px-3 py-1 font-semibold text-sky-900"
                      : "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-500";
                return (
                  <li key={label} className={className}>
                    {index + 1}. {label}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })()}

      {FEATURE_UI_REFRESH_V1_1 ? null : (
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">WathiqCare Secure Sign</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{documentData.templateTitleEn}</h1>
          <p className="mt-1 text-lg font-medium text-slate-700" dir="rtl">{documentData.templateTitleAr}</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <p><strong>Reference:</strong> {documentData.consentReference}</p>
            <p><strong>Version:</strong> {documentData.versionLabel}</p>
            <p><strong>Patient:</strong> {documentData.patientName}</p>
            <p><strong>Physician:</strong> {documentData.physicianName}</p>
            <p><strong>Diagnosis:</strong> {documentData.diagnosis || "-"}</p>
            <p><strong>Procedure:</strong> {documentData.plannedProcedure || "-"}</p>
          </div>
        </header>
      )}

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-900 shadow-sm">
        <h2 className="text-lg font-semibold">Educational Materials Status</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <p><strong>Education required:</strong> {documentData.education.required ? "Yes" : "No"}</p>
          <p><strong>Completed:</strong> {documentData.education.completed ? "Yes" : "No"}</p>
          <p><strong>Patient acknowledged:</strong> {documentData.education.patientAcknowledged ? "Yes" : "No"}</p>
          <p><strong>Score:</strong> {documentData.education.score ?? "-"}</p>
          <p><strong>Language:</strong> {documentData.education.language || "-"}</p>
          <p><strong>Duration:</strong> {documentData.education.durationSeconds ?? 0}s</p>
          <p><strong>Scroll completion:</strong> {documentData.education.scrollCompletion ?? scrollCompletion}%</p>
          <p><strong>Decision:</strong> {documentData.decision.status}</p>
        </div>
      </section>

      {documentData.education.required ? (
        <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Patient Education</h2>
            <p className="mt-2 text-sm text-slate-700">Review the full educational package before the consent document is displayed. The workflow unlocks consent only after education is completed and acknowledged.</p>
          </div>

          {documentData.education.summary ? (
            <section
              ref={(element) => { sectionRefs.current.summary = element; }}
              data-education-section="summary"
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <h3 className="text-lg font-semibold text-slate-900">Educational Summary</h3>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <p className="text-sm leading-7 text-slate-700" dir="rtl">{documentData.education.summary.ar}</p>
                <p className="text-sm leading-7 text-slate-700">{documentData.education.summary.en}</p>
              </div>
            </section>
          ) : null}

          <section
            ref={(element) => { sectionRefs.current.risks = element; }}
            data-education-section="risks"
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h3 className="text-lg font-semibold text-slate-900">Risks</h3>
            <div className="mt-3">
              <EducationList items={documentData.education.risks} />
            </div>
          </section>

          <section
            ref={(element) => { sectionRefs.current.benefits = element; }}
            data-education-section="benefits"
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h3 className="text-lg font-semibold text-slate-900">Benefits</h3>
            <div className="mt-3">
              <EducationList items={documentData.education.benefits} />
            </div>
          </section>

          <section
            ref={(element) => { sectionRefs.current.faq = element; }}
            data-education-section="faq"
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h3 className="text-lg font-semibold text-slate-900">FAQ</h3>
            <div className="mt-3 space-y-3">
              {documentData.education.faq.map((item, index) => {
                const faqKey = `${index}-${item.questionEn}`;
                return (
                  <details
                    key={faqKey}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    onToggle={(event) => {
                      if ((event.currentTarget as HTMLDetailsElement).open) {
                        setFaqViewed((current) => (current.includes(faqKey) ? current : [...current, faqKey]));
                      }
                    }}
                  >
                    <summary className="cursor-pointer text-sm font-semibold text-slate-900">{item.questionEn}</summary>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{item.answerEn}</p>
                    <div className="mt-4 border-t border-slate-200 pt-3 text-sm leading-7 text-slate-700" dir="rtl">
                      <p className="font-semibold text-slate-900">{item.questionAr}</p>
                      <p className="mt-2">{item.answerAr}</p>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>

          <section
            ref={(element) => { sectionRefs.current.instructions = element; }}
            data-education-section="instructions"
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h3 className="text-lg font-semibold text-slate-900">Instructions</h3>
            <div className="mt-4 space-y-5">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Pre-Procedure</h4>
                <div className="mt-3">
                  <EducationList items={documentData.education.preProcedureInstructions} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Post-Procedure</h4>
                <div className="mt-3">
                  <EducationList items={documentData.education.postProcedureInstructions} />
                </div>
              </div>
            </div>
          </section>

          {documentData.education.assets.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Educational Assets</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {documentData.education.assets.map((asset) => (
                  <div key={asset.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{asset.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{asset.assetType}</p>
                    {asset.sourceUri ? (
                      <a
                        href={asset.sourceUri}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-900"
                        onClick={() => registerAssetView(asset.assetKey)}
                      >
                        Open asset
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-900"
                        onClick={() => registerAssetView(asset.assetKey)}
                      >
                        Mark asset reviewed
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {!documentData.education.completed ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
              <p><strong>Completion progress:</strong> {scrollCompletion}% scroll, {faqViewed.length}/{faqTargets.length} FAQ items viewed, {assetViews.length} assets reviewed.</p>
              <p className="mt-2">Complete summary, risks, benefits, FAQ, and instructions, then scroll through the education package to unlock acknowledgement.</p>
            </div>
          ) : null}

          {documentData.education.completed && !educationAcknowledged ? (
            <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Patient Acknowledgement</h3>
              <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acknowledgementChecked}
                  onChange={(event) => setAcknowledgementChecked(event.target.checked)}
                  disabled={educationSubmitting}
                />
                <span>I confirm that I reviewed the educational summary, risks, benefits, FAQ, and instructions before continuing to the consent document.</span>
              </label>
              <button
                type="button"
                onClick={() => void handleAcknowledgement()}
                disabled={educationSubmitting}
                className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {educationSubmitting ? "Recording acknowledgement..." : "Acknowledge Education and Continue"}
              </button>
            </section>
          ) : null}
        </section>
      ) : null}

      {(!documentData.education.required || educationAcknowledged) && documentData.sections.length > 0 ? documentData.sections.map((section) => (
        <SectionBlock
          key={section.id}
          titleAr={section.titleAr}
          titleEn={section.titleEn}
          contentAr={section.contentAr}
          contentEn={section.contentEn}
        />
      )) : null}

      {(!documentData.education.required || educationAcknowledged) && (documentData.legalTextAr || documentData.legalTextEn) ? (
        <SectionBlock
          titleAr="النص القانوني"
          titleEn="Legal Consent Text"
          contentAr={documentData.legalTextAr}
          contentEn={documentData.legalTextEn}
        />
      ) : null}

      {(!documentData.education.required || educationAcknowledged) && (documentData.pdplTextAr || documentData.pdplTextEn) ? (
        <SectionBlock
          titleAr="حماية البيانات والخصوصية"
          titleEn="Privacy and Data Protection"
          contentAr={documentData.pdplTextAr}
          contentEn={documentData.pdplTextEn}
        />
      ) : null}

      {/* --- Decision Section: Accept or Refuse (v1.0.1) --- */}
      {(!documentData.education.required || educationAcknowledged) && documentData.decision.status === "UNDECIDED" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Consent Decision</h2>
          <p className="mt-2 text-sm text-slate-600">After reviewing the educational materials, consent text, and privacy notice above, choose whether to proceed.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void acceptConsent()}
              disabled={decisionSubmitting}
              className="inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {decisionSubmitting ? "Recording decision..." : "Accept and Continue"}
            </button>
            <button
              type="button"
              onClick={() => void refuseConsent()}
              disabled={decisionSubmitting}
              className="inline-flex rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {decisionSubmitting ? "Recording decision..." : "Refuse Treatment"}
            </button>
          </div>
        </section>
      ) : null}

      {(!documentData.education.required || educationAcknowledged) && documentData.decision.status === "CONSENT_ACCEPTED" ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Consent acceptance recorded on {documentData.decision.selectedAt ? new Date(documentData.decision.selectedAt).toLocaleString() : "—"}.
        </section>
      ) : null}

      {isRefusalPath && documentData.decision.refusalForm ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Treatment Refusal Form</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2 text-sm text-slate-700">
            <div>
              <p><strong>Patient Name:</strong> {documentData.decision.refusalForm.patientName}</p>
              <p className="mt-2"><strong>MRN:</strong> {documentData.decision.refusalForm.mrn || "-"}</p>
              <p className="mt-2"><strong>Procedure:</strong> {documentData.decision.refusalForm.procedure}</p>
              <p className="mt-2"><strong>Physician:</strong> {documentData.decision.refusalForm.physicianName}</p>
              <p className="mt-4 leading-7">{documentData.decision.refusalForm.statementEn}</p>
            </div>
            <div dir="rtl">
              <p><strong>اسم المريض/ة:</strong> {documentData.decision.refusalForm.patientName}</p>
              <p className="mt-2"><strong>الملف الطبي:</strong> {documentData.decision.refusalForm.mrn || "-"}</p>
              <p className="mt-2"><strong>الإجراء:</strong> {documentData.decision.refusalForm.procedure}</p>
              <p className="mt-2"><strong>الطبيب:</strong> {documentData.decision.refusalForm.physicianName}</p>
              <p className="mt-4 leading-7">{documentData.decision.refusalForm.statementAr}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-slate-700">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={refusalAcknowledgementChecked}
                onChange={(event) => setRefusalAcknowledgementChecked(event.target.checked)}
                disabled={decisionSubmitting || documentData.decision.refusalAcknowledged}
              />
              <span className="space-y-2">
                <span className="block" dir="rtl">{documentData.decision.refusalForm.acknowledgementAr}</span>
                <span className="block">{documentData.decision.refusalForm.acknowledgementEn}</span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => void handleRefusalAcknowledgement()}
              disabled={decisionSubmitting || documentData.decision.refusalAcknowledged}
              className="mt-4 inline-flex rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {decisionSubmitting ? "Recording acknowledgement..." : documentData.decision.refusalAcknowledged ? "Refusal acknowledgement recorded" : "Acknowledge Refusal Form"}
            </button>
          </div>
        </section>
      ) : null}

      {/* --- OTP Verification ---
         [WORKFLOW_SEQUENCE_CORRECTION] OTP is performed BEFORE clinical
         content via the pre-OTP bootstrap path (rendered above when
         `bootstrap && !documentData`). Reaching this main render means the
         server already validated the public-signing session cookie, so the
         legacy in-flow OTP section has been removed to avoid presenting it
         after education/decision. Signature submission still requires
         `otpVerified` and the server still requires OTP evidence + decision
         before persisting the signature. */}

      {otpVerified && !documentData.signatureCaptured ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          OTP verified. Continue to capture the signature below.
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{isRefusalPath ? "Treatment Refusal Signature" : "Patient Signature"}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {documentData.education.required && !educationAcknowledged
            ? "Complete education acknowledgement to reveal the consent document and signature step."
            : documentData.decision.status === "UNDECIDED"
              ? "Record your consent decision before continuing to signature."
              : isRefusalPath && !documentData.decision.refusalAcknowledged
                ? "Acknowledge the refusal form before signing."
                : !otpVerified
                  ? "Verify the OTP before signing."
                  : isRefusalPath
                    ? "OTP has been verified. Submit the signer name and signature to persist the treatment refusal form."
                    : "OTP has been verified. Submit the signer name and signature capture to persist the patient signature."}
        </p>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="publicSignerName">Signer Name</label>
          <input
            id="publicSignerName"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
            value={signerName}
            onChange={(event) => setSignerName(event.target.value)}
            placeholder="Enter signer full name"
            disabled={documentData.signatureCaptured || submitting}
          />
          <TabletSignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} />
          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}
          {signatureResult ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p><strong>Signature ID:</strong> {signatureResult.signatureId}</p>
              <p><strong>Status:</strong> {signatureResult.status}</p>
              <p><strong>OTP Hash:</strong> {signatureResult.evidence.otpHash}</p>
              <p><strong>Decision:</strong> {signatureResult.evidence.decisionStatus}</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void submitSignature()}
            disabled={
              submitting
              || documentData.signatureCaptured
              || (documentData.education.required && !educationAcknowledged)
              || documentData.decision.status === "UNDECIDED"
              || (isRefusalPath && !documentData.decision.refusalAcknowledged)
              || !otpVerified
            }
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {documentData.signatureCaptured ? "Signature already captured" : submitting ? "Submitting signature..." : isRefusalPath ? "Submit Refusal Signature" : "Submit OTP Signature"}
          </button>
        </div>
      </section>
    </main>
  );
}