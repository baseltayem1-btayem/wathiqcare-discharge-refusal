"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  Send,
  Phone,
  Mail,
  Globe,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { ClinicalBadge } from "../clinical/ClinicalBadge";
import type { ConsentStep } from "../clinical/ClinicalTypes";

interface Props {
  lang: "en" | "ar";
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[]) => void;
  mobile?: string;
  email?: string;
  linkedDocumentId?: string | null;
  documentReady?: boolean;
  isLinkingDocument?: boolean;
  documentError?: string | null;
  licenseExpired?: boolean;
  licenseExpiryDate?: string;
}

type OtpMethod = "sms" | "email" | "both";
type PatientLanguage = "en" | "ar" | "both";

type SecureSigningWorkflow = {
  sessionId?: string;
  signingUrl?: string;
  recipientMobile?: string;
  recipientEmail?: string;
  smsDeliveryStatus?: "sent" | "failed";
  smsFailureReason?: string | null;
  emailDeliveryStatus?: "sent" | "failed";
  emailFailureReason?: string | null;
  createdAt?: string;
  status?: {
    linkCreated?: boolean;
    smsSent?: boolean;
    opened?: boolean;
    otpRequested?: boolean;
    otpVerified?: boolean;
    signed?: boolean;
    expired?: boolean;
    failed?: boolean;
    failedAttempts?: number;
  };
};

const ar = {
  sendSecureConsentLink: "إرسال رابط الموافقة الآمن",
  subtitle: "تأكد من بيانات التواصل وطريقة رمز التحقق قبل الإرسال.",
  patientContactDetails: "بيانات التواصل مع المريض",
  mobileNumber: "رقم الجوال",
  emailAddress: "البريد الإلكتروني",
  otpSigningMethod: "طريقة رمز التحقق للتوقيع",
  smsOnly: "رسالة نصية فقط",
  emailOnly: "بريد إلكتروني فقط",
  smsEmail: "رسالة نصية + بريد إلكتروني",
  otpMobile: "يرسل رمز التحقق إلى الجوال",
  otpEmail: "يرسل رمز التحقق إلى البريد الإلكتروني",
  dualVerification: "تحقق مزدوج",
  consentLanguage: "لغة الموافقة",
  arabicOnly: "العربية فقط",
  linkExpiry: "انتهاء الرابط والقيود",
  expiryDuration: "مدة الصلاحية",
  maxResend: "الحد الأقصى لإعادة الإرسال",
  finalConfirmation: "تأكيد الطبيب النهائي",
  confirm1: "أؤكد أنني تحققت من هوية المريض وبيانات التواصل.",
  confirm2: "أؤكد أن جميع الإفصاحات دقيقة ومكتملة.",
  confirm3: "أفوض بإرسال رابط الموافقة إلى هذا المريض.",
  confirm4: "أدرك أن هذا الإجراء سيتم تسجيله في سجل التدقيق.",
  checkbox: "أؤكد صحة جميع العبارات أعلاه وأفوض بالإرسال.",
  disabled: "زر الإرسال معطل حتى يتم تأكيد الطبيب.",
  back: "رجوع",
  send: "إرسال رابط الموافقة",
  sending: "جارٍ الإرسال...",
  realDeliveryNotice:
    "وضع الإرسال الفعلي: زر إرسال رابط الموافقة ينشئ رابط توقيع آمن ويرسله عبر القنوات المفعلة.",
  linkSent: "تم إنشاء رابط الموافقة الآمن",
  linkSentSubtitle: "تم إنشاء جلسة توقيع آمنة وربطها برحلة المريض.",
  tracking: "متابعة الموافقة من تبويب الحالة",
  sentTo: "أرسل إلى",
  method: "الطريقة",
  language: "اللغة",
  expires: "ينتهي خلال",
  reference: "المرجع",
  signingUrl: "رابط التوقيع الآمن",
  openLink: "فتح الرابط",
  copyLink: "نسخ الرابط",
  copied: "تم النسخ",
  documentNotReady:
    "مستند الموافقة غير جاهز بعد. يرجى الرجوع إلى المعاينة وإنشاء/ربط المستند أولًا.",
  missingEmail: "البريد الإلكتروني مطلوب لطريقة الإرسال المحددة.",
  missingMobile: "رقم الجوال مطلوب لطريقة الإرسال المحددة.",
  sendFailed: "تعذر إرسال رابط الموافقة.",
  licenseExpired:
    "لا يمكن الإرسال لأن ترخيص الطبيب منتهي أو غير صالح.",
};

