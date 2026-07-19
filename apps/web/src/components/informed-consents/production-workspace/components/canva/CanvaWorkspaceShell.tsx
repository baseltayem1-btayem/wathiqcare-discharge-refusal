"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/components/design-system";
import { CanvaWorkspaceNav, type WorkspacePageId } from "./CanvaWorkspaceNav";
import { CanvaSidebarProfile } from "./CanvaSidebarProfile";
import type { PhysicianContext } from "../../types";

function PilotBadge() {
  return (
    <div className="mx-2 mb-4 rounded-2xl border border-[#e7d6a3] bg-[linear-gradient(135deg,#fff9eb_0%,#fff3cf_100%)] px-3 py-3 shadow-[0_10px_24px_rgba(200,162,74,0.16)]">
      <p className="text-[10px] font-semibold text-[#8f6d1b] uppercase tracking-[0.2em]">
        IMC Physician Pilot
      </p>
      <p className="mt-1 text-[11px] leading-5 text-[#9a7b2f]">Internal clinical workspace for approved consent operations.</p>
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
        "canva-workspace-root flex min-h-screen w-full bg-slate-50",
        isRtl && "canva-workspace-rtl"
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-[#10263f] text-slate-200 lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#2463eb] text-white">
            <span className="text-sm font-bold">W</span>
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">WathiqCare</p>
            <p className="text-[11px] text-slate-300">Informed Consent</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <PilotBadge />
          <CanvaWorkspaceNav activePage={activePage} onPageChange={onPageChange} pilotMode />
        </nav>

        <div className="border-t border-slate-700 p-3">
          <CanvaSidebarProfile physician={physician} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {topBar}
        <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
