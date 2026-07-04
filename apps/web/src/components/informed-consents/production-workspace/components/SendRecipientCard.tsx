"use client";

import { Phone, Mail, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Input, Stack } from "@/components/design-system";

interface SendRecipientCardProps {
  mobile: string;
  email: string;
  allowlisted?: boolean;
  pilotEnabled?: boolean;
  reason?: string;
  onMobileChange: (value: string) => void;
  onEmailChange: (value: string) => void;
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

export function SendRecipientCard({
  mobile,
  email,
  allowlisted,
  pilotEnabled,
  reason,
  onMobileChange,
  onEmailChange,
  disabled,
}: SendRecipientCardProps) {
  const normalized = normalizeMobilePreview(mobile);
  const hasContact = Boolean(normalized || email.trim());
  const showAllowlistWarning = hasContact && allowlisted === false;

  return (
    <Card className="overflow-hidden" id="section-recipient">
      <CardHeader className="workspace-card-header">
        <Stack direction="row" align="center" gap={2}>
          <Phone className="w-5 h-5 text-[var(--wc-blue)]" />
          <CardTitle className="workspace-section-title">Send Recipient</CardTitle>
        </Stack>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--wc-text)]">Mobile number</label>
            <Input
              type="tel"
              value={mobile}
              onChange={(e) => onMobileChange(e.target.value)}
              placeholder="05xxxxxxxx or +9665xxxxxxxx"
              startIcon={<Phone className="w-4 h-4" />}
              disabled={disabled}
            />
            {normalized && (
              <p className="text-[10px] text-[var(--wc-text-muted)]">Normalized: {normalized}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--wc-text)]">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="patient@example.com"
              startIcon={<Mail className="w-4 h-4" />}
              disabled={disabled}
            />
          </div>
        </div>

        {!hasContact && (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Enter a mobile number or email to enable sending.</span>
          </div>
        )}

        {hasContact && allowlisted === true && (
          <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Pilot recipient verified. {reason}
            </span>
          </div>
        )}

        {showAllowlistWarning && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This contact is not on the IMC pilot allowlist. Real send is blocked. {reason}
              {!pilotEnabled && " Pilot sending is not enabled for this tenant."}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
