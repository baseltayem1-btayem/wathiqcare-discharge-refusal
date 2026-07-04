/**
 * Approved Healthcare Consent Platform Design — Shared Primitives
 *
 * Ported verbatim from design/figma/wathiqcare-v1.1/src/app/App.tsx
 * (the approved Figma design). Mock identity strings (patient name, MRN,
 * physician, reference number) have been removed — every consumer must pass
 * real WathiqCare data via props.
 */
"use client";

import type { ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Globe,
  Shield,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";

export type Lang = "ar" | "en";

export function cls(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

/* ─── Bilingual labels (NO mock identity strings) ───────────────────────── */
export const T = {
  ar: {
    platformName: "وثيق كير",
    patientTitle: "بوابة المريض",
    physicianTitle: "محطة الطبيب",
    legalTitle: "لوحة الامتثال القانوني",
    language: "EN",
    secureNotice: "اتصال آمن ومشفر",
    journeySteps: [
      "مراجعة الطلب",
      "التحقق",
      "التثقيف",
      "الإقرار",
      "التوقيع",
    ],
    // Patient flow
    welcome: "مرحبًا بك",
    landingSubtitle: "منصة الموافقات الطبية المعتمدة",
    beginConsent: "ابدأ مراجعة الموافقة",
    education: "المعلومات التعليمية",
    consentReview: "مراجعة وثيقة الموافقة",
    consentHash: "بصمة المحتوى",
    acknowledge: "أُقر بأنني قرأت الوثيقة وفهمت محتواها",
    continue: "متابعة",
    back: "رجوع",
    decision: "قرار المريض",
    accept: "أوافق",
    refuse: "أرفض",
    acceptDesc: "الموافقة على الإجراء الطبي وفق الشروط الموضحة",
    refuseDesc: "رفض الإجراء بعد قراءة الإقرار القانوني",
    otpTitle: "تحقق برمز التحقق",
    otpDesc: "أدخل رمز التحقق المرسل إلى رقمك المسجل",
    sendCode: "إعادة إرسال الرمز",
    verify: "تحقق",
    signatureTitle: "ارسم توقيعك",
    signatureDesc: "ارسم توقيعك في المربع أدناه باستخدام إصبعك أو الفأرة",
    clearSignature: "مسح",
    confirmSignature: "اعتماد التوقيع",
    confirmationTitle: "تم توقيع الموافقة",
    confirmationSubtitle: "تم تسجيل قرارك وحفظه في سجل الأدلة",
    reference: "الرقم المرجعي",
    timestamp: "ختم زمني",
    done: "إنهاء",
    refusalAck: "إقرار بالرفض",
    refusalAckBody:
      "أُقر بأنني أرفض الإجراء بعد فهم العواقب المحتملة وتم إخطاري بالبدائل.",
    refusalConfirmed: "تم تسجيل الرفض",
    // Physician flow
    physicianFlow: "محطة الطبيب",
    selectConsentType: "اختر نوع الموافقة",
    consentSurgery: "موافقة جراحية",
    consentAnesthesia: "موافقة تخدير",
    consentInvasive: "موافقة إجراء تداخلي",
    comingSoon: "قريباً",
    patientLookup: "بحث المريض",
    mrnLabel: "رقم الملف الطبي (MRN)",
    searchBtn: "بحث",
    sendConsent: "إرسال طلب الموافقة",
    dispatchConsent: "إرسال الموافقة",
    statusTracker: "متابعة الحالة",
    completedStatus: "موقَّعة",
    pendingStatus: "بانتظار التوقيع",
    expiredStatus: "منتهية",
    // Legal flow
    legalFlow: "الامتثال القانوني",
    evidenceTitle: "حزمة الأدلة",
    auditChain: "سلسلة التدقيق",
    otpLog: "سجل رموز التحقق",
    pdfStatus: "حالة الـ PDF",
    refNum: "الرقم المرجعي",
    version: "الإصدار",
    verified: "آلية التحقق",
    generated: "تاريخ الإصدار",
    patientFlow: "رحلة المريض",
  },
  en: {
    platformName: "WathiqCare",
    patientTitle: "Patient Portal",
    physicianTitle: "Physician Workstation",
    legalTitle: "Legal Compliance Dashboard",
    language: "AR",
    secureNotice: "Encrypted secure connection",
    journeySteps: [
      "Review Request",
      "Verify",
      "Education",
      "Acknowledge",
      "Sign",
    ],
    welcome: "Welcome",
    landingSubtitle: "Verified medical consent platform",
    beginConsent: "Begin Consent Review",
    education: "Patient Education",
    consentReview: "Review Consent Document",
    consentHash: "Content Hash",
    acknowledge: "I acknowledge I have read and understood the document",
    continue: "Continue",
    back: "Back",
    decision: "Patient Decision",
    accept: "Accept",
    refuse: "Refuse",
    acceptDesc: "Consent to the procedure under the stated terms",
    refuseDesc: "Refuse the procedure after reviewing the legal acknowledgement",
    otpTitle: "Verify with OTP",
    otpDesc: "Enter the verification code sent to your registered phone",
    sendCode: "Resend code",
    verify: "Verify",
    signatureTitle: "Draw your signature",
    signatureDesc: "Draw your signature in the box below using your finger or mouse",
    clearSignature: "Clear",
    confirmSignature: "Confirm Signature",
    confirmationTitle: "Consent Signed",
    confirmationSubtitle: "Your decision has been recorded in the evidence ledger",
    reference: "Reference",
    timestamp: "Timestamp",
    done: "Finish",
    refusalAck: "Refusal Acknowledgement",
    refusalAckBody:
      "I acknowledge that I am refusing this procedure after understanding the potential consequences and being informed of alternatives.",
    refusalConfirmed: "Refusal Recorded",
    physicianFlow: "Physician View",
    selectConsentType: "Select Consent Type",
    consentSurgery: "Surgical Consent",
    consentAnesthesia: "Anesthesia Consent",
    consentInvasive: "Invasive Procedure Consent",
    comingSoon: "Coming soon",
    patientLookup: "Patient Lookup",
    mrnLabel: "Medical Record Number (MRN)",
    searchBtn: "Search",
    sendConsent: "Send Consent Request",
    dispatchConsent: "Dispatch Consent",
    statusTracker: "Status Tracker",
    completedStatus: "Signed",
    pendingStatus: "Pending Signature",
    expiredStatus: "Expired",
    legalFlow: "Legal Compliance",
    evidenceTitle: "Evidence Package",
    auditChain: "Audit Chain",
    otpLog: "OTP Log",
    pdfStatus: "PDF Status",
    refNum: "Reference",
    version: "Version",
    verified: "Verification",
    generated: "Generated",
    patientFlow: "Patient Journey",
  },
} as const;

/* ─── Card ──────────────────────────────────────────────────────────────── */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cls(
        "rounded-lg border border-border bg-card shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ─── Alert ─────────────────────────────────────────────────────────────── */
export function Alert({
  type,
  children,
  lang,
}: {
  type: "info" | "warning" | "success" | "error";
  children: ReactNode;
  lang: Lang;
}) {
  const styles: Record<string, string> = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div
      className={cls(
        "rounded border px-3 py-2.5 text-sm leading-relaxed",
        styles[type],
        lang === "ar" ? "text-right" : "text-left",
      )}
    >
      {children}
    </div>
  );
}

/* ─── Step Indicator ────────────────────────────────────────────────────── */
export function StepIndicator({
  step,
  total,
  lang,
}: {
  step: number;
  total: number;
  lang: Lang;
}) {
  const safeTotal = Math.max(total, 1);
  const safeStep = Math.max(1, Math.min(step, safeTotal));

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 shadow-sm">
      <div
        className={cls(
          "flex items-center gap-2",
          lang === "ar" && "flex-row-reverse",
        )}
      >
        <div className="flex gap-1.5">
          {Array.from({ length: safeTotal }).map((_, index) => (
            <div
              key={index}
              className={cls(
                "h-1.5 rounded-full transition-all",
                index < safeStep
                  ? "bg-primary w-6"
                  : index === safeStep - 1
                    ? "bg-primary w-8"
                    : "bg-border w-4",
              )}
            />
          ))}
        </div>
        <span className="text-xs font-mono tabular-nums text-muted-foreground">
          {lang === "ar"
            ? `${safeStep} من ${safeTotal}`
            : `Step ${safeStep} of ${safeTotal}`}
        </span>
      </div>
    </div>
  );
}

/* ─── Secure Notice Badge ───────────────────────────────────────────────── */
export function SecureNoticeBadge({ lang }: { lang: Lang }) {
  return (
    <div
      className={cls(
        "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 text-[11px] font-semibold",
        lang === "ar" && "flex-row-reverse",
      )}
    >
      <ShieldCheck size={12} />
      {T[lang].secureNotice}
    </div>
  );
}

/* ─── Mobile Header (patient flow) ──────────────────────────────────────── */
export function MobileHeader({
  lang,
  title,
  subtitle,
  onLangToggle,
  onBack,
}: {
  lang: Lang;
  title: string;
  subtitle?: string;
  onLangToggle?: () => void;
  onBack?: () => void;
}) {
  const isAr = lang === "ar";
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
      <div
        className={cls(
          "mx-auto flex max-w-3xl items-center justify-between gap-3",
          isAr && "flex-row-reverse",
        )}
      >
        <div
          className={cls(
            "flex items-center gap-2.5",
            isAr && "flex-row-reverse",
          )}
        >
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={isAr ? "رجوع" : "Back"}
              title={isAr ? "رجوع" : "Back"}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft size={14} className={isAr ? "rotate-180" : ""} />
            </button>
          ) : null}
          <div className="h-8 w-8 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Shield size={15} />
          </div>
          <div className={isAr ? "text-right" : "text-left"}>
            <p className="text-sm font-bold leading-none text-primary">
              {title}
            </p>
            {subtitle ? (
              <p className="text-[10px] text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {onLangToggle ? (
          <button
            type="button"
            onClick={onLangToggle}
            className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            <Globe size={12} />
            {T[lang].language}
          </button>
        ) : null}
      </div>
    </header>
  );
}

