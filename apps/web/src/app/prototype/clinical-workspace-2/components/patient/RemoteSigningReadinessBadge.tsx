"use client";

import { Wifi, Smartphone, ShieldCheck } from "lucide-react";
import type { PatientLanguage } from "../../types/workspace";
import { t } from "../../lib/i18n-helpers";

interface RemoteSigningReadinessBadgeProps {
  lang: PatientLanguage;
}

export function RemoteSigningReadinessBadge({ lang }: RemoteSigningReadinessBadgeProps) {
  const items = [
    { icon: Wifi, label: t(lang, "Network ready", "الشبكة جاهزة"), ok: true },
    { icon: Smartphone, label: t(lang, "Device compatible", "الجهاز متوافق"), ok: true },
    { icon: ShieldCheck, label: t(lang, "Identity verified", "تم التحقق من الهوية"), ok: true },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200"
        >
          <item.icon className="w-3.5 h-3.5" />
          {item.label}
        </div>
      ))}
    </div>
  );
}
