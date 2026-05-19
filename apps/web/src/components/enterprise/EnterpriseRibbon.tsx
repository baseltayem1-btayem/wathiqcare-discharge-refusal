"use client";

import type { ReactNode } from "react";

export type EnterpriseRibbonAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export type EnterpriseRibbonProps = {
  groups: Array<{
    id: string;
    label?: string;
    actions: EnterpriseRibbonAction[];
  }>;
  trailing?: ReactNode;
};

const variantStyles: Record<NonNullable<EnterpriseRibbonAction["variant"]>, string> = {
  primary: "bg-[color:var(--wc-ent-state-info-bg)] text-[color:var(--wc-ent-state-info-fg)]",
  secondary: "bg-[color:var(--wc-ent-state-neutral-bg)] text-[color:var(--wc-ent-state-neutral-fg)]",
  danger: "bg-[color:var(--wc-ent-state-err-bg)] text-[color:var(--wc-ent-state-err-fg)]",
};

/**
 * Persistent action ribbon under the header. Grouped quick actions in
 * the style of TrakCare/Epic. Stateless — caller wires callbacks.
 */
export default function EnterpriseRibbon({ groups, trailing }: EnterpriseRibbonProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4"
      style={{ minHeight: "var(--wc-ent-ribbon-h)" }}
      data-testid="enterprise-ribbon"
    >
      <div className="flex items-stretch gap-3 overflow-x-auto">
        {groups.map((group, index) => (
          <div
            key={group.id}
            className="flex items-center gap-2 py-1.5"
            style={{
              borderInlineStart: index === 0 ? "none" : "var(--wc-ent-border)",
              paddingInlineStart: index === 0 ? 0 : "var(--wc-ent-space-3)",
            }}
          >
            {group.label ? (
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--wc-ent-fg-muted)" }}
              >
                {group.label}
              </span>
            ) : null}
            {group.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
                  variantStyles[action.variant ?? "secondary"]
                }`}
                data-testid={`enterprise-ribbon-action-${action.id}`}
              >
                {action.icon ? <span aria-hidden>{action.icon}</span> : null}
                {action.label}
              </button>
            ))}
          </div>
        ))}
      </div>
      {trailing ? <div className="flex items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
