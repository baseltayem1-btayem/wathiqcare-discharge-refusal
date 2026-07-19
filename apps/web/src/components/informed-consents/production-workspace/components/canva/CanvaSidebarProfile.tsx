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
    <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3">
      <div className="flex items-center gap-3">
        {imcPhysician ? (
          // eslint-disable-next-line @next/next/no-img-element -- sidebar avatar from external IMC source
          <img
            src={imcPhysician.photoUrl}
            alt={displayName}
            className="size-8 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/30 text-[10px] font-semibold text-white">
            {initials || "?"}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white">
            {displayName}
          </p>
          <p className="truncate text-[11px] text-slate-300">{role}</p>
        </div>
      </div>
      <div className="hidden min-w-0 leading-tight sm:block">
        <p className="truncate text-[11px] text-slate-300" title={physician.email}>{physician.email}</p>
        <p className="truncate text-[11px] text-slate-400">{isRtl ? "المركز الطبي الدولي" : "International Medical Center"}</p>
      </div>
    </div>
  );
}
