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
  pilotVisible?: boolean;
}

const NAV_ITEMS: NavItemDef[] = [
  { id: "workspace", labelEn: "Workspace", labelAr: "مساحة العمل", icon: LayoutDashboard, pilotVisible: true },
  { id: "patients", labelEn: "Patients", labelAr: "المرضى", icon: Users, pilotVisible: true },
  { id: "encounters", labelEn: "Encounters", labelAr: "الزيارات", icon: ClipboardList, pilotVisible: true },
  { id: "procedures", labelEn: "Procedures", labelAr: "الإجراءات", icon: Activity, pilotVisible: false },
  { id: "knowledge", labelEn: "Knowledge", labelAr: "المعرفة", icon: BookOpen, pilotVisible: false },
  { id: "templates", labelEn: "Templates", labelAr: "القوالب", icon: FileText, pilotVisible: false },
  { id: "analytics", labelEn: "Analytics", labelAr: "التحليلات", icon: BarChart2, pilotVisible: false },
  { id: "audit", labelEn: "Audit & Evidence", labelAr: "التدقيق والأدلة", icon: Shield, pilotVisible: true },
  { id: "settings", labelEn: "Settings", labelAr: "الإعدادات", icon: Settings, pilotVisible: true },
];

interface CanvaWorkspaceNavProps {
  activePage: WorkspacePageId;
  onPageChange: (page: WorkspacePageId) => void;
  pilotMode?: boolean;
}

export function CanvaWorkspaceNav({ activePage, onPageChange, pilotMode = true }: CanvaWorkspaceNavProps) {
  const visibleItems = pilotMode ? NAV_ITEMS.filter((item) => item.pilotVisible) : NAV_ITEMS;

  return (
    <>
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPageChange(item.id)}
            className={cn(
              "canva-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-white/10 text-white"
                : "text-slate-300 hover:bg-white/8 hover:text-white"
            )}
          >
            <Icon className="size-4.5 shrink-0" />
            <span className="truncate">{item.labelEn}</span>
            {isActive ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden /> : null}
          </button>
        );
      })}
    </>
  );
}