/* ─── Patient Identity Card (real data via props) ───────────────────────── */
export function PatientIdentityCard({
  lang,
  name,
  mrn,
  detailLine,
  physicianName,
  physicianRole,
}: {
  lang: Lang;
  name: string;
  mrn: string;
  detailLine?: string;
  physicianName?: string;
  physicianRole?: string;
}) {
  const isAr = lang === "ar";
  return (
    <Card className="p-4">
      <div
        className={cls(
          "flex items-center gap-3",
          isAr && "flex-row-reverse",
        )}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User size={18} className="text-primary" />
        </div>
        <div className={cls("flex-1", isAr ? "text-right" : "text-left")}>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {mrn}
            {detailLine ? ` · ${detailLine}` : ""}
          </p>
        </div>
        <CheckCircle size={16} className="text-emerald-500" />
      </div>
      {physicianName ? (
        <div
          className={cls(
            "mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground",
            isAr && "flex-row-reverse",
          )}
        >
          <Stethoscope size={12} />
          <span>
            {physicianName}
            {physicianRole ? ` · ${physicianRole}` : ""}
          </span>
        </div>
      ) : null}
    </Card>
  );
}

/* ─── Flow Switcher (root bottom-center pill) ───────────────────────────── */
export type Flow = "patient" | "physician" | "legal";

