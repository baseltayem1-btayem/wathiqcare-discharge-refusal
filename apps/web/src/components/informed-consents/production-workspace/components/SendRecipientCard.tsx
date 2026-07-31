"use client";

import { Phone, Mail, AlertTriangle, ShieldCheck, BadgeCheck, Send, Smartphone, Check } from "lucide-react";
import { Input } from "@/components/design-system";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader } from "./WorkspaceAtoms";

interface SendRecipientCardProps {
  mobile: string;
  email: string;
  allowlisted?: boolean;
  pilotEnabled?: boolean;
  pilotRealSend?: boolean;
  recipientConfirmed?: boolean;
  reason?: string;
  onMobileChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onRecipientConfirmedChange?: (value: boolean) => void;
  disabled?: boolean;
}

function normalizeMobilePreview(value: string): string {
  const compact = value.replace(/[\s\-()]/g, "");
  if (!compact) return "";
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("966")) return `+${compact}`;
  if (compact.startsWith("05") && compact.length === 10) return `+966${compact.slice(1)}`;
  return compact;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim());
}

export function SendRecipientCard({
  mobile,
  email,
  allowlisted,
  pilotEnabled,
  pilotRealSend,
  recipientConfirmed,
  reason,
  onMobileChange,
  onEmailChange,
  onRecipientConfirmedChange,
  disabled,
}: SendRecipientCardProps) {
  const normalized = normalizeMobilePreview(mobile);
  const hasMobile = Boolean(normalized);
  const emailValid = isValidEmail(email);
  const hasContact = hasMobile || emailValid;
  const showAllowlistWarning = hasContact && allowlisted === false && !pilotRealSend;

  return (
    <WorkspaceCard id="section-recipient">
      <WorkspaceCardHeader
        icon={<Send className="size-5" />}
        title="Send recipient"
        description="Confirm where the consent package will be delivered."
      />
      <div className="space-y-3 px-5 py-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-slate-200">
              <Smartphone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Mobile number</p>
              <Input
                type="tel"
                value={mobile}
                onChange={(e) => onMobileChange(e.target.value)}
                placeholder="05xxxxxxxx or +9665xxxxxxxx"
                startIcon={<Phone className="w-4 h-4" />}
                disabled={disabled}
              />
              {normalized ? <p className="mt-1 text-[10px] text-slate-500">Normalized: {normalized}</p> : null}
            </div>
            <div className="ml-auto">
              {hasMobile ? (
                <WorkspaceBadge tone="green">
                  <BadgeCheck className="size-3" /> Verified
                </WorkspaceBadge>
              ) : (
                <WorkspaceBadge tone="gold">Pending</WorkspaceBadge>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-slate-200">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Email address</p>
              <Input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="patient@example.com"
                disabled={disabled}
              />
            </div>
            <div className="ml-auto">
              {emailValid ? <WorkspaceBadge tone="green">Available</WorkspaceBadge> : <WorkspaceBadge tone="slate">Optional</WorkspaceBadge>}
            </div>
          </div>
        </div>

        {!hasContact ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Enter a mobile number or email to enable sending.</span>
          </div>
        ) : null}

        {pilotRealSend && hasContact ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Real SMS/email will be sent in Pilot Mode. Verify the recipient details carefully.</span>
          </div>
        ) : null}

        {hasContact && allowlisted === true ? (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700 ring-1 ring-inset ring-blue-100">
            <ShieldCheck className="size-4 shrink-0" />
            <span className="text-slate-700">
              Pilot recipient verification complete. {reason || "Identity hash sealed and logged to the audit trail."}
            </span>
          </div>
        ) : null}

        {showAllowlistWarning ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This contact is not on the IMC pilot allowlist. Real send is blocked. {reason}
              {!pilotEnabled ? " Pilot sending is not enabled for this tenant." : ""}
            </span>
          </div>
        ) : null}

        {pilotRealSend && hasContact ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm transition hover:border-blue-200">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-white transition">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={recipientConfirmed}
                disabled={disabled}
                onChange={(e) => onRecipientConfirmedChange?.(e.target.checked)}
              />
              <Check className="size-3.5 text-blue-600 opacity-0 peer-checked:opacity-100" />
            </span>
            <span className="text-slate-700">
              I confirm this mobile/email belongs to the intended patient or authorized recipient.
            </span>
          </label>
        ) : null}
      </div>
    </WorkspaceCard>
  );
}
