"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { findImcGeneralSurgeryPhysician } from "../../lib/imc-doctors";
import type { PhysicianContext } from "../../types";

interface CanvaSidebarProfileProps {
  physician: PhysicianContext;
}

export function CanvaSidebarProfile({ physician }: CanvaSidebarProfileProps) {
  const { lang, isRtl } = useI18n();

  const imcPhysician = useMemo(
    () => findImcGeneralSurgeryPhysician(physician.name),
    [physician.name]
  );

  if (!imcPhysician) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-500">
            {physician.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold truncate text-slate-700">
              {physician.name || "Physician"}
            </p>
            <p className="text-[9px] text-slate-500">
              {isRtl ? "الملف غير متوفر" : "Profile unavailable"}
            </p>
          </div>
        </div>
        <div className="text-[9px] text-slate-500 leading-tight">
          <p>{isRtl ? "المركز الطبي الدولي" : "International Medical Center"}</p>
          <p>{isRtl ? "جدة، المملكة العربية السعودية" : "Jeddah, Saudi Arabia"}</p>
        </div>
      </div>
    );
  }

  const displayName = lang === "ar" && imcPhysician.nameAr ? imcPhysician.nameAr : imcPhysician.nameEn;
  const specialty = lang === "ar" && imcPhysician.specialtyAr ? imcPhysician.specialtyAr : imcPhysician.specialtyEn;

  return (
    <div className="space-y-2">
      <a
        href={imcPhysician.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 group"
      >
        <img
          src={imcPhysician.photoUrl}
          alt={displayName}
          className="w-8 h-8 rounded-full object-cover shrink-0"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold truncate text-slate-800 group-hover:text-blue-600">
            {displayName}
          </p>
          <p className="text-[9px] text-slate-500 truncate">{specialty}</p>
        </div>
      </a>
      <div className="text-[9px] text-slate-500 leading-tight">
        <p>{lang === "ar" && imcPhysician.departmentAr ? imcPhysician.departmentAr : imcPhysician.departmentEn}</p>
        <p>{isRtl ? "المركز الطبي الدولي" : "International Medical Center"}</p>
        <p>{isRtl ? "جدة، المملكة العربية السعودية" : "Jeddah, Saudi Arabia"}</p>
      </div>
    </div>
  );
}