export function FlowSwitcher({
  flow,
  setFlow,
  lang,
}: {
  flow: Flow;
  setFlow: (f: Flow) => void;
  lang: Lang;
}) {
  const t = T[lang];
  const flows: { id: Flow; label: string; icon: ReactNode }[] = [
    { id: "patient", label: t.patientFlow, icon: <User size={14} /> },
    {
      id: "physician",
      label: t.physicianFlow,
      icon: <Stethoscope size={14} />,
    },
    { id: "legal", label: t.legalFlow, icon: <Shield size={14} /> },
  ];

  return (
    <div
      className={cls(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-foreground/90 backdrop-blur p-1 rounded-full shadow-xl",
        lang === "ar" ? "flex-row-reverse" : "flex-row",
      )}
    >
      {flows.map((f) => (
        <button
          key={f.id}
          onClick={() => setFlow(f.id)}
          className={cls(
            "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all",
            lang === "ar" ? "flex-row-reverse" : "flex-row",
            flow === f.id
              ? "bg-white text-foreground shadow"
              : "text-white/70 hover:text-white",
          )}
        >
          {f.icon}
          <span className="hidden sm:inline">{f.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── Desktop Header (physician + legal) ────────────────────────────────── */
export function DesktopHeader({
  lang,
  onLangToggle,
  subtitle,
  user,
  showLogout,
  onLogout,
  Icon = Stethoscope,
}: {
  lang: Lang;
  onLangToggle?: () => void;
  subtitle: string;
  user?: { name: string; role?: string };
  showLogout?: boolean;
  onLogout?: () => void;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const t = T[lang];
  const isAr = lang === "ar";
  return (
    <header className="bg-card border-b border-border px-6 py-3 sticky top-0 z-10">
      <div
        className={cls(
          "flex items-center justify-between max-w-5xl mx-auto",
          isAr ? "flex-row-reverse" : "flex-row",
        )}
      >
        <div
          className={cls(
            "flex items-center gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Icon size={16} className="text-white" />
          </div>
          <div className={isAr ? "text-right" : "text-left"}>
            <p className="text-sm font-bold text-primary leading-none">
              {t.platformName}
            </p>
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div
          className={cls(
            "flex items-center gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          {user ? (
            <div
              className={cls(
                "flex items-center gap-2",
                isAr ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={14} className="text-primary" />
              </div>
              <div className={isAr ? "text-right" : "text-left"}>
                <p className="text-xs font-semibold text-foreground">
                  {user.name}
                </p>
                {user.role ? (
                  <p className="text-[10px] text-muted-foreground">
                    {user.role}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {onLangToggle ? (
            <button
              onClick={onLangToggle}
              className="flex items-center gap-1 px-2 py-1 rounded border border-border text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <Globe size={12} />
              {t.language}
            </button>
          ) : null}
          {showLogout && onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
              aria-label="Logout"
            >
              <Shield size={15} />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