function requiresMobile(method: OtpMethod): boolean {
  return method === "sms" || method === "both";
}

function requiresEmail(method: OtpMethod): boolean {
  return method === "email" || method === "both";
}

function normalizeDisplayValue(value?: string): string {
  return value?.trim() || "";
}

export function StepSend({
  lang,
  onPrev,
  onComplete,
  mobile,
  email,
  linkedDocumentId,
  documentReady = false,
  isLinkingDocument = false,
  documentError,
  licenseExpired = false,
  licenseExpiryDate,
}: Props) {
  const [otpMethod, setOtpMethod] = useState<OtpMethod>("sms");
  const [patientLang, setPatientLang] = useState<PatientLanguage>("both");
  const [expiryHours, setExpiryHours] = useState("48");
  const [physicianConfirmed, setPhysicianConfirmed] = useState(false);
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<SecureSigningWorkflow | null>(null);
  const [copied, setCopied] = useState(false);

  const dir = lang === "ar" ? "rtl" : "ltr";
  const displayMobile = normalizeDisplayValue(mobile);
  const displayEmail = normalizeDisplayValue(email);

  const hasRequiredMobile = !requiresMobile(otpMethod) || Boolean(displayMobile);
  const hasRequiredEmail = !requiresEmail(otpMethod) || Boolean(displayEmail);

  const canSend =
    !licenseExpired &&
    physicianConfirmed &&
    Boolean(linkedDocumentId) &&
    documentReady &&
    hasRequiredMobile &&
    hasRequiredEmail &&
    !isSending &&
    !isLinkingDocument;

  const handleSend = async () => {
    if (!physicianConfirmed || isSending) return;

    setSendError(null);

    if (licenseExpired) {
      setSendError(
        lang === "en"
          ? `Sending is disabled because the physician license is expired${licenseExpiryDate ? ` on ${licenseExpiryDate}` : ""}.`
          : ar.licenseExpired,
      );
      return;
    }

    if (!linkedDocumentId || !documentReady) {
      setSendError(
        lang === "en"
          ? "Consent document is not ready. Please return to Preview and generate/link the document first."
          : ar.documentNotReady,
      );
      return;
    }

    if (requiresMobile(otpMethod) && !displayMobile) {
      setSendError(
        lang === "en"
          ? "Recipient mobile number is required for SMS OTP delivery."
          : ar.missingMobile,
      );
      return;
    }

    if (requiresEmail(otpMethod) && !displayEmail) {
      setSendError(
        lang === "en"
          ? "Recipient email is required for the selected delivery method."
          : ar.missingEmail,
      );
      return;
    }

    try {
      setIsSending(true);

      const response = await fetch(
        `/api/modules/informed-consents/documents/${encodeURIComponent(
          linkedDocumentId,
        )}/secure-signing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobileNumber: displayMobile || undefined,
            recipientEmail: displayEmail || undefined,
            otpMethod,
            patientLanguage: patientLang,
            expiryHours: Number(expiryHours),
          }),
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            `Secure signing request failed with status ${response.status}`,
        );
      }

      const nextWorkflow = result?.workflow as SecureSigningWorkflow | undefined;

      if (!nextWorkflow?.signingUrl) {
        throw new Error("Secure signing link was not returned by the server.");
      }

      setWorkflow(nextWorkflow);
      onComplete("send", ["v16"]);
      setSent(true);
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : lang === "en"
            ? "Failed to send secure signing link."
            : ar.sendFailed,
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!workflow?.signingUrl) return;

    try {
      await navigator.clipboard.writeText(workflow.signingUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (sent && workflow) {
    const successItems = [
      {
        label: lang === "en" ? "Sent to" : ar.sentTo,
        value: workflow.recipientMobile || displayMobile || "n/a",
      },
      {
        label: lang === "en" ? "Email" : ar.emailAddress,
        value: workflow.recipientEmail || displayEmail || "n/a",
      },
      {
        label: lang === "en" ? "SMS status" : "حالة الرسائل النصية",
        value: workflow.smsDeliveryStatus || "n/a",
      },
      {
        label: lang === "en" ? "Email status" : "حالة البريد الإلكتروني",
        value: workflow.emailDeliveryStatus || "n/a",
      },
      {
        label: lang === "en" ? "Language" : ar.language,
        value: patientLang === "both" ? "Arabic & English" : patientLang.toUpperCase(),
      },
      {
        label: lang === "en" ? "Expires" : ar.expires,
        value: `${expiryHours} hours`,
      },
      {
        label: lang === "en" ? "Session" : ar.reference,
        value: workflow.sessionId || linkedDocumentId || "n/a",
      },
    ];

    return (
      <div
        className="p-8 flex flex-col items-center justify-center min-h-96 text-center space-y-4"
        dir={dir}
      >
        <div
          className="w-full max-w-xl bg-emerald-50 border border-emerald-200 rounded px-4 py-3 text-left"
          data-testid="step-send-success-real-banner"
        >
          <span className="text-xs font-semibold text-emerald-800">
            {lang === "en"
              ? "Real secure signing workflow created. The public patient link was generated and dispatch status was recorded."
              : "تم إنشاء مسار توقيع آمن فعليًا، وتم تسجيل حالة الإرسال."}
          </span>
        </div>

        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>

        <div>
          <h2 className="text-emerald-700">
            {lang === "en" ? "Secure Consent Link Created" : ar.linkSent}
          </h2>
          <p className="text-sm text-[#6B7280] mt-1">
            {lang === "en"
              ? "A secure signing session has been created and connected to the patient journey."
              : ar.linkSentSubtitle}
          </p>
        </div>

        <div className="bg-white border border-[#D8DCE3] rounded-lg p-5 w-full max-w-xl text-left">
          <div className="space-y-2 text-sm">
            {successItems.map((item) => (
              <div key={item.label} className="flex justify-between gap-4">
                <span className="text-[#6B7280]">{item.label}</span>
                <span className="font-medium text-[#2F2F2F] font-mono text-right break-all">
                  {item.value}
                </span>
              </div>
            ))}

            <div className="pt-3 mt-3 border-t border-[#EEF1F5]">
              <div className="text-xs text-[#6B7280] mb-1">
                {lang === "en" ? "Secure signing URL" : ar.signingUrl}
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={workflow.signingUrl || ""}
                  className="flex-1 border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-xs text-[#2F2F2F] font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 border border-[#D8DCE3] rounded px-3 py-2 text-xs text-[#2F2F2F] hover:bg-[#F4F6F9]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied
                    ? lang === "en"
                      ? "Copied"
                      : ar.copied
                    : lang === "en"
                      ? "Copy"
                      : ar.copyLink}
                </button>
                <a
                  href={workflow.signingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 bg-[#002B5C] text-white rounded px-3 py-2 text-xs hover:bg-blue-900"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {lang === "en" ? "Open" : ar.openLink}
                </a>
              </div>
            </div>
          </div>
        </div>

        <ClinicalBadge
          variant="info"
          label={lang === "en" ? "Tracking consent in Status tab" : ar.tracking}
        />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" dir={dir}>
      <div
        className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded px-4 py-3"
        data-testid="step-send-real-delivery-banner"
      >
        <Shield className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <span className="text-xs font-semibold text-blue-800">
          {lang === "en"
            ? "Real delivery mode: the Send Consent Link button creates a secure public signing token and dispatches the link using the configured channels."
            : ar.realDeliveryNotice}
        </span>
      </div>

      <div>
        <h2 className="text-[#002B5C]">
          {lang === "en" ? "Send Secure Consent Link" : ar.sendSecureConsentLink}
        </h2>
        <p className="text-sm text-[#6B7280] mt-1">
          {lang === "en"
            ? "Confirm patient contact details and OTP method before sending."
            : ar.subtitle}
        </p>
      </div>

      {(licenseExpired || documentError || sendError || !linkedDocumentId || !documentReady) && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span className="text-xs font-semibold text-amber-800">
            {sendError ||
              documentError ||
              (licenseExpired
                ? lang === "en"
                  ? `Sending is disabled because the physician license is expired${licenseExpiryDate ? ` on ${licenseExpiryDate}` : ""}.`
                  : ar.licenseExpired
                : lang === "en"
                  ? "Consent document must be generated and linked before sending."
                  : ar.documentNotReady)}
          </span>
        </div>
      )}

      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
        <h3 className="text-[#2F2F2F] mb-4">
          {lang === "en" ? "Patient Contact Details" : ar.patientContactDetails}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[#6B7280] flex items-center gap-1.5 mb-1.5">
              <Phone className="w-3.5 h-3.5" />
              {lang === "en" ? "Mobile Number" : ar.mobileNumber}
            </label>
            <input
              type="tel"
              readOnly
              value={displayMobile}
              className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#6B7280] flex items-center gap-1.5 mb-1.5">
              <Mail className="w-3.5 h-3.5" />
              {lang === "en" ? "Email Address" : ar.emailAddress}
            </label>
            <input
              type="email"
              readOnly
              value={displayEmail}
              placeholder={lang === "en" ? "Optional for SMS only" : "اختياري عند الإرسال برسالة نصية فقط"}
              className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
        <h3 className="text-[#2F2F2F] mb-4">
          {lang === "en" ? "OTP Signing Method" : ar.otpSigningMethod}
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              id: "sms" as const,
              label: lang === "en" ? "SMS Only" : ar.smsOnly,
              icon: Phone,
              desc: lang === "en" ? "OTP sent to mobile" : ar.otpMobile,
            },
            {
              id: "email" as const,
              label: lang === "en" ? "Email Only" : ar.emailOnly,
              icon: Mail,
              desc: lang === "en" ? "OTP sent to email" : ar.otpEmail,
            },
            {
              id: "both" as const,
              label: lang === "en" ? "SMS + Email" : ar.smsEmail,
              icon: Shield,
              desc: lang === "en" ? "Dual verification" : ar.dualVerification,
            },
          ].map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setOtpMethod(method.id)}
              className={`text-left border rounded-lg p-3 cursor-pointer transition-colors ${
                otpMethod === method.id
                  ? "border-[#002B5C] bg-blue-50"
                  : "border-[#D8DCE3] hover:bg-[#F4F6F9]"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <method.icon className="w-4 h-4 text-[#002B5C]" />
                <span className="text-sm font-medium text-[#2F2F2F]">
                  {method.label}
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">{method.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
          <h3 className="text-[#2F2F2F] mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#002B5C]" />
            {lang === "en" ? "Consent Language" : ar.consentLanguage}
          </h3>

          <div className="space-y-2">
            {[
              { id: "en" as const, label: "English only" },
              { id: "ar" as const, label: lang === "en" ? "Arabic only" : ar.arabicOnly },
              { id: "both" as const, label: "Bilingual (EN + AR)" },
            ].map((item) => (
              <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={patientLang === item.id}
                  onChange={() => setPatientLang(item.id)}
                  className="accent-[#002B5C]"
                />
                <span className="text-sm text-[#2F2F2F]">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
          <h3 className="text-[#2F2F2F] mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#002B5C]" />
            {lang === "en" ? "Link Expiry & Limits" : ar.linkExpiry}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-1">
                {lang === "en" ? "Expiry Duration" : ar.expiryDuration}
              </label>
              <select
                value={expiryHours}
                onChange={(event) => setExpiryHours(event.target.value)}
                className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]"
              >
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
                <option value="168">7 days</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-1">
                {lang === "en" ? "Max Resend Attempts" : ar.maxResend}
              </label>
              <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                <option>3 attempts</option>
                <option>5 attempts</option>
                <option>Unlimited</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`bg-[#002B5C]/5 border border-[#002B5C]/20 rounded-lg p-5 ${
          physicianConfirmed ? "border-emerald-300 bg-emerald-50" : ""
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-[#002B5C]" />
          <span className="text-sm font-semibold text-[#002B5C]">
            {lang === "en" ? "Physician Final Confirmation" : ar.finalConfirmation}
          </span>
        </div>

        <div className="space-y-2 text-xs text-[#2F2F2F] mb-4">
          {[
            lang === "en" ? "I have verified patient identity and contact details." : ar.confirm1,
            lang === "en" ? "I confirm all disclosures are accurate and complete." : ar.confirm2,
            lang === "en" ? "I authorize sending the consent link to this patient." : ar.confirm3,
            lang === "en" ? "I understand this action will be recorded in the audit trail." : ar.confirm4,
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <div
                className={`w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 ${
                  physicianConfirmed ? "bg-emerald-500" : "bg-[#002B5C]/20"
                }`}
              />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={physicianConfirmed}
            onChange={(event) => setPhysicianConfirmed(event.target.checked)}
            className="w-4 h-4 accent-[#002B5C]"
          />
          <span className="text-sm font-semibold text-[#002B5C]">
            {lang === "en"
              ? "I confirm all the above statements are true and authorize sending."
              : ar.checkbox}
          </span>
        </label>
      </div>

      {!physicianConfirmed && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-800">
            {lang === "en"
              ? "Send button is disabled until physician confirmation is checked."
              : ar.disabled}
          </span>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {lang === "en" ? "Back" : ar.back}
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="flex items-center gap-2 bg-[#C9A13B] hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded text-sm font-semibold transition-colors"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isSending
            ? lang === "en"
              ? "Sending..."
              : ar.sending
            : lang === "en"
              ? "Send Consent Link"
              : ar.send}
        </button>
      </div>
    </div>
  );
}