"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import SidebarNavigation from "@/ui/layout/SidebarNavigation";
import TopCommandBar from "@/ui/layout/TopCommandBar";
import ActivityDrawer from "@/ui/layout/ActivityDrawer";

type AppShellProps = {
  children: ReactNode;
};

const AUTHLESS_PATHS = ["/login"];

function shouldBypassShell(pathname: string): boolean {
  return AUTHLESS_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  if (shouldBypassShell(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] p-4">
      <div className="mx-auto flex max-w-[1600px] gap-4">
        <SidebarNavigation />
        <div className="min-w-0 flex-1">
          <TopCommandBar />
          <section className="mt-4 min-h-[calc(100vh-112px)] rounded-2xl border border-[var(--ui-border)] bg-white p-4 shadow-sm">
            {children}
          </section>
        </div>
      </div>
      <ActivityDrawer />
    </div>
  );
}
