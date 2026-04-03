"use client";

import { ShieldAlert } from "lucide-react";

type EscalationAlertProps = {
  escalationRequired: boolean;
  escalationDueAt?: string | null;
};

export default function EscalationAlert({ escalationRequired, escalationDueAt }: EscalationAlertProps) {
  if (!escalationRequired) {
    return null;
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <p className="inline-flex items-center gap-1.5 font-semibold">
        <ShieldAlert className="h-4 w-4" />
        التصعيد مطلوب
      </p>
      {escalationDueAt ? <p className="mt-1 text-xs">موعد استحقاق التصعيد: {new Date(escalationDueAt).toLocaleString()}</p> : null}
    </div>
  );
}
