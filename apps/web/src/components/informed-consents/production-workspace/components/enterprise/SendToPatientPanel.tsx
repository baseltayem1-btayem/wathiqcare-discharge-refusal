"use client";

import { AlertTriangle, BadgeCheck, Mail, Phone, Send, ShieldCheck } from "lucide-react";
import { Button, Input } from "@/components/design-system";
import { useI18n } from "@/i18n/I18nProvider";
import type { SecureSigningResult } from "../../types";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader } from "../WorkspaceAtoms";

interface SendToPatientPanelProps {
  mobile: string;
  email: string;
  allowlisted?: boolean;
  pilotEnabled?: boolean;
  reason?: string;
  previewReviewed: boolean;
  draftApproved: boolean;
  sendDisabled: boolean;
  sendReason?: string;
  sendLoading: boolean;
  signingResult?: SecureSigningResult;
  onMobileChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onApproveDraft: () => void;
  onSend: () => void;
}

export function SendToPatientPanel({
  mobile,
  email,
  allowlisted,
  pilotEnabled,
  reason,
  previewReviewed,
  draftApproved,
  sendDisabled,
  sendReason,
  sendLoading,
  signingResult,
  onMobileChange,
  onEmailChange,
  onApproveDraft,
  onSend,
}: SendToPatientPanelProps) {
  const { lang } = useI18n();
  const hasContact = Boolean(mobile.trim() || email.trim());

  return (
    <WorkspaceCard className="overflow-hidden">
      <WorkspaceCardHeader
        icon={<Send className="size-5" />}
        title={lang === "ar" ? "إرسال إلى المريض" : "Send to Patient"}
        description={lang === "ar" ? "بوابة الإرسال النهائية بعد مراجعة المعاينة واعتماد المسودة والتحقق من allowlist." : "Final dispatch gate after preview review, draft approval, and allowlist verification."}
        action={allowlisted ? <WorkspaceBadge tone="green">{lang === "ar" ? "مستلم موثّق" : "Recipient verified"}</WorkspaceBadge> : null}
      />

      <div className="space-y-4 px-5 py-5">
        <div className="grid gap-3">
          <Input
            type="tel"
            value={mobile}
            onChange={(event) => onMobileChange(event.target.value)}
            placeholder={lang === "ar" ? "رقم الجوال" : "Patient mobile number"}
            startIcon={<Phone className="size-4" />}
            disabled={sendLoading}
          />
          <Input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder={lang === "ar" ? "البريد الإلكتروني للمريض" : "Patient email address"}
            startIcon={<Mail className="size-4" />}
            disabled={sendLoading}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-700">{lang === "ar" ? "تمت مراجعة المعاينة" : "Preview reviewed"}</span>
            <WorkspaceBadge tone={previewReviewed ? "green" : "gold"}>{previewReviewed ? "OK" : "Pending"}</WorkspaceBadge>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-700">{lang === "ar" ? "تم اعتماد المسودة" : "Draft approved"}</span>
            <WorkspaceBadge tone={draftApproved ? "green" : "gold"}>{draftApproved ? "OK" : "Pending"}</WorkspaceBadge>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-700">{lang === "ar" ? "allowlist المستلم" : "Recipient allowlist"}</span>
            <WorkspaceBadge tone={allowlisted ? "green" : "gold"}>{allowlisted ? "OK" : "Pending"}</WorkspaceBadge>
          </div>
        </div>

        {!hasContact ? (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{lang === "ar" ? "أدخل رقم الجوال أو البريد الإلكتروني لفتح بوابة الإرسال." : "Enter a mobile number or email address to enable dispatch."}</span>
          </div>
        ) : null}

        {allowlisted ? (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <span>{reason || (lang === "ar" ? "تم التحقق من allowlist وسيُحفظ الأثر في التدقيق الحالي." : "Allowlist verification completed and will be preserved in the current audit flow.")}</span>
          </div>
        ) : hasContact ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {reason || (lang === "ar" ? "المستلم غير معتمد للإرسال التجريبي الحالي." : "Recipient is not approved for the current pilot send path.")}
              {!pilotEnabled ? ` ${lang === "ar" ? "إرسال pilot غير مفعّل لهذه البيئة." : "Pilot send is not enabled for this environment."}` : ""}
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button variant={draftApproved ? "outline" : "default"} size="sm" className="h-11 rounded-2xl" disabled={draftApproved} onClick={onApproveDraft}>
            {draftApproved ? (lang === "ar" ? "تم اعتماد المسودة" : "Draft Approved") : (lang === "ar" ? "اعتماد المسودة" : "Approve Draft")}
          </Button>
          <Button variant="default" size="sm" className="h-11 rounded-2xl" disabled={sendDisabled} onClick={onSend}>
            <Send className="mr-1 size-4" />
            {sendLoading ? (lang === "ar" ? "جاري الإرسال…" : "Sending…") : (lang === "ar" ? "إرسال إلى المريض" : "Send to Patient")}
          </Button>
          {sendReason ? <p className="text-center text-xs leading-5 text-slate-500">{sendReason}</p> : null}
        </div>

        {signingResult ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-semibold">
              <BadgeCheck className="size-4" />
              <span>{lang === "ar" ? "تم إنشاء جلسة التوقيع" : "Secure signing session created"}</span>
            </div>
            <p className="mt-2 text-xs text-emerald-900">
              {lang === "ar" ? "معرّف الجلسة:" : "Session ID:"} {signingResult.sessionId}
            </p>
            <p className="text-xs text-emerald-900">
              {lang === "ar" ? "حالة الرسائل:" : "Dispatch status:"}{" "}
              SMS {signingResult.dispatchStatuses.sms} · Email {signingResult.dispatchStatuses.email}
            </p>
          </div>
        ) : null}
      </div>
    </WorkspaceCard>
  );
}