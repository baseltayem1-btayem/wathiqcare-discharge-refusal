"use client";

import type { ReactNode } from "react";

export type EnterpriseSidebarItem = {
  id: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  badge?: string | number;
  active?: boolean;
};

export type EnterpriseSidebarSection = {
  id: string;
  label: string;
  items: EnterpriseSidebarItem[];
};

export type EnterpriseSidebarProps = {
  brand: { primary: string; secondary?: string };
  sections: EnterpriseSidebarSection[];
  footer?: ReactNode;
};

/**
 * Dense hierarchical sidebar with section headers, items, and optional
 * count badges. Stateless — caller owns navigation state.
 */
export default function EnterpriseSidebar({ brand, sections, footer }: EnterpriseSidebarProps) {
  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: "var(--wc-ent-surface-sidebar)",
        color: "var(--wc-ent-fg-on-dark)",
        fontSize: "var(--wc-ent-font-md)",
      }}
      data-testid="enterprise-sidebar"
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="font-semibold leading-tight">{brand.primary}</div>
        {brand.secondary ? (
          <div className="text-xs" style={{ color: "var(--wc-ent-fg-on-dark-muted)" }}>
            {brand.secondary}
          </div>
        ) : null}
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.id} className="mb-2">
            <div
              className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--wc-ent-fg-on-dark-muted)" }}
            >
              {section.label}
            </div>
            <ul>
              {section.items.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href ?? "#"}
                    className="flex items-center justify-between px-4 py-1.5 transition"
                    style={{
                      background: item.active
                        ? "var(--wc-ent-surface-sidebar-active)"
                        : "transparent",
                      borderInlineStart: item.active
                        ? "3px solid #5fa8ff"
                        : "3px solid transparent",
                    }}
                    data-active={item.active ? "true" : "false"}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon ? <span aria-hidden>{item.icon}</span> : null}
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined ? (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: "rgba(255,255,255,0.12)",
                          color: "var(--wc-ent-fg-on-dark)",
                        }}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {footer ? (
        <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
