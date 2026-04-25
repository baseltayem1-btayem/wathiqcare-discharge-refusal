"use client";

import Link from "next/link";
import { ReactNode, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Menu, X } from "lucide-react";

type TopNavigationItem = {
  href: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
};

type TopNavigationAction = {
  key?: string;
  href: string;
  label: string;
  icon: ReactNode;
  ariaLabel?: string;
};

type TopNavigationProps = {
  pathname: string;
  items: TopNavigationItem[];
  brand: ReactNode;
  workspaceStatus?: ReactNode;
  quickActions?: TopNavigationAction[];
  quickActionsLabel?: string;
  currentModuleLabel?: string;
  workflowStageLabel?: string;
  workflowSourceLabel?: string;
  nextAction?: TopNavigationAction;
  nextActionLabel?: string;
  secondaryActionsLabel?: string;
  rightControls?: ReactNode;
  mobileFooter?: ReactNode;
  isRtl?: boolean;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TopNavItem({ href, label, icon, active, disabled = false, ariaLabel, onNavigate }: TopNavigationItem & { active: boolean; onNavigate?: () => void }) {
  if (disabled) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm font-medium text-slate-400"
        aria-disabled="true"
      >
        <span className="pointer-events-none shrink-0 text-slate-400">{icon}</span>
        <span>{label}</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={ariaLabel || label}
      className={active
        ? "inline-flex items-center gap-2 rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--primary-pressed)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"
        : "inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm font-medium text-slate-600 outline-none transition hover:border-[var(--border-soft)] hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"}
    >
      <span className="pointer-events-none shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function TopQuickAction({ href, label, icon, ariaLabel, onNavigate }: TopNavigationAction & { onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={ariaLabel || label}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:border-[var(--border)] hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"
    >
      <span className="pointer-events-none shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function TopNavigation({
  pathname,
  items,
  brand,
  workspaceStatus,
  quickActions,
  quickActionsLabel = "Quick actions",
  currentModuleLabel,
  workflowStageLabel,
  workflowSourceLabel,
  nextAction,
  nextActionLabel = "Next legal action",
  secondaryActionsLabel = "Secondary actions",
  rightControls,
  mobileFooter,
  isRtl = false,
}: TopNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSecondaryOpen, setMobileSecondaryOpen] = useState(false);

  const normalizedItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.href)) {
        return false;
      }
      seen.add(item.href);
      return true;
    });
  }, [items]);

  const quickActionPool = quickActions ?? [];
  const resolvedNextAction = nextAction || quickActionPool[0] || null;
  const resolvedSecondaryActions = useMemo(() => {
    const pool = quickActions ?? [];
    if (!resolvedNextAction) {
      return pool;
    }

    const key = resolvedNextAction.key || resolvedNextAction.href;
    return pool.filter((action) => {
      const actionKey = action.key || action.href;
      return actionKey !== key;
    });
  }, [quickActions, resolvedNextAction]);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-[1600px] px-3 py-2 md:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 md:hidden"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="min-w-0">{brand}</div>
          </div>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 px-2 md:flex" aria-label="Primary navigation">
            {normalizedItems.map((item) => (
              <TopNavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">{rightControls}</div>
        </div>

        <div className="mt-2 hidden items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-slate-50/70 px-3 py-2 md:flex">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {currentModuleLabel ? (
                <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-white px-2.5 py-1 text-xs font-semibold text-slate-700" aria-label={currentModuleLabel}>
                  {currentModuleLabel}
                </span>
              ) : null}
              {workflowStageLabel ? (
                <span className="inline-flex items-center rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-pressed)]" aria-label={workflowStageLabel}>
                  {workflowStageLabel}
                </span>
              ) : null}
              {workflowSourceLabel ? (
                <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600" aria-label={workflowSourceLabel}>
                  {workflowSourceLabel}
                </span>
              ) : null}
              {resolvedNextAction ? (
                <>
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{nextActionLabel}</span>
                  <Link
                    href={resolvedNextAction.href}
                    aria-label={resolvedNextAction.ariaLabel || resolvedNextAction.label}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white outline-none transition hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"
                  >
                    <span className="pointer-events-none shrink-0">{resolvedNextAction.icon}</span>
                    <span>{resolvedNextAction.label}</span>
                  </Link>
                </>
              ) : null}
            </div>

            {resolvedSecondaryActions.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2" aria-label={secondaryActionsLabel}>
                {resolvedSecondaryActions.map((action) => (
                  <TopQuickAction key={action.key || action.href} {...action} />
                ))}
              </div>
            ) : null}
          </div>
          {workspaceStatus ? <div className="inline-flex items-center">{workspaceStatus}</div> : null}
        </div>

        {mobileOpen ? (
          <div className="md:hidden">
            <button
              type="button"
              aria-label="Close mobile navigation overlay"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-30 bg-slate-900/30"
            />
            <div
              className={`absolute ${isRtl ? "left-3" : "right-3"} top-[64px] z-40 w-[min(92vw,360px)] rounded-2xl border border-[var(--border)] bg-white p-3 shadow-[var(--shadow-floating)]`}
            >
              <nav className="space-y-1" aria-label="Mobile navigation">
                {normalizedItems.map((item) => (
                  <TopNavItem key={`mobile-${item.href}`} {...item} active={isActive(pathname, item.href)} onNavigate={() => setMobileOpen(false)} />
                ))}
              </nav>

              {currentModuleLabel || workflowStageLabel ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-soft)] pt-3">
                  {currentModuleLabel ? (
                    <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {currentModuleLabel}
                    </span>
                  ) : null}
                  {workflowStageLabel ? (
                    <span className="inline-flex items-center rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-pressed)]">
                      {workflowStageLabel}
                    </span>
                  ) : null}
                  {workflowSourceLabel ? (
                    <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {workflowSourceLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {resolvedNextAction ? (
                <div className="mt-3 border-t border-[var(--border-soft)] pt-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{nextActionLabel}</div>
                  <Link
                    href={resolvedNextAction.href}
                    onClick={() => setMobileOpen(false)}
                    aria-label={resolvedNextAction.ariaLabel || resolvedNextAction.label}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white"
                  >
                    <span className="pointer-events-none shrink-0">{resolvedNextAction.icon}</span>
                    <span>{resolvedNextAction.label}</span>
                  </Link>
                </div>
              ) : null}

              {resolvedSecondaryActions.length > 0 ? (
                <div className="mt-3 border-t border-[var(--border-soft)] pt-3">
                  <button
                    type="button"
                    onClick={() => setMobileSecondaryOpen((current) => !current)}
                    className="inline-flex w-full items-center justify-between rounded-lg border border-[var(--border-soft)] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600"
                    aria-expanded={mobileSecondaryOpen}
                    aria-label={quickActionsLabel}
                  >
                    <span>{quickActionsLabel}</span>
                    {mobileSecondaryOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {mobileSecondaryOpen ? (
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      {resolvedSecondaryActions.map((action) => (
                        <TopQuickAction key={`mobile-action-${action.key || action.href}`} {...action} onNavigate={() => setMobileOpen(false)} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {workspaceStatus ? <div className="mt-3 border-t border-[var(--border-soft)] pt-3">{workspaceStatus}</div> : null}
              {mobileFooter ? <div className="mt-3 border-t border-[var(--border-soft)] pt-3">{mobileFooter}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
