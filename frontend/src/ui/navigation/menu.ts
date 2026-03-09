import type { ComponentType } from "react";
import {
  Archive,
  ClipboardCheck,
  FileSpreadsheet,
  FolderKanban,
  Gauge,
  HeartPulse,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

export type SidebarItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Cases", href: "/cases", icon: FolderKanban },
  { label: "Consents", href: "/consents", icon: ClipboardCheck },
  { label: "Agreements", href: "/agreements", icon: FileSpreadsheet },
  { label: "Release of Information", href: "/release-of-information", icon: HeartPulse },
  { label: "Archive", href: "/archive", icon: Archive },
  { label: "Compliance", href: "/compliance", icon: ShieldAlert },
  { label: "Settings", href: "/settings", icon: Settings },
];
