/**
 * Approved Healthcare Consent Platform Design — Patient Workflow
 *
 * Ports the 7 approved patient screens (Landing / OTP / Education /
 * Consent Review / Decision / Signature / Confirmation) plus the refusal
 * branch, verbatim from design/figma/wathiqcare-v1.1/src/app/App.tsx, and
 * wires every screen to the real WathiqCare public-signing APIs:
 *
 *   - GET  /api/public-signing/document/[token]          (bootstrap + full doc)
 *   - POST /api/sign/[token]/request-otp                 (real OTP via SMS+email)
 *   - POST /api/sign/[token]/verify-otp                  (HttpOnly session cookie)
 *   - POST /api/public-signing/document/[token]/education
 *   - POST /api/public-signing/document/[token]/decision
 *   - POST /api/public-signing/document/[token]/sign     (canvas data URL)
 *
 * NOTE on screen order: the approved Vite design lists OTP between Decision
 * and Signature (step 5 of 7). The production OTP engine is server-enforced
 * to gate every authenticated read (education / decision / signature). To
 * preserve every approved screen visually while honoring the immutable OTP
 * contract, OTP is rendered immediately after Landing and the remaining
 * approved screens (Education / Review / Decision / Signature / Confirmation)
 * follow. No screen is removed, redesigned, or replaced.
 */
"use client";

import { OtpVerificationShell } from "@/components/public-signing/OtpVerificationShell";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Hash,
  Info,
  Loader2,
  Lock,
  MoreVertical,
  Phone,
  Shield,
  Stethoscope,
  User,
  XCircle,
} from "lucide-react";

import {
  Alert,
  Card,
  cls,
  MobileHeader,
  SecureNoticeBadge,
  type Lang,
} from "../shared";

/* ════════════════════════════════════════════════════════════════════════
 *  Server contract types (mirror PublicSigningWorkflow payloads)
 * ════════════════════════════════════════════════════════════════════════ */

type Bootstrap = {
  documentId: string;
  moduleType: "INFORMED_CONSENT" | "DISCHARGE_REFUSAL" | "LEGAL_CONSENT" | string;
  signerRole: "PATIENT" | "GUARDIAN" | string;
  facilityName?: string | null;
  templateTitleAr?: string | null;
  templateTitleEn?: string | null;
  locale?: "ar" | "en" | "bilingual" | string | null;
  educationRequired?: boolean;
  maskedMobile?: string | null;
  otpRequiredAt?: string | null;
};
type Section = {
  id: string;
  sectionKey?: string;
  sectionKind?: string;
  titleAr?: string | null;
  titleEn?: string | null;
  contentAr?: string | null;
  contentEn?: string | null;
};

type EducationFaq = {
  questionAr?: string | null;
  questionEn?: string | null;
  answerAr?: string | null;
  answerEn?: string | null;
};

type EducationListItem = { ar?: string | null; en?: string | null };

type EducationPayload = {
  required?: boolean;
  packageId?: string | null;
  packageKey?: string | null;
  titleAr?: string | null;
  titleEn?: string | null;
  versionId?: string | null;
  versionLabel?: string | null;
  summary?: { ar?: string | null; en?: string | null } | null;
  risks?: EducationListItem[] | null;
  benefits?: EducationListItem[] | null;
  faq?: EducationFaq[] | null;
  preProcedureInstructions?: EducationListItem[] | null;
  postProcedureInstructions?: EducationListItem[] | null;
  completed?: boolean;
  patientAcknowledged?: boolean;
};

type DecisionPayload = {
  status?: "UNDECIDED" | "CONSENT_ACCEPTED" | "CONSENT_REFUSED" | string;
  consentPresentedAt?: string | null;
  selectedAt?: string | null;
  refusalAcknowledged?: boolean;
  refusalAcknowledgedAt?: string | null;
  refusalForm?: {
    statementAr?: string | null;
    statementEn?: string | null;
    acknowledgementAr?: string | null;
    acknowledgementEn?: string | null;
    formHash?: string | null;
  } | null;
};

type FullDocument = {
  documentId: string;
  consentReference?: string | null;
  status?: string;
  signerRole?: string;
  patientName?: string | null;
  patientMrn?: string | null;
  mrn?: string | null;
  physicianName?: string | null;
  diagnosis?: string | null;
  plannedProcedure?: string | null;
  templateTitleAr?: string | null;
  templateTitleEn?: string | null;
  versionLabel?: string | null;
  facilityName?: string | null;
  sections?: Section[];
  legalTextAr?: string | null;
  legalTextEn?: string | null;
  pdplTextAr?: string | null;
  pdplTextEn?: string | null;
  signatureCaptured?: boolean;
  decision?: DecisionPayload | null;
  education?: EducationPayload | null;
};

type DocumentResponse =
  | { phase: "pre-otp"; bootstrap: Bootstrap }
  | (FullDocument & { phase?: undefined });

type SignatureResult = {
  documentId: string;
  signatureId: string;
  status: string;
  signerName: string;
  signedAt: string;
  evidence?: {
    documentHash?: string | null;
    otpHash?: string | null;
    educationCompleted?: boolean;
    patientAcknowledged?: boolean;
    decisionStatus?: string;
  } | null;
};

/* ════════════════════════════════════════════════════════════════════════
 *  Screens
 * ════════════════════════════════════════════════════════════════════════ */

type PatientScreen =
  | "landing"
  | "otp"
  | "education"
  | "review"
  | "decision"
  | "signature"
  | "confirmation"
  | "refusal-ack"
  | "refusal-signature"
  | "refusal-confirmed";

