"use client";

import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Activity,
  BookOpen,
  FileText,
  BarChart2,
  Shield,
  Settings,
} from "lucide-react";
import { cn } from "@/components/design-system";

export type WorkspacePageId =
  | "workspace"
  | "patients"
  | "encounters"
  | "procedures"
  | "knowledge"
  | "templates"
  | "analytics"
  | "audit"
  | "settings";

interface NavItemDef {
  id: WorkspacePageId;
  labelEn: string;
  labelAr: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItemDef[] = [
  { id: "workspace", labelEn: "Workspace", labelAr: "مساحة العمل", icon: LayoutDashboard },
  { id: "patients", labelEn: "Patients", labelAr: "المرضى", icon: Users },
  { id: "encounters", labelEn: "Encounters", labelAr: "الزيارات", icon: ClipboardList },
  { id: "procedures", labelEn: "Procedures", labelAr: "الإجراءات", icon: Activity },
  { id: "knowledge", labelEn: "Knowledge", labelAr: "المعرفة", icon: BookOpen },
  { id: "templates", labelEn: "Templates", labelAr: "القوالب", icon: FileText },
  { id: "analytics", labelEn: "Analytics", labelAr: "التحليلات", icon: BarChart2 },
  { id: "audit", labelEn: "Audit & Evidence", labelAr: "التدقيق والأدلة", icon: Shield },
  { id: "settings", labelEn: "Settings", labelAr: "الإعدادات", icon: Settings },
];

interface CanvaWorkspaceNavProps {
  activePage: WorkspacePageId;
  onPageChange: (page: WorkspacePageId) => void;
}

export function CanvaWorkspaceNav({ activePage, onPageChange }: CanvaWorkspaceNavProps) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPageChange(item.id)}
            className={cn(
              "canva-nav-item w-full flex items-center gap-2 px-3 py-[7px] rounded-[7px] text-xs font-medium transition-all text-left",
              isActive
                ? "bg-[#eff6ff] text-blue-600 font-semibold"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            <Icon className="w-[14px] h-[14px] shrink-0" />
            <span className="truncate">{item.labelEn}</span>
          </button>
        );
      })}
    </>
  );
}
