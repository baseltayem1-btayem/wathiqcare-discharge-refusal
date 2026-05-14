"use client";

import type { SecureSigningBadgeFlags } from "@/lib/server/module-secure-signing-service";

type Props = {
  status: SecureSigningBadgeFlags;
};

type BadgeItem = {
  key: keyof SecureSigningBadgeFlags;
  label: string;
};

const BADGES: BadgeItem[] = [
  { key: "linkCreated", label: "Link Created" },
  { key: "smsSent", label: "SMS Sent" },
  { key: "opened", label: "Opened" },
  { key: "otpRequested", label: "OTP Requested" },
  { key: "otpVerified", label: "OTP Verified" },
  { key: "signed", label: "Signed" },
  { key: "expired", label: "Expired" },
  { key: "failed", label: "Failed" },
];

function tone(active: boolean, danger = false): string {
  if (!active) return "border-slate-200 bg-slate-100 text-slate-500";
  if (danger) return "border-rose-200 bg-rose-100 text-rose-700";
  return "border-emerald-200 bg-emerald-100 text-emerald-800";
}

export default function SecureSigningStatusBadges({ status }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {BADGES.map((badge) => {
        const active = Boolean(status[badge.key]);
        const isDanger = badge.key === "failed" || badge.key === "expired";

        return (
          <span
            key={badge.key}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(active, isDanger)}`}
          >
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}