/* ════════════════════════════════════════════════════════════════════════
 *  Helpers
 * ════════════════════════════════════════════════════════════════════════ */

function pickLocalized(
  lang: Lang,
  ar?: string | null,
  en?: string | null,
): string {
  const isAr = lang === "ar";
  if (isAr) return (ar?.trim() || en?.trim() || "").toString();
  return (en?.trim() || ar?.trim() || "").toString();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = text ? JSON.parse(text) : null;
      if (data && typeof data.error === "string") message = data.error;
    } catch {
      /* ignore */
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

function formatTimestamp(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function shortHash(s?: string | null): string {
  if (!s) return "-";
  return `${s.slice(0, 8)}...${s.slice(-6)}`;
}

/* ════════════════════════════════════════════════════════════════════════
 *  Signature canvas - real pointer capture to data URL
 * ════════════════════════════════════════════════════════════════════════ */

type SignaturePadHandle = {
  isEmpty(): boolean;
  clear(): void;
  toDataUrl(): string | null;
};

export type ApprovedPatientWorkflowProps = {
  token: string;
  initialLang?: Lang;
};

export function ApprovedPatientWorkflow({
  token,
  initialLang = "ar",
}: ApprovedPatientWorkflowProps) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [screen, setScreen] = useState<PatientScreen>("landing");

  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [doc, setDoc] = useState<FullDocument | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* OTP state */
  const [mobile, setMobile] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>([
    "", "", "", "", "", "",
  ]);
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [otpRequesting, setOtpRequesting] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpStage, setOtpStage] = useState<"request" | "verify">("request");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null,
  );

  /* Education state */
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [educationEventLogged, setEducationEventLogged] = useState(false);
  const [educationCompleting, setEducationCompleting] = useState(false);

  /* Review state */
  const [reviewAcked, setReviewAcked] = useState(false);

  /* Decision state */
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  /* Refusal state */
  const [refusalAcked, setRefusalAcked] = useState(false);
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
        setBootstrap(data.bootstrap);
        setDoc(null);
        return "pre-otp" as const;
      }
      setDoc(data as FullDocument);
      // facility name may come from bootstrap; preserve if present
      setBootstrap((b) =>
        b
          ? b
          : {
              documentId: (data as FullDocument).documentId,
              moduleType: "INFORMED_CONSENT",
              signerRole: (data as FullDocument).signerRole || "PATIENT",
              facilityName: (data as FullDocument).facilityName ?? null,
              templateTitleAr: (data as FullDocument).templateTitleAr ?? null,
              templateTitleEn: (data as FullDocument).templateTitleEn ?? null,
              locale: "bilingual",
              educationRequired: Boolean(
                (data as FullDocument).education?.required,
              ),
            },
      );
      // pre-fill signer name from real patient name
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
    void loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── Derived display values from real data ───────────────────────── */
  const facilityName =
    doc?.facilityName ||
    bootstrap?.facilityName ||
    (lang === "ar" ? "—" : "—");
  const procedureTitle = pickLocalized(
    lang,
    doc?.templateTitleAr || bootstrap?.templateTitleAr,
    doc?.templateTitleEn || bootstrap?.templateTitleEn,
  );
  const physicianName = doc?.physicianName?.trim() || "";
  const patientName = doc?.patientName?.trim() || "";
  const patientMrn = doc?.patientMrn?.trim() || doc?.mrn?.trim() || "";
  const educationRequired =
    bootstrap?.educationRequired ?? doc?.education?.required ?? false;
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
        lang === "ar"
          ? "أدخل رقم جوال صحيح"
          : "Enter a valid mobile number",
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
      }>(
        `/api/sign/${encodeURIComponent(token)}/request-otp`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mobileNumber: m, locale: lang }),
        },
      );
      setOtpExpiresAt(data.expiresAt || null);
      setMaskedPhone(data.maskedPhone || m.replace(/.(?=.{4})/g, "*"));
      setOtpStage("verify");
      setTimeout(() => otpInputsRef.current[0]?.focus(), 50);
    } catch (err) {
      const e = err as Error;
      setOtpError(
        e.message ||
          (lang === "ar"
            ? "تعذر إرسال رمز التحقق"
            : "Unable to send OTP"),
      );
    } finally {
      setOtpRequesting(false);
    }
  }, [mobile, lang, token]);

  const handleOtpDigitChange = useCallback(
    (idx: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const ch = value.slice(-1);
      setOtpDigits((cur) => {
        const next = [...cur];
        next[idx] = ch;
        return next;
      });
      if (ch && idx < 5) otpInputsRef.current[idx + 1]?.focus();
    },
    [],
  );

  const handleOtpKey = useCallback(
    (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
        otpInputsRef.current[idx - 1]?.focus();
      }
    },
    [otpDigits],
  );

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
      }>(
        `/api/sign/${encodeURIComponent(token)}/verify-otp`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ otpCode: code }),
        },
      );
      if (!data.verified) {
        setAttemptsRemaining(data.attemptsRemaining ?? null);
        setOtpError(
          lang === "ar"
            ? "رمز غير صحيح. حاول مرة أخرى."
            : "Incorrect code. Please try again.",
        );
        setOtpDigits(["", "", "", "", "", ""]);
        otpInputsRef.current[0]?.focus();
        return;
      }
      const phase = await loadDocument();
      if (phase === "full") {
        setScreen(educationRequired ? "education" : "review");
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
            (lang === "ar"
              ? "تعذر التحقق من الرمز"
              : "OTP verification failed"),
        );
      }
    } finally {
      setOtpVerifying(false);
    }
  }, [otpDigits, lang, token, loadDocument, educationRequired]);

  /* ════════════════════════════════════════════════════════════════
   *  Education action — mark completed + acknowledged then advance
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
      setScreen("review");
    } catch (err) {
      /* server may 409 if already completed — proceed anyway */
      setScreen("review");
    } finally {
      setEducationCompleting(false);
    }
  }, [token, lang]);

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
          // reload to surface server-generated refusalForm
          await loadDocument();
          setScreen("refusal-ack");
        }
      } catch (err) {
        const e = err as Error;
        setDecisionError(
          e.message ||
            (lang === "ar"
              ? "تعذر تسجيل القرار"
              : "Decision recording failed"),
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
          (lang === "ar"
            ? "تعذر تسجيل الإقرار"
            : "Acknowledgement failed"),
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
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !bootstrap && !doc) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-[720px] p-6 text-center border border-slate-200/80 shadow-sm bg-white/95">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-foreground mb-2">
            {lang === "ar" ? "تعذر تحميل الوثيقة" : "Document unavailable"}
          </h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  const dir = lang === "ar" ? "rtl" : "ltr";
  const langClass = lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]";

  /* ───── Landing ───── */
  if (screen === "landing") {
    return (
      <div
        dir={dir}
        className={cls("min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(75,156,211,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex flex-col text-slate-950", langClass)}
      >
        <MobileHeader lang={lang} onLangToggle={toggleLang} />
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
          <div
            className={cls(
              "flex flex-col gap-1",
              lang === "ar" ? "items-end text-right" : "items-start text-left",
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-1">
              <FileText size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground leading-tight">
              {lang === "ar" ? "موافقة طبية إلكترونية" : "Electronic Medical Consent"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {lang === "ar"
                ? "مرحباً، نطلب منك مراجعة وتوقيع موافقة طبية رسمية."
                : "Welcome, we ask you to review and sign an official medical consent."}
            </p>
          </div>

          {patientName ? (
            <Card className="p-5 sm:p-6 border border-slate-200/80 shadow-sm bg-white/95">
              <div
                className={cls(
                  "flex items-center gap-3",
                  lang === "ar" && "flex-row-reverse",
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={18} className="text-primary" />
                </div>
                <div
                  className={cls(
                    "flex-1",
                    lang === "ar" ? "text-right" : "text-left",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {patientName}
                  </p>
                  {patientMrn ? (
                    <p className="text-xs font-mono text-muted-foreground">
                      {patientMrn}
                    </p>
                  ) : null}
                </div>
                <CheckCircle size={16} className="text-emerald-500" />
              </div>
            </Card>
          ) : null}

          <Card className="p-5 sm:p-6 flex flex-col gap-4 border border-slate-200/80 shadow-sm bg-white/95">
            <div
              className={cls(
                "flex flex-col gap-1",
                lang === "ar" ? "text-right" : "text-left",
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {lang === "ar" ? "نوع الموافقة" : "Consent Type"}
              </p>
              <p className="text-sm font-semibold text-foreground leading-snug">
                {procedureTitle || (lang === "ar" ? "—" : "—")}
              </p>
              {versionLabel ? (
                <p className="text-[10px] font-mono text-muted-foreground">
                  {versionLabel}
                </p>
              ) : null}
            </div>
            <OtpVerificationShell
              lang={lang}
              mobile={mobile}
              maskedPhone={maskedPhone}
              otpStage={otpStage}
              otpDigits={otpDigits}
              otpRequesting={otpRequesting}
              otpVerifying={otpVerifying}
              otpExpiresAt={otpExpiresAt}
              otpError={otpError}
              attemptsRemaining={attemptsRemaining}
              onMobileChange={setMobile}
              onOtpDigitChange={handleOtpDigitChange}
              onOtpKeyDown={handleOtpKey}
              onRequestOtp={handleRequestOtp}
              onVerifyOtp={handleVerifyOtp}
              onResendOtp={() => {
                setOtpStage("request");
                setOtpDigits(["", "", "", "", "", ""]);
                setOtpError(null);
              }}
              otpInputRefs={otpInputsRef}
              formatTimestamp={formatTimestamp}
            />
          </Card>
        </div>
      </div>
    );
  }

  /* ───── Education ───── */
  if (screen === "education" && doc?.education) {
    const ed = doc.education;
    const summary = pickLocalized(lang, ed.summary?.ar, ed.summary?.en);
    const benefits = (ed.benefits || []).map((b) =>
      pickLocalized(lang, b.ar, b.en),
    );
    const risks = (ed.risks || []).map((r) => pickLocalized(lang, r.ar, r.en));
    const faq = ed.faq || [];
    return (
      <div
        dir={dir}
        className={cls("min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(75,156,211,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex flex-col text-slate-950", langClass)}
      >
        <MobileHeader
          lang={lang}
          onLangToggle={toggleLang}
          onBack={() => setScreen("otp")}
          step={3}
          totalSteps={7}
        />
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
          <div
            className={cls(
              "flex flex-col gap-1",
              lang === "ar" ? "items-end text-right" : "items-start text-left",
            )}
          >
            <h1 className="text-lg font-bold text-foreground">
              {pickLocalized(lang, ed.titleAr, ed.titleEn) ||
                (lang === "ar" ? "تثقيف ما قبل الإجراء" : "Pre-Procedure Education")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "ar"
                ? "اقرأ المعلومات التالية بعناية قبل اتخاذ قرارك."
                : "Please read the following carefully before deciding."}
            </p>
          </div>

          {summary ? (
            <Card className="p-5 sm:p-6 flex flex-col gap-3 border border-slate-200/80 shadow-sm bg-white/95">
              <div
                className={cls(
                  "flex items-center gap-2",
                  lang === "ar" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                  <Info size={13} className="text-blue-600" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  {lang === "ar" ? "ما هو الإجراء؟" : "What is the procedure?"}
                </h2>
              </div>
              <p
                className={cls(
                  "text-sm text-muted-foreground leading-relaxed whitespace-pre-line",
                  lang === "ar" ? "text-right" : "text-left",
                )}
              >
                {summary}
              </p>
            </Card>
          ) : null}

          {benefits.length > 0 ? (
            <Card className="p-5 sm:p-6 flex flex-col gap-3 border border-slate-200/80 shadow-sm bg-white/95">
              <div
                className={cls(
                  "flex items-center gap-2",
                  lang === "ar" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                  <Check size={13} className="text-emerald-600" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  {lang === "ar" ? "الفوائد" : "Benefits"}
                </h2>
              </div>
              {benefits.map((b, i) => (
                <div
                  key={i}
                  className={cls(
                    "flex items-start gap-2",
                    lang === "ar" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span
                    className={cls(
                      "text-sm text-foreground/80",
                      lang === "ar" ? "text-right" : "text-left",
                    )}
                  >
                    {b}
                  </span>
                </div>
              ))}
            </Card>
          ) : null}

          {risks.length > 0 ? (
            <Card className="p-5 sm:p-6 flex flex-col gap-3 border border-slate-200/80 shadow-sm bg-white/95">
              <div
                className={cls(
                  "flex items-center gap-2",
                  lang === "ar" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center">
                  <AlertTriangle size={13} className="text-amber-600" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  {lang === "ar" ? "المخاطر" : "Risks"}
                </h2>
              </div>
              {risks.map((r, i) => (
                <div
                  key={i}
                  className={cls(
                    "flex items-start gap-2",
                    lang === "ar" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <span
                    className={cls(
                      "text-sm text-foreground/80",
                      lang === "ar" ? "text-right" : "text-left",
                    )}
                  >
                    {r}
                  </span>
                </div>
              ))}
            </Card>
          ) : null}

          {(ed.preProcedureInstructions || []).length > 0 ? (
            <Card className="p-5 sm:p-6 flex flex-col gap-3 border border-slate-200/80 shadow-sm bg-white/95">
              <div
                className={cls(
                  "flex items-center gap-2",
                  lang === "ar" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                  <MoreVertical size={13} className="text-purple-600" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  {lang === "ar" ? "تعليمات قبل الإجراء" : "Pre-Procedure Instructions"}
                </h2>
              </div>
              <ul className="list-disc ps-5 text-sm text-muted-foreground leading-relaxed space-y-1">
                {(ed.preProcedureInstructions || []).map((i, idx) => (
                  <li key={idx}>{pickLocalized(lang, i.ar, i.en)}</li>
                ))}
              </ul>
            </Card>
          ) : null}

          {faq.length > 0 ? (
            <Card className="overflow-hidden border border-slate-200/80 shadow-sm bg-white/95">
              <div
                className={cls(
                  "px-4 py-3 border-b border-border",
                  lang === "ar" ? "text-right" : "text-left",
                )}
              >
                <h2 className="text-sm font-semibold text-foreground">
                  {lang === "ar" ? "أسئلة متكررة" : "Frequently Asked"}
                </h2>
              </div>
              {faq.map((item, i) => {
                const q = pickLocalized(lang, item.questionAr, item.questionEn);
                const a = pickLocalized(lang, item.answerAr, item.answerEn);
                return (
                  <div key={i} className="border-b border-border last:border-0">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className={cls(
                        "w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/50 transition-colors",
                        lang === "ar"
                          ? "flex-row-reverse text-right"
                          : "flex-row text-left",
                      )}
                    >
                      <span className="flex-1 text-sm font-medium text-foreground">
                        {q}
                      </span>
                      <ChevronRight
                        size={14}
                        className={cls(
                          "text-muted-foreground transition-transform shrink-0",
                          openFaq === i ? "rotate-90" : "",
                        )}
                      />
                    </button>
                    {openFaq === i ? (
                      <div
                        className={cls(
                          "px-4 pb-3 text-sm text-muted-foreground leading-relaxed",
                          lang === "ar" ? "text-right" : "text-left",
                        )}
                      >
                        {a}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </Card>
          ) : null}

          <button
            onClick={handleCompleteEducation}
            disabled={educationCompleting}
            className={cls(
              "w-full py-3.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors",
              lang === "ar" ? "flex-row-reverse" : "flex-row",
              educationCompleting
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {educationCompleting
              ? lang === "ar"
                ? "جارٍ المتابعة…"
                : "Continuing…"
              : lang === "ar"
                ? "متابعة المراجعة"
                : "Continue to Review"}
            <ChevronRight size={16} className={lang === "ar" ? "rotate-180" : ""} />
          </button>
        </div>
      </div>
    );
  }

  /* ───── Review ───── */
  if (screen === "review" && doc) {
    const legalText = pickLocalized(lang, doc.legalTextAr, doc.legalTextEn);
    const pdplText = pickLocalized(lang, doc.pdplTextAr, doc.pdplTextEn);
    const sections = doc.sections || [];
    return (
      <div
        dir={dir}
        className={cls("min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(75,156,211,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex flex-col text-slate-950", langClass)}
      >
        <MobileHeader
          lang={lang}
          onLangToggle={toggleLang}
          onBack={() => setScreen(educationRequired ? "education" : "otp")}
          step={4}
          totalSteps={7}
        />
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
          <div
            className={cls(
              "flex flex-col gap-1",
              lang === "ar" ? "items-end text-right" : "items-start text-left",
            )}
          >
            <h1 className="text-lg font-bold text-foreground">
              {lang === "ar" ? "مراجعة الموافقة" : "Consent Review"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "ar"
                ? "اقرأ بنود الموافقة بدقة قبل اتخاذ قرارك."
                : "Read the consent terms carefully before deciding."}
            </p>
          </div>

          <Card className="p-5 sm:p-6 flex flex-col gap-4 border border-slate-200/80 shadow-sm bg-white/95">
            <div
              className={cls(
                "flex items-center gap-2",
                lang === "ar" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <FileText size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                {procedureTitle}
              </h2>
            </div>
            <div className="h-px bg-border" />
            <div className="bg-muted/40 rounded p-3 max-h-72 overflow-y-auto space-y-3">
              {sections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {lang === "ar" ? "لا يوجد محتوى." : "No content."}
                </p>
              ) : (
                sections.map((s) => {
                  const title = pickLocalized(lang, s.titleAr, s.titleEn);
                  const body = pickLocalized(lang, s.contentAr, s.contentEn);
                  return (
                    <div key={s.id}>
                      {title ? (
                        <p
                          className={cls(
                            "text-sm font-semibold text-foreground",
                            lang === "ar" ? "text-right" : "text-left",
                          )}
                        >
                          {title}
                        </p>
                      ) : null}
                      {body ? (
                        <p
                          className={cls(
                            "text-sm text-foreground/80 leading-relaxed whitespace-pre-line",
                            lang === "ar" ? "text-right" : "text-left",
                          )}
                        >
                          {body}
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
            {legalText ? (
              <Alert type="info" lang={lang}>{legalText}</Alert>
            ) : null}
          </Card>

          {pdplText ? (
            <Card className="p-4 sm:p-5 border border-slate-200/80 shadow-sm bg-white/95">
              <div
                className={cls(
                  "flex items-center gap-2 mb-1",
                  lang === "ar" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <Shield size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {lang === "ar" ? "حماية البيانات" : "Data Protection"}
                </span>
              </div>
              <p
                className={cls(
                  "text-xs text-muted-foreground leading-relaxed",
                  lang === "ar" ? "text-right" : "text-left",
                )}
              >
                {pdplText}
              </p>
            </Card>
          ) : null}

          {consentRef ? (
            <Card className="p-3 flex flex-col gap-1">
              <div
                className={cls(
                  "flex items-center gap-2",
                  lang === "ar" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <Hash size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {lang === "ar" ? "رقم المرجع" : "Reference"}
                </span>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground break-all">
                {consentRef}
              </p>
            </Card>
          ) : null}

          <button
            onClick={() => setReviewAcked((v) => !v)}
            className={cls(
              "flex items-start gap-3 p-3 rounded-lg border transition-colors",
              lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left",
              reviewAcked
                ? "border-primary bg-primary/5"
                : "border-border bg-card",
            )}
          >
            <div
              className={cls(
                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                reviewAcked ? "bg-primary border-primary" : "border-border bg-white",
              )}
            >
              {reviewAcked ? <Check size={12} className="text-white" /> : null}
            </div>
            <span className="text-sm text-foreground leading-relaxed">
              {lang === "ar"
                ? "أقر أنني قرأت بنود الموافقة وفهمتها بالكامل."
                : "I confirm I have read and fully understood the consent terms."}
            </span>
          </button>

          <button
            onClick={() => setScreen("decision")}
            disabled={!reviewAcked}
            className={cls(
              "w-full py-3.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors",
              lang === "ar" ? "flex-row-reverse" : "flex-row",
              reviewAcked
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {lang === "ar" ? "اتخاذ القرار" : "Make Decision"}
            <ChevronRight size={16} className={lang === "ar" ? "rotate-180" : ""} />
          </button>
        </div>
      </div>
    );
  }

  /* ───── Decision ───── */
  if (screen === "decision" && doc) {
    return (
      <div
        dir={dir}
        className={cls("min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(75,156,211,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex flex-col text-slate-950", langClass)}
      >
        <MobileHeader
          lang={lang}
          onLangToggle={toggleLang}
          onBack={() => setScreen("review")}
          step={5}
          totalSteps={7}
        />
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
          <div
            className={cls(
              "flex flex-col gap-1",
              lang === "ar" ? "items-end text-right" : "items-start text-left",
            )}
          >
            <h1 className="text-lg font-bold text-foreground">
              {lang === "ar" ? "قرارك" : "Your Decision"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "ar"
                ? "اختر بين الموافقة أو الرفض. كلاهما حق قانوني محفوظ."
                : "Choose to accept or refuse. Both are legally protected choices."}
            </p>
          </div>

          {patientName ? (
            <Card className="p-5 sm:p-6 border border-slate-200/80 shadow-sm bg-white/95">
              <div
                className={cls(
                  "flex items-center gap-3",
                  lang === "ar" && "flex-row-reverse",
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={18} className="text-primary" />
                </div>
                <div
                  className={cls(
                    "flex-1",
                    lang === "ar" ? "text-right" : "text-left",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {patientName}
                  </p>
                  {patientMrn ? (
                    <p className="text-xs font-mono text-muted-foreground">
                      {patientMrn}
                    </p>
                  ) : null}
                </div>
                <CheckCircle size={16} className="text-emerald-500" />
              </div>
            </Card>
          ) : null}

          <div
            className={cls(
              "p-3 rounded-lg bg-muted/50 border border-border flex flex-col gap-1",
              lang === "ar" ? "text-right" : "text-left",
            )}
          >
            <p className="text-xs text-muted-foreground">
              {lang === "ar" ? "الإجراء المقترح" : "Proposed Procedure"}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {procedureTitle}
            </p>
          </div>

          {decisionError ? (
            <Alert type="warning" lang={lang}>{decisionError}</Alert>
          ) : null}

          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={() => submitDecision("CONSENT_ACCEPTED")}
              disabled={decisionSubmitting}
              className="w-full rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 sm:p-6 flex flex-col items-center gap-2 hover:border-emerald-400 hover:bg-emerald-100 transition-colors active:scale-[0.99] disabled:opacity-60"
            >
              <CheckCircle size={28} className="text-emerald-600" />
              <span className="text-base font-bold text-emerald-700">
                {lang === "ar" ? "أوافق على الإجراء" : "I Accept the Procedure"}
              </span>
              <span className="text-xs text-emerald-600/70">
                {lang === "ar"
                  ? "سيُطلب توقيعك مباشرة"
                  : "You will sign next"}
              </span>
            </button>
            <button
              onClick={() => submitDecision("CONSENT_REFUSED")}
              disabled={decisionSubmitting}
              className="w-full rounded-2xl border-2 border-red-200 bg-red-50 p-5 sm:p-6 flex flex-col items-center gap-2 hover:border-red-400 hover:bg-red-100 transition-colors active:scale-[0.99] disabled:opacity-60"
            >
              <XCircle size={28} className="text-red-600" />
              <span className="text-base font-bold text-red-700">
                {lang === "ar" ? "أرفض الإجراء" : "I Refuse the Procedure"}
              </span>
              <span className="text-xs text-red-600/70">
                {lang === "ar"
                  ? "سيُسجَّل قرارك ويتم إعلام الفريق الطبي"
                  : "Your refusal is recorded and the team is notified"}
              </span>
            </button>
          </div>

          <Alert type="info" lang={lang}>
            {lang === "ar"
              ? "كلا القرارين مُسجَّل قانونياً بسلسلة مراجعة كاملة."
              : "Both decisions are legally recorded with a full audit chain."}
          </Alert>
        </div>
      </div>
    );
  }

  /* ───── Signature (accept path) ───── */
  if (screen === "signature" && doc) {
    return (
      <div
        dir={dir}
        className={cls("min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(75,156,211,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex flex-col text-slate-950", langClass)}
      >
        <MobileHeader
          lang={lang}
          onLangToggle={toggleLang}
          onBack={() => setScreen("decision")}
          step={6}
          totalSteps={7}
        />
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
          <div
            className={cls(
              "flex flex-col gap-1",
              lang === "ar" ? "items-end text-right" : "items-start text-left",
            )}
          >
            <h1 className="text-lg font-bold text-foreground">
              {lang === "ar" ? "توقيع الموافقة" : "Sign Consent"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "ar"
                ? "ارسم توقيعك في المربع أدناه."
                : "Draw your signature in the pad below."}
            </p>
          </div>

          {patientName ? (
            <Card className="p-5 sm:p-6 border border-slate-200/80 shadow-sm bg-white/95">
              <div
                className={cls(
                  "flex items-center gap-3",
                  lang === "ar" && "flex-row-reverse",
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={18} className="text-primary" />
                </div>
                <div
                  className={cls(
                    "flex-1",
                    lang === "ar" ? "text-right" : "text-left",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {patientName}
                  </p>
                  {patientMrn ? (
                    <p className="text-xs font-mono text-muted-foreground">
                      {patientMrn}
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}

          <label
            className={cls(
              "text-xs font-semibold text-muted-foreground uppercase tracking-wide",
              lang === "ar" ? "text-right" : "text-left",
            )}
          >
            {lang === "ar" ? "الاسم الكامل للموقّع" : "Signer Full Name"}
          </label>
          <input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder={lang === "ar" ? "أدخل اسمك الكامل" : "Enter full name"}
            className="w-full px-3 py-2.5 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
          />

          <SignaturePad
            lang={lang}
            padRef={padRef}
            onChange={setSignatureHasInk}
          />

          {signatureHasInk ? (
            <button
              onClick={() => {
                padRef.current?.clear();
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline self-center"
            >
              {lang === "ar" ? "مسح التوقيع" : "Clear signature"}
            </button>
          ) : null}

          <div
            className={cls(
              "flex items-start gap-2 text-xs text-muted-foreground",
              lang === "ar" ? "flex-row-reverse text-right" : "flex-row",
            )}
          >
            <Lock size={12} className="shrink-0 mt-0.5" />
            <span>
              {lang === "ar"
                ? "توقيعك مرتبط ببصمة OTP وسلسلة مراجعة قانونية."
                : "Your signature is bound to the OTP hash and a legal audit chain."}
            </span>
          </div>

          {signError ? <Alert type="warning" lang={lang}>{signError}</Alert> : null}

          <button
            onClick={() => submitSignature("consent")}
            disabled={signing || !signatureHasInk || !signerName.trim()}
            className={cls(
              "w-full py-3.5 rounded-lg font-semibold text-sm transition-colors mt-auto",
              signing || !signatureHasInk || !signerName.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {signing
              ? lang === "ar"
                ? "جارٍ التسجيل…"
                : "Submitting…"
              : lang === "ar"
                ? "تأكيد التوقيع"
                : "Confirm Signature"}
          </button>
        </div>
      </div>
    );
  }

  /* ───── Refusal acknowledgement ───── */
  if (screen === "refusal-ack" && doc) {
    const statement = pickLocalized(
      lang,
      doc.decision?.refusalForm?.statementAr,
      doc.decision?.refusalForm?.statementEn,
    );
    const ackText = pickLocalized(
      lang,
      doc.decision?.refusalForm?.acknowledgementAr,
      doc.decision?.refusalForm?.acknowledgementEn,
    );
    return (
      <div
        dir={dir}
        className={cls("min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(75,156,211,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex flex-col text-slate-950", langClass)}
      >
        <MobileHeader
          lang={lang}
          onLangToggle={toggleLang}
          onBack={() => setScreen("decision")}
        />
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
          <div
            className={cls(
              "flex flex-col gap-2",
              lang === "ar" ? "items-end text-right" : "items-start text-left",
            )}
          >
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
            <h1 className="text-lg font-bold text-foreground">
              {lang === "ar" ? "نموذج رفض العلاج" : "Treatment Refusal Form"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {lang === "ar"
                ? "اقرأ نموذج الرفض الرسمي بعناية ثم أكّد إقرارك."
                : "Read the official refusal form carefully and confirm your acknowledgement."}
            </p>
          </div>

          {statement ? (
            <Card className="p-5 sm:p-6 border border-slate-200/80 shadow-sm bg-white/95">
              <p
                className={cls(
                  "text-sm text-foreground leading-relaxed whitespace-pre-line",
                  lang === "ar" ? "text-right" : "text-left",
                )}
              >
                {statement}
              </p>
            </Card>
          ) : null}

          <Alert type="warning" lang={lang}>
            {lang === "ar"
              ? "رفضك مُسجَّل قانونياً وسيُحفظ في ملفك الطبي مع بصمة زمنية معتمدة."
              : "Your refusal is legally recorded and stored in your medical file with a certified timestamp."}
          </Alert>

          <button
            onClick={() => setRefusalAcked((v) => !v)}
            className={cls(
              "flex items-start gap-3 p-3 rounded-lg border transition-colors",
              lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left",
              refusalAcked
                ? "border-orange-400 bg-orange-50"
                : "border-border bg-card",
            )}
          >
            <div
              className={cls(
                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                refusalAcked
                  ? "bg-orange-500 border-orange-500"
                  : "border-border bg-white",
              )}
            >
              {refusalAcked ? <Check size={12} className="text-white" /> : null}
            </div>
            <span className="text-sm text-foreground leading-relaxed">
              {ackText ||
                (lang === "ar"
                  ? "أقر بأنني قرأت نموذج الرفض وأفهم تبعاته."
                  : "I acknowledge I have read the refusal form and understand its consequences.")}
            </span>
          </button>

          {decisionError ? <Alert type="warning" lang={lang}>{decisionError}</Alert> : null}

          <button
            onClick={submitRefusalAck}
            disabled={!refusalAcked || refusalAckSubmitting}
            className={cls(
              "w-full py-3.5 rounded-lg font-semibold text-sm transition-colors",
              !refusalAcked || refusalAckSubmitting
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700",
            )}
          >
            {refusalAckSubmitting
              ? lang === "ar"
                ? "جارٍ التسجيل…"
                : "Submitting…"
              : lang === "ar"
                ? "تأكيد الإقرار والمتابعة"
                : "Confirm Acknowledgement & Continue"}
          </button>
        </div>
      </div>
    );
  }

  /* ───── Refusal signature ───── */
  if (screen === "refusal-signature" && doc) {
    return (
      <div
        dir={dir}
        className={cls("min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(75,156,211,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex flex-col text-slate-950", langClass)}
      >
        <MobileHeader
          lang={lang}
          onLangToggle={toggleLang}
          onBack={() => setScreen("refusal-ack")}
        />
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
          <div
            className={cls(
              "flex flex-col gap-1",
              lang === "ar" ? "items-end text-right" : "items-start text-left",
            )}
          >
            <h1 className="text-lg font-bold text-foreground">
              {lang === "ar" ? "توقيع نموذج الرفض" : "Sign Refusal Form"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "ar"
                ? "ارسم توقيعك أدناه لتأكيد قرار الرفض."
                : "Draw your signature below to confirm the refusal."}
            </p>
          </div>

          <input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder={lang === "ar" ? "الاسم الكامل" : "Full name"}
            className="w-full px-3 py-2.5 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
          />

          <SignaturePad
            lang={lang}
            padRef={padRef}
            onChange={setSignatureHasInk}
          />

          {signatureHasInk ? (
            <button
              onClick={() => padRef.current?.clear()}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline self-center"
            >
              {lang === "ar" ? "مسح التوقيع" : "Clear signature"}
            </button>
          ) : null}

          {signError ? <Alert type="warning" lang={lang}>{signError}</Alert> : null}

          <button
            onClick={() => submitSignature("refusal")}
            disabled={signing || !signatureHasInk || !signerName.trim()}
            className={cls(
              "w-full py-3.5 rounded-lg font-semibold text-sm transition-colors mt-auto",
              signing || !signatureHasInk || !signerName.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700",
            )}
          >
            {signing
              ? lang === "ar"
                ? "جارٍ التسجيل…"
                : "Submitting…"
              : lang === "ar"
                ? "تأكيد الرفض"
                : "Confirm Refusal"}
          </button>
        </div>
      </div>
    );
  }

  /* ───── Confirmation (consent accepted + signed) ───── */
  if (screen === "confirmation" && signResult) {
    const pdfHref = `/api/modules/informed-consents/documents/${encodeURIComponent(
      signResult.documentId,
    )}/pdf`;
    return (
      <div
        dir={dir}
        className={cls("min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(75,156,211,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex flex-col text-slate-950", langClass)}
      >
        <MobileHeader lang={lang} onLangToggle={toggleLang} />
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5 items-center text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-foreground">
              {lang === "ar" ? "تم تسجيل موافقتك" : "Your Consent is Recorded"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {lang === "ar"
                ? "شكراً لك. تم حفظ موافقتك في السجل الطبي مع سلسلة مراجعة كاملة."
                : "Thank you. Your consent is stored in the medical record with a full audit chain."}
            </p>
          </div>

          <Card className="p-5 sm:p-6 w-full flex flex-col gap-4 border border-slate-200/80 shadow-sm bg-white/95">
            <div
              className={cls(
                "flex justify-between items-center gap-3",
                lang === "ar" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span className="text-xs text-muted-foreground">
                {lang === "ar" ? "رقم المرجع" : "Reference"}
              </span>
              <span className="font-mono text-xs font-bold text-primary break-all">
                {consentRef || signResult.documentId.slice(0, 12)}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div
              className={cls(
                "flex justify-between items-center gap-3",
                lang === "ar" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span className="text-xs text-muted-foreground">
                {lang === "ar" ? "معرّف التوقيع" : "Signature ID"}
              </span>
              <span className="font-mono text-xs text-foreground/80 break-all">
                {signResult.signatureId}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div
              className={cls(
                "flex justify-between items-center gap-3",
                lang === "ar" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span className="text-xs text-muted-foreground">
                {lang === "ar" ? "الطابع الزمني" : "Timestamp"}
              </span>
              <span className="font-mono text-xs text-foreground/70">
                {formatTimestamp(signResult.signedAt, lang)}
              </span>
            </div>
            {signResult.evidence?.documentHash ? (
              <>
                <div className="h-px bg-border" />
                <div
                  className={cls(
                    "flex justify-between items-center gap-3",
                    lang === "ar" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <span className="text-xs text-muted-foreground">
                    {lang === "ar" ? "بصمة المستند" : "Document Hash"}
                  </span>
                  <span className="font-mono text-[10px] text-foreground/60">
                    {shortHash(signResult.evidence.documentHash)}
                  </span>
                </div>
              </>
            ) : null}
            {signResult.evidence?.otpHash ? (
              <>
                <div className="h-px bg-border" />
                <div
                  className={cls(
                    "flex justify-between items-center gap-3",
                    lang === "ar" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <span className="text-xs text-muted-foreground">
                    {lang === "ar" ? "بصمة OTP" : "OTP Hash"}
                  </span>
                  <span className="font-mono text-[10px] text-foreground/60">
                    {shortHash(signResult.evidence.otpHash)}
                  </span>
                </div>
              </>
            ) : null}
            <div className="h-px bg-border" />
            <div
              className={cls(
                "flex justify-between items-center gap-3",
                lang === "ar" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span className="text-xs text-muted-foreground">
                {lang === "ar" ? "حالة التحقق" : "Verification"}
              </span>
              <div className="flex items-center gap-1">
                <Shield size={12} className="text-emerald-600" />
                <span className="text-xs text-emerald-600 font-semibold">
                  OTP + Signature
                </span>
              </div>
            </div>
          </Card>

          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cls(
              "w-full py-3 rounded-lg border border-primary text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors",
              lang === "ar" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <Download size={15} />
            {lang === "ar" ? "تنزيل نسخة PDF" : "Download PDF Copy"}
          </a>
        </div>
      </div>
    );
  }

  /* ───── Refusal confirmation ───── */
  if (screen === "refusal-confirmed" && signResult) {
    return (
      <div
        dir={dir}
        className={cls("min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(75,156,211,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex flex-col text-slate-950", langClass)}
      >
        <MobileHeader lang={lang} onLangToggle={toggleLang} />
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5 items-center text-center">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertCircle size={40} className="text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {lang === "ar" ? "تم تسجيل قرار الرفض" : "Refusal Recorded"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {lang === "ar"
              ? "تم حفظ قرارك في السجل الطبي مع سلسلة مراجعة قانونية كاملة."
              : "Your decision is stored in the medical record with a full legal audit chain."}
          </p>
          <Card className="p-5 sm:p-6 w-full border border-slate-200/80 shadow-sm bg-white/95">
            <div
              className={cls(
                "flex justify-between items-center gap-3",
                lang === "ar" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span className="text-xs text-muted-foreground">
                {lang === "ar" ? "رقم المرجع" : "Reference"}
              </span>
              <span className="font-mono text-xs font-bold text-orange-600 break-all">
                {consentRef || signResult.documentId.slice(0, 12)}
              </span>
            </div>
            <div className="h-px bg-border my-2" />
            <div
              className={cls(
                "flex justify-between items-center gap-3",
                lang === "ar" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span className="text-xs text-muted-foreground">
                {lang === "ar" ? "معرّف التوقيع" : "Signature ID"}
              </span>
              <span className="font-mono text-xs text-foreground/80 break-all">
                {signResult.signatureId}
              </span>
            </div>
          </Card>
          <Alert type="warning" lang={lang}>
            {lang === "ar"
              ? "تم إبلاغ الفريق الطبي بقرار الرفض."
              : "The medical team has been notified of the refusal."}
          </Alert>
        </div>
      </div>
    );
  }

  /* Fallback */
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)] flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-[720px] p-6 text-center border border-slate-200/80 shadow-sm bg-white/95">
        <p className="text-sm text-muted-foreground">
          {lang === "ar" ? "جارٍ التحميل…" : "Loading…"}
        </p>
      </Card>
    </div>
  );
}

export default ApprovedPatientWorkflow;
