"use client";

import Link from "next/link";
import { Database, Wifi } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/components/design-system/utils";

export type WathiqCareShellNavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  active?: boolean;
  ariaLabel?: string;
};

export type WathiqCareShellAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  ariaLabel?: string;
};

type WathiqCareShellProps = {
  title: string;
  subtitle?: string;
  pathname?: string;
  headerEyebrow?: string;
  brand?: ReactNode;
  menuItems?: WathiqCareShellNavItem[];
  statusItems?: ReactNode;
  utilityControls?: ReactNode;
  moduleMeta?: ReactNode;
  nextAction?: WathiqCareShellAction | null;
  quickActions?: WathiqCareShellAction[];
  toolbarExtras?: ReactNode;
  headerExtras?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  isRtl?: boolean;
  contentClassName?: string;
};

const DEFAULT_FOOTER = (
  <>
    <span>International Medical Center (IMC)</span>
    <span>Clinical Discharge Refusal &amp; Legal Evidence Module</span>
    <span>CR: 4030143596</span>
    <span>Version: 7.2.4</span>
  </>
);

function ShellActionButton({ action }: { action: WathiqCareShellAction }) {
  const className = cn(
    "toolbar-btn",
    action.variant === "primary" && "toolbar-btn-primary",
    action.variant === "secondary" && "toolbar-btn-secondary",
    action.variant === "danger" && "toolbar-btn-danger",
    action.variant === "ghost" && "toolbar-btn-ghost",
    action.disabled && "toolbar-btn-disabled",
  );

  const content = (
    <>
      {action.icon ? <span className="toolbar-btn__icon">{action.icon}</span> : null}
      <span>{action.label}</span>
    </>
  );

  if (action.href && !action.disabled) {
    return (
      <Link href={action.href} aria-label={action.ariaLabel || action.label} className={className}>
        {content}
      </Link>
    );
  }

  if (action.href && action.disabled) {
    return (
      <span aria-disabled="true" className={className}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.ariaLabel || action.label}
      className={className}
    >
      {content}
    </button>
  );
}

function ShellNavItem({ item }: { item: WathiqCareShellNavItem }) {
  const className = cn(
    "wc-menu-link",
    item.active && "wc-menu-link-active",
    item.disabled && "wc-menu-link-disabled",
  );

  const content = (
    <>
      {item.icon ? <span className="wc-menu-link__icon">{item.icon}</span> : null}
      <span>{item.label}</span>
    </>
  );

  if (item.disabled) {
    return (
      <span aria-disabled="true" className={className}>
        {content}
      </span>
    );
  }

  return (
    <Link href={item.href} aria-label={item.ariaLabel || item.label} className={className}>
      {content}
    </Link>
  );
}

function DefaultBrand() {
  return (
    <div className="wc-brand-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/wathiqcare-logo.png"
        alt="WathiqCare"
        width={120}
        height={32}
        className="h-7 w-auto object-contain"
        loading="eager"
        decoding="async"
      />
      <div className="wc-brand-copy">
        <div className="wc-brand-title">WathiqCare System</div>
        <div className="wc-brand-subtitle">International Medical Center (IMC)</div>
      </div>
    </div>
  );
}

export default function WathiqCareShell({
  title,
  subtitle,
  pathname,
  headerEyebrow = "Clinical Discharge Refusal & Legal Evidence Module",
  brand,
  menuItems = [],
  statusItems,
  utilityControls,
  moduleMeta,
  nextAction,
  quickActions = [],
  toolbarExtras,
  headerExtras,
  footer,
  children,
  isRtl = false,
  contentClassName,
}: WathiqCareShellProps) {
  return (
    <div className="wc-clinical-shell" dir={isRtl ? "rtl" : "ltr"}>
      <header className="wc-topbar">
        <div className="wc-topbar__brand">{brand || <DefaultBrand />}</div>
        <div className="wc-topbar__status">
          <span className="wc-system-indicator">
            <Wifi className="h-3.5 w-3.5" />
            <span>System Online</span>
          </span>
          <span className="wc-system-indicator">
            <Database className="h-3.5 w-3.5" />
            <span>Database Active</span>
          </span>
          {statusItems}
          {utilityControls ? <div className="wc-topbar__utilities">{utilityControls}</div> : null}
        </div>
      </header>

      <div className="wc-menubar">
        <nav className="wc-menubar__nav" aria-label="System menu">
          {menuItems.map((item) => (
            <ShellNavItem key={item.href} item={item} />
          ))}
        </nav>
      </div>

      <section className="wc-module-header">
        <div>
          <div className="wc-module-header__eyebrow">{headerEyebrow}</div>
          <h1 className="wc-module-header__title">{title}</h1>
          {subtitle ? <p className="wc-module-header__subtitle">{subtitle}</p> : null}
          {pathname ? <div className="wc-module-header__path">{pathname}</div> : null}
        </div>
        <div className="wc-module-header__meta">
          <span className="wc-module-pill">CR: 4030143596</span>
          <span className="wc-module-pill">Version: 7.2.4</span>
          {moduleMeta}
        </div>
      </section>

      {headerExtras ? <section className="wc-header-extras">{headerExtras}</section> : null}

      <section className="wc-toolbar">
        <div className="wc-toolbar__actions">
          {nextAction ? <ShellActionButton action={{ ...nextAction, variant: nextAction.variant || "primary" }} /> : null}
          {quickActions.map((action) => (
            <ShellActionButton key={`${action.label}-${action.href || "button"}`} action={{ ...action, variant: action.variant || "secondary" }} />
          ))}
        </div>
        {toolbarExtras ? <div className="wc-toolbar__extras">{toolbarExtras}</div> : null}
      </section>

      <main className={cn("wc-content-area", contentClassName)}>{children}</main>

      <footer className="wc-footer">
        <div className="wc-footer__meta">{footer || DEFAULT_FOOTER}</div>
      </footer>
    </div>
  );
}