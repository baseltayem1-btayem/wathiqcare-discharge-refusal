"use client";

import type { ReactNode } from "react";
import "@/styles/enterprise-density.css";

export type EnterpriseShellProps = {
  sidebar: ReactNode;
  header: ReactNode;
  ribbon?: ReactNode;
  children: ReactNode;
  direction?: "ltr" | "rtl";
};

/**
 * Phase 12 enterprise dense layout shell.
 *
 * Three-zone grid: fixed sidebar, top header + optional action ribbon,
 * scrollable main canvas. Designed for landscape tablets and physician
 * workstations. Additive — does not replace any existing layout; opt in
 * by rendering inside a page.
 */
export default function EnterpriseShell({
  sidebar,
  header,
  ribbon,
  children,
  direction = "ltr",
}: EnterpriseShellProps) {
  return (
    <div
      dir={direction}
      className="wc-ent-canvas grid min-h-screen"
      style={{
        gridTemplateColumns: "var(--wc-ent-sidebar-w) 1fr",
        gridTemplateRows: "var(--wc-ent-header-h) auto 1fr",
        gridTemplateAreas: `"sidebar header" "sidebar ribbon" "sidebar main"`,
      }}
      data-testid="enterprise-shell"
    >
      <aside style={{ gridArea: "sidebar" }} aria-label="Primary navigation">
        {sidebar}
      </aside>
      <header
        style={{ gridArea: "header" }}
        className="flex items-center border-b"
        data-testid="enterprise-shell-header"
      >
        {header}
      </header>
      {ribbon ? (
        <div
          style={{ gridArea: "ribbon", minHeight: "var(--wc-ent-ribbon-h)" }}
          className="border-b bg-white"
          data-testid="enterprise-shell-ribbon"
        >
          {ribbon}
        </div>
      ) : null}
      <main
        style={{ gridArea: "main" }}
        className="overflow-auto p-4"
        data-testid="enterprise-shell-main"
      >
        {children}
      </main>
    </div>
  );
}
