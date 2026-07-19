"use client";

import { Activity, ClipboardList, LayoutDashboard, Settings, Shield, Users } from "lucide-react";
import { cn } from "@/components/design-system";
import { useI18n } from "@/i18n/I18nProvider";
import { CanvaSidebarProfile } from "../canva/CanvaSidebarProfile";
import type { PhysicianContext } from "../../types";
import type { WorkspacePageId } from "../canva/CanvaWorkspaceNav";

const NAV_ITEMS: Array<{
  id: WorkspacePageId;
  labelEn: string;
  labelAr: string;
  icon: React.ElementType;
}> = [
  { id: "workspace", labelEn: "Command Center", labelAr: "مركز التحكم", icon: LayoutDashboard },
  { id: "patients", labelEn: "Patients", labelAr: "المرضى", icon: Users },
  { id: "encounters", labelEn: "Encounters", labelAr: "الزيارات", icon: ClipboardList },
  { id: "procedures", labelEn: "Procedures", labelAr: "الإجراءات", icon: Activity },
  { id: "audit", labelEn: "Audit & Evidence", labelAr: "التدقيق والأدلة", icon: Shield },
  { id: "settings", labelEn: "Settings", labelAr: "الإعدادات", icon: Settings },
];

interface EnterpriseSidebarProps {
  activePage: WorkspacePageId;
  onPageChange: (page: WorkspacePageId) => void;
  physician: PhysicianContext;
}

export function EnterpriseSidebar({ activePage, onPageChange, physician }: EnterpriseSidebarProps) {
  const { lang } = useI18n();

  return (
    <aside className="hidden w-[298px] shrink-0 flex-col border-r border-[#183958] bg-[radial-gradient(circle_at_top,#15385b_0%,#0f2640_42%,#0a1626_100%)] text-slate-200 lg:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2f7df6_0%,#0d4db8_100%)] text-base font-bold text-white shadow-[0_16px_36px_rgba(37,99,235,0.28)]">
            W
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">WathiqCare</p>
            <p className="text-[11px] text-slate-300">
              {lang === "ar" ? "مساحة عمل موافقات الطبيب" : "Physician Consent Workspace"}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-[#d8b45c]/20 bg-[linear-gradient(135deg,rgba(200,162,74,0.18)_0%,rgba(18,38,61,0.2)_100%)] p-4 shadow-[0_18px_40px_rgba(2,6,23,0.26)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f5dd9d]">
            {lang === "ar" ? "مركز قيادة سريري" : "Clinical Command Center"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {lang === "ar"
              ? "واجهة تشغيل موثقة لإعداد الموافقة المعتمدة ومراجعتها وإرسالها ضمن الحوكمة الحالية."
              : "Evidence-driven workspace for approved consent preparation, review, and dispatch under current governance."}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.id === activePage;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-white/10 text-white shadow-[inset_3px_0_0_#d8b45c]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-4.5 shrink-0" />
              <span className="truncate">{lang === "ar" ? item.labelAr : item.labelEn}</span>
              {active ? <span className="ml-auto size-2 rounded-full bg-[#f5dd9d]" aria-hidden /> : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <CanvaSidebarProfile physician={physician} />
      </div>
    </aside>
  );
}