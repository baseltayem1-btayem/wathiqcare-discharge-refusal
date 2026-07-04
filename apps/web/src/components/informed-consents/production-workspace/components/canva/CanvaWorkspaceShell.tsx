"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/components/design-system";
import { CanvaWorkspaceNav, type WorkspacePageId } from "./CanvaWorkspaceNav";
import { CanvaSidebarProfile } from "./CanvaSidebarProfile";
import type { PhysicianContext } from "../../types";

function PilotBadge() {
  return (
    <div className="mx-2 mb-2 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
      <p className="text-[9px] font-semibold text-amber-700 uppercase tracking-wide">
        IMC Physician Pilot
      </p>
      <p className="text-[8px] text-amber-600">Internal Use Only</p>
    </div>
  );
}

interface CanvaWorkspaceShellProps {
  activePage: WorkspacePageId;
  onPageChange: (page: WorkspacePageId) => void;
  topBar: ReactNode;
  children: ReactNode;
  physician: PhysicianContext;
}

export function CanvaWorkspaceShell({
  activePage,
  onPageChange,
  topBar,
  children,
  physician,
}: CanvaWorkspaceShellProps) {
  const { isRtl } = useI18n();

  return (
    <div
      className={cn(
        "canva-workspace-root flex w-full h-screen overflow-hidden bg-[#f8fafc]",
        isRtl && "canva-workspace-rtl"
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Sidebar */}
      <aside className="w-[200px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full">
        <div className="p-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">W</span>
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-800">WathiqCare</p>
              <p className="text-[9px] text-slate-500">Informed Consent</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <PilotBadge />
          <CanvaWorkspaceNav activePage={activePage} onPageChange={onPageChange} pilotMode />
        </nav>

        <div className="p-3 border-t border-slate-100">
          <CanvaSidebarProfile physician={physician} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {topBar}
        <main className="flex-1 overflow-y-auto p-4 space-y-3">{children}</main>
      </div>
    </div>
  );
}
