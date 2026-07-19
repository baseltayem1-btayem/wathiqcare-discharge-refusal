/**
 * Approved WathiqCare Patient Secure Signing Journey
 *
 * Production-ready, bilingual patient workflow split into focused step
 * components. Preserves the public-signing backend contract:
 *
 *   - GET  /api/public-signing/document/[token]
 *   - POST /api/sign/[token]/request-otp
 *   - POST /api/sign/[token]/verify-otp
 *   - POST /api/public-signing/document/[token]/education
 *   - POST /api/public-signing/document/[token]/decision
 *   - POST /api/public-signing/document/[token]/sign
 *   - GET  /api/public/informed-consents/signing/[token]/final-pdf
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, type Lang } from "../shared";
import {
  DocumentResponse,
  fetchJson,
  FullDocument,
  PatientScreen,
  pickLocalized,
  SignatureResult,
} from "./types";
import { PatientCompletionStep } from "./PatientCompletionStep";
import { EducationDetailsStep } from "./EducationDetailsStep";
import { LanguageSelectionStep } from "./LanguageSelectionStep";
import { PatientJourneyScreen } from "./PatientJourneyScreen";
import { PatientSignatureStep } from "./PatientSignatureStep";
import { RefusalAcknowledgementStep } from "./RefusalAcknowledgementStep";
import { ReviewRequestStep } from "./ReviewRequestStep";
import { OtpVerificationStep } from "./OtpVerificationStep";
import { EducationMaterialsStep } from "./EducationMaterialsStep";
import { UnderstandingAcknowledgementStep } from "./UnderstandingAcknowledgementStep";
import { SignaturePadHandle } from "./SignaturePad";

export type ApprovedPatientWorkflowProps = {
  token: string;
  initialLang?: Lang;
};

const STEP_MAP: Record<Exclude<PatientScreen, "refusal-ack" | "refusal-signature" | "refusal-confirmed">, number> = {
  review: 1,
  otp: 2,
  language: 3,
  education: 4,
  disclosures: 4,
  acknowledgement: 5,
  signature: 6,
  confirmation: 7,
};

export function ApprovedPatientWorkflow({
  token,
  initialLang = "ar",
}: ApprovedPatientWorkflowProps) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [screen, setScreen] = useState<PatientScreen>("review");

  const [bootstrap, setBootstrap] = useState<FullDocument | null>(null);
  const [doc, setDoc] = useState<FullDocument | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* OTP state */
  const [mobile, setMobile] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>([
    "", "", "", "", "", "",
  ]);
  const [otpStage, setOtpStage] = useState<"request" | "verify">("request");
  const [otpRequesting, setOtpRequesting] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  /* Education state */
  const [educationEventLogged, setEducationEventLogged] = useState(false);
  const [educationCompleting, setEducationCompleting] = useState(false);

  /* Decision state */
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  /* Refusal state */
  const [refusalAckSubmitting, setRefusalAckSubmitting] = useState(false);

  /* Signature state */
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signatureHasInk, setSignatureHasInk] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [signResult, setSignResult] = useState<SignatureResult | null>(null);

  const toggleLang = useCallback(
    () => setLang((l) => (l === "ar" ? "en" : "ar")),
    [],
  );

  /* ── Load document on mount + after OTP verify ───────────────────── */
  const loadDocument = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchJson<DocumentResponse>(
        `/api/public-signing/document/${encodeURIComponent(token)}`,
      );
      if ("phase" in data && data.phase === "pre-otp") {
        setBootstrap({
          documentId: data.bootstrap.documentId,
          consentReference: null,
          status: "PRE_OTP",
          signerRole: data.bootstrap.signerRole,
          patientName: null,
          patientMrn: null,
          mrn: null,
          physicianName: null,
          diagnosis: null,
          plannedProcedure: null,
          templateTitleAr: data.bootstrap.templateTitleAr,
          templateTitleEn: data.bootstrap.templateTitleEn,
          approvedPdfUrl: data.bootstrap.approvedPdfUrl,
          approvedContentAvailable: data.bootstrap.approvedContentAvailable,
          versionLabel: null,
          facilityName: data.bootstrap.facilityName,
          sections: [],
          legalTextAr: null,
          legalTextEn: null,
          pdplTextAr: null,
          pdplTextEn: null,
          signatureCaptured: false,
          decision: null,
          education: null,
          illustrations: [],
        });
        setDoc(null);
        return "pre-otp" as const;
      }
      setDoc(data as FullDocument);
      setBootstrap((b) =>
        b ?? {
          documentId: (data as FullDocument).documentId,
          consentReference: (data as FullDocument).consentReference,
          status: (data as FullDocument).status,
          signerRole: (data as FullDocument).signerRole,
          patientName: (data as FullDocument).patientName,
          patientMrn: (data as FullDocument).patientMrn,
          mrn: (data as FullDocument).mrn,
          physicianName: (data as FullDocument).physicianName,
          diagnosis: (data as FullDocument).diagnosis,
          plannedProcedure: (data as FullDocument).plannedProcedure,
          templateTitleAr: (data as FullDocument).templateTitleAr,
          templateTitleEn: (data as FullDocument).templateTitleEn,
          approvedPdfUrl: (data as FullDocument).approvedPdfUrl,
          approvedContentAvailable: (data as FullDocument).approvedContentAvailable,
          versionLabel: (data as FullDocument).versionLabel,
          facilityName: (data as FullDocument).facilityName,
          sections: (data as FullDocument).sections,
          legalTextAr: (data as FullDocument).legalTextAr,
          legalTextEn: (data as FullDocument).legalTextEn,
          pdplTextAr: (data as FullDocument).pdplTextAr,
          pdplTextEn: (data as FullDocument).pdplTextEn,
          signatureCaptured: (data as FullDocument).signatureCaptured,
          decision: (data as FullDocument).decision,
          education: (data as FullDocument).education,
          illustrations: (data as FullDocument).illustrations,
        },
      );
      const realName = (data as FullDocument).patientName?.trim();
      if (realName) setSignerName((current) => current || realName);
      return "full" as const;
    } catch (err) {
      const e = err as Error & { status?: number };
      setError(
        e.message ||
          (lang === "ar"
            ? "تعذر تحميل وثيقة الموافقة"
            : "Unable to load consent document"),
      );
      return "error" as const;
    } finally {
      setLoading(false);
    }
  }, [token, lang]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocument();
  }, [token, loadDocument]);

  /* ── Derived display values from real data ───────────────────────── */
  const facilityName =
    doc?.facilityName || bootstrap?.facilityName || (lang === "ar" ? "—" : "—");
  const procedureTitle = pickLocalized(
    lang,
    doc?.templateTitleAr || bootstrap?.templateTitleAr,
    doc?.templateTitleEn || bootstrap?.templateTitleEn,
  );
  const physicianName = doc?.physicianName?.trim() || "";
  const patientName = doc?.patientName?.trim() || "";
  const patientMrn = doc?.patientMrn?.trim() || doc?.mrn?.trim() || "";
  const educationRequired =
    bootstrap?.education?.required ?? doc?.education?.required ?? false;
  const consentRef = doc?.consentReference?.trim() || "";
  const versionLabel = doc?.versionLabel?.trim() || "";

  /* ── Education event logging when entering education screen ──────── */
  useEffect(() => {
    if (screen !== "education" || educationEventLogged || !doc?.education?.required)
      return;
    let cancelled = false;
    const run = async () => {
      try {
        await fetchJson(
          `/api/public-signing/document/${encodeURIComponent(token)}/education`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              eventType: "EDUCATION_PRESENTED",
              language: lang === "ar" ? "ar" : "en",
            }),
          },
        );
      } catch {
        /* non-blocking */
      } finally {
        if (!cancelled) setEducationEventLogged(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [screen, educationEventLogged, doc?.education?.required, token, lang]);

  /* ════════════════════════════════════════════════════════════════
   *  OTP actions
   * ════════════════════════════════════════════════════════════════ */

  const handleRequestOtp = useCallback(async () => {
    const m = mobile.trim();
    if (m.length < 7) {
      setOtpError(
        lang === "ar" ? "أدخل رقم جوال صحيح" : "Enter a valid mobile number",
      );
      return;
    }
    setOtpRequesting(true);
    setOtpError(null);
    try {
      const data = await fetchJson<{
        challengeId?: string;
        expiresAt?: string;
        deliveryStatus?: string;
        fallbackMode?: boolean;
        maskedPhone?: string;
      }>(`/api/sign/${encodeURIComponent(token)}/request-otp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mobileNumber: m, locale: lang }),
      });
      setOtpExpiresAt(data.expiresAt || null);
      setMaskedPhone(data.maskedPhone || m.replace(/.(?=.{4})/g, "*"));
      setOtpStage("verify");
    } catch (err) {
      const e = err as Error;
      setOtpError(
        e.message ||
          (lang === "ar" ? "تعذر إرسال رمز التحقق" : "Unable to send OTP"),
      );
    } finally {
      setOtpRequesting(false);
    }
  }, [mobile, lang, token]);

  const handleVerifyOtp = useCallback(async () => {
    const code = otpDigits.join("");
    if (code.length !== 6) {
      setOtpError(
        lang === "ar"
          ? "أدخل الرمز المكوّن من 6 أرقام"
          : "Enter the 6-digit code",
      );
      return;
    }
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const data = await fetchJson<{
        verified: boolean;
        attemptsRemaining?: number;
      }>(`/api/sign/${encodeURIComponent(token)}/verify-otp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otpCode: code }),
      });
      if (!data.verified) {
        setAttemptsRemaining(data.attemptsRemaining ?? null);
        setOtpError(
          lang === "ar"
            ? "رمز غير صحيح. حاول مرة أخرى."
            : "Incorrect code. Please try again.",
        );
        setOtpDigits(["", "", "", "", "", ""]);
        return;
      }
      const phase = await loadDocument();
      if (phase === "full") {
        setScreen("language");
      }
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 410) {
        setOtpError(
          lang === "ar"
            ? "انتهت صلاحية الرمز. اطلب رمزاً جديداً."
            : "Code expired. Request a new one.",
        );
        setOtpStage("request");
      } else if (e.status === 429) {
        setOtpError(
          lang === "ar"
            ? "تم تجاوز عدد المحاولات. اطلب رمزاً جديداً."
            : "Too many attempts. Request a new code.",
        );
        setOtpStage("request");
      } else {
        setOtpError(
          e.message ||
            (lang === "ar" ? "تعذر التحقق من الرمز" : "OTP verification failed"),
        );
      }
    } finally {
      setOtpVerifying(false);
    }
  }, [otpDigits, lang, token, loadDocument, educationRequired]);

  /* ════════════════════════════════════════════════════════════════
   *  Education action
   * ════════════════════════════════════════════════════════════════ */

  const handleCompleteEducation = useCallback(async () => {
    setEducationCompleting(true);
    try {
      await fetchJson(
        `/api/public-signing/document/${encodeURIComponent(token)}/education`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            eventType: "EDUCATION_COMPLETED",
            language: lang === "ar" ? "ar" : "en",
            scrollCompletion: 100,
          }),
        },
      );
      await fetchJson(
        `/api/public-signing/document/${encodeURIComponent(token)}/education`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            eventType: "EDUCATION_ACKNOWLEDGED",
            language: lang === "ar" ? "ar" : "en",
            acknowledgement: true,
          }),
        },
      );
      setScreen("acknowledgement");
    } catch {
      setScreen("acknowledgement");
    } finally {
      setEducationCompleting(false);
    }
  }, [token, lang]);

  const continueFromLanguage = useCallback(() => {
    if (educationRequired) {
      setScreen("education");
      return;
    }
    setScreen("acknowledgement");
  }, [educationRequired]);

  /* ════════════════════════════════════════════════════════════════
   *  Decision actions
   * ════════════════════════════════════════════════════════════════ */

  const submitDecision = useCallback(
    async (eventType: "CONSENT_ACCEPTED" | "CONSENT_REFUSED") => {
      setDecisionSubmitting(true);
      setDecisionError(null);
      try {
        await fetchJson(
          `/api/public-signing/document/${encodeURIComponent(token)}/decision`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ eventType }),
          },
        );
        if (eventType === "CONSENT_ACCEPTED") {
          setScreen("signature");
        } else {
          await loadDocument();
          setScreen("refusal-ack");
        }
      } catch (err) {
        const e = err as Error;
        setDecisionError(
          e.message ||
            (lang === "ar" ? "تعذر تسجيل القرار" : "Decision recording failed"),
        );
      } finally {
        setDecisionSubmitting(false);
      }
    },
    [token, lang, loadDocument],
  );

  const submitRefusalAck = useCallback(async () => {
    setRefusalAckSubmitting(true);
    setDecisionError(null);
    try {
      await fetchJson(
        `/api/public-signing/document/${encodeURIComponent(token)}/decision`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            eventType: "REFUSAL_ACKNOWLEDGED",
            refusalAcknowledged: true,
          }),
        },
      );
      setScreen("refusal-signature");
    } catch (err) {
      const e = err as Error;
      setDecisionError(
        e.message ||
          (lang === "ar" ? "تعذر تسجيل الإقرار" : "Acknowledgement failed"),
      );
    } finally {
      setRefusalAckSubmitting(false);
    }
  }, [token, lang]);

  /* ════════════════════════════════════════════════════════════════
   *  Signature submission
   * ════════════════════════════════════════════════════════════════ */

  const submitSignature = useCallback(
    async (mode: "consent" | "refusal") => {
      const name = signerName.trim();
      if (!name) {
        setSignError(
          lang === "ar" ? "أدخل اسمك الكامل" : "Enter your full name",
        );
        return;
      }
      const dataUrl = padRef.current?.toDataUrl();
      if (!dataUrl) {
        setSignError(
          lang === "ar"
            ? "ارسم توقيعك في المربع"
            : "Draw your signature in the pad",
        );
        return;
      }
      setSigning(true);
      setSignError(null);
      try {
        const result = await fetchJson<SignatureResult>(
          `/api/public-signing/document/${encodeURIComponent(token)}/sign`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              signerName: name,
              signatureDataUrl: dataUrl,
            }),
          },
        );
        setSignResult(result);
        setScreen(mode === "refusal" ? "refusal-confirmed" : "confirmation");
      } catch (err) {
        const e = err as Error;
        setSignError(
          e.message ||
            (lang === "ar"
              ? "تعذر تسجيل التوقيع"
              : "Signature submission failed"),
        );
      } finally {
        setSigning(false);
      }
    },
    [signerName, token, lang],
  );

  /* ════════════════════════════════════════════════════════════════
   *  Render
   * ════════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !bootstrap && !doc) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-foreground mb-2">
            {lang === "ar" ? "تعذر تحميل الوثيقة" : "Document unavailable"}
          </h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  const activeStep = STEP_MAP[screen as keyof typeof STEP_MAP];
  const stepProp = activeStep ? activeStep : undefined;

  const screenBack = (): PatientScreen | undefined => {
    switch (screen) {
      case "otp":
        return "review";
      case "education":
        return "language";
      case "disclosures":
        return "education";
      case "acknowledgement":
        return educationRequired ? "disclosures" : "language";
      case "signature":
        return "acknowledgement";
      case "language":
        return "otp";
      case "refusal-ack":
        return "acknowledgement";
      case "refusal-signature":
        return "refusal-ack";
      default:
        return undefined;
    }
  };

  const onBack = screenBack()
    ? () => setScreen(screenBack() as PatientScreen)
    : undefined;

  return (
    <PatientJourneyScreen
      lang={lang}
      facilityName={facilityName}
      step={stepProp}
      onLangToggle={toggleLang}
      onBack={onBack}
    >
      {screen === "review" && bootstrap ? (
        <ReviewRequestStep
          lang={lang}
          facilityName={facilityName}
          procedureTitle={procedureTitle}
          physicianName={physicianName}
          patientName={patientName}
          patientMrn={patientMrn}
          consentRef={consentRef}
          versionLabel={versionLabel}
          onProceed={() => setScreen("otp")}
        />
      ) : null}

      {screen === "otp" ? (
        <OtpVerificationStep
          lang={lang}
          mobile={mobile}
          setMobile={setMobile}
          otpDigits={otpDigits}
          setOtpDigits={setOtpDigits}
          otpStage={otpStage}
          setOtpStage={setOtpStage}
          maskedPhone={maskedPhone}
          otpExpiresAt={otpExpiresAt}
          attemptsRemaining={attemptsRemaining}
          otpError={otpError}
          otpRequesting={otpRequesting}
          otpVerifying={otpVerifying}
          onRequest={handleRequestOtp}
          onVerify={handleVerifyOtp}
        />
      ) : null}

      {screen === "language" ? (
        <LanguageSelectionStep
          lang={lang}
          selectedLang={lang}
          onSelect={setLang}
          onContinue={continueFromLanguage}
        />
      ) : null}

      {screen === "education" && doc ? (
        <EducationMaterialsStep
          lang={lang}
          doc={doc}
          onComplete={() => setScreen("disclosures")}
          completing={false}
        />
      ) : null}

      {screen === "disclosures" && doc ? (
        <EducationDetailsStep
          lang={lang}
          doc={doc}
          onContinue={handleCompleteEducation}
          completing={educationCompleting}
        />
      ) : null}

      {screen === "acknowledgement" && doc ? (
        <UnderstandingAcknowledgementStep
          lang={lang}
          doc={doc}
          procedureTitle={procedureTitle}
          consentRef={consentRef}
          onAccept={() => submitDecision("CONSENT_ACCEPTED")}
          onRefuse={() => submitDecision("CONSENT_REFUSED")}
          submitting={decisionSubmitting}
          error={decisionError}
        />
      ) : null}

      {screen === "signature" && doc ? (
        <PatientSignatureStep
          lang={lang}
          patientName={patientName || (lang === "ar" ? "المريض" : "Patient")}
          patientMrn={patientMrn || (lang === "ar" ? "—" : "—")}
          signerName={signerName}
          setSignerName={setSignerName}
          padRef={padRef}
          hasInk={signatureHasInk}
          setHasInk={setSignatureHasInk}
          onSubmit={() => submitSignature("consent")}
          submitting={signing}
          error={signError}
          mode="consent"
          onBack={() => setScreen("acknowledgement")}
        />
      ) : null}

      {screen === "refusal-ack" && doc ? (
        <RefusalAcknowledgementStep
          lang={lang}
          doc={doc}
          onAck={submitRefusalAck}
          submitting={refusalAckSubmitting}
          error={decisionError}
        />
      ) : null}

      {screen === "refusal-signature" && doc ? (
        <PatientSignatureStep
          lang={lang}
          patientName={patientName || (lang === "ar" ? "المريض" : "Patient")}
          patientMrn={patientMrn || (lang === "ar" ? "—" : "—")}
          signerName={signerName}
          setSignerName={setSignerName}
          padRef={padRef}
          hasInk={signatureHasInk}
          setHasInk={setSignatureHasInk}
          onSubmit={() => submitSignature("refusal")}
          submitting={signing}
          error={signError}
          mode="refusal"
          onBack={() => setScreen("refusal-ack")}
        />
      ) : null}

      {screen === "confirmation" && signResult ? (
        <PatientCompletionStep
          lang={lang}
          mode="consent"
          signResult={signResult}
          consentRef={consentRef}
          token={token}
          onDone={() => {
            /* Patient-safe noop; page can be closed. */
          }}
        />
      ) : null}

      {screen === "refusal-confirmed" && signResult ? (
        <PatientCompletionStep
          lang={lang}
          mode="refusal"
          signResult={signResult}
          consentRef={consentRef}
          token={token}
          onDone={() => {
            /* Patient-safe noop; page can be closed. */
          }}
        />
      ) : null}
    </PatientJourneyScreen>
  );
}

export default ApprovedPatientWorkflow;
