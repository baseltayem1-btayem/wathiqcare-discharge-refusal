"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { findImcGeneralSurgeryPhysician } from "../../lib/imc-doctors";
import type { PhysicianContext } from "../../types";

interface CanvaSidebarProfileProps {
  physician: PhysicianContext;
}

export function CanvaSidebarProfile({ physician }: CanvaSidebarProfileProps) {
  const { isRtl } = useI18n();

  const imcPhysician = useMemo(
    () => findImcGeneralSurgeryPhysician(physician.name),
    [physician.name]
  );

  const displayName = physician.name || (isRtl ? "طبيب" : "Physician");
  const initials = displayName
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
  const role = physician.role || physician.platformRole || physician.specialty || (isRtl ? "طبيب" : "Physician");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {imcPhysician ? (
          // eslint-disable-next-line @next/next/no-img-element -- sidebar avatar from external IMC source
          <img
            src={imcPhysician.photoUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-semibold text-blue-700">
            {initials || "?"}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold truncate text-slate-800">
            {displayName}
          </p>
          <p className="text-[9px] text-slate-500 truncate">{role}</p>
        </div>
      </div>
      <div className="text-[9px] text-slate-500 leading-tight">
        <p className="truncate" title={physician.email}>{physician.email}</p>
        <p>{physician.tenantId}</p>
        <p>{isRtl ? "المركز الطبي الدولي" : "International Medical Center"}</p>
        <p>{isRtl ? "جدة، المملكة العربية السعودية" : "Jeddah, Saudi Arabia"}</p>
      </div>
    </div>
  );
}
