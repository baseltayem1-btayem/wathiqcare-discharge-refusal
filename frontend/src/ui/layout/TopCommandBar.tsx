"use client";

import Link from "next/link";
import { Bell, ChevronDown, Plus, Search } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const quickCreateItems = [
  { label: "New Patient", href: "/patients/new" },
  { label: "New Case", href: "/cases/new" },
  { label: "New Consent", href: "/consents/new" },
  { label: "New Agreement", href: "/agreements/new" },
  { label: "New ROI Request", href: "/release-of-information/new" },
];

export default function TopCommandBar() {
  return (
    <header className="ui-panel sticky top-4 z-20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-2.5 h-4 w-4 text-[var(--ui-muted)] ltr:left-3 rtl:right-3" />
          <input
            type="search"
            placeholder="Search patients, cases, agreements"
            className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] py-2 text-sm ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
          />
        </div>

        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl bg-[var(--ui-primary)] px-3 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Quick Create
          </summary>
          <div className="absolute z-30 mt-2 w-52 rounded-xl border border-[var(--ui-border)] bg-white p-1 shadow-xl">
            {quickCreateItems.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--ui-surface-2)]">
                {item.label}
              </Link>
            ))}
          </div>
        </details>

        <button
          type="button"
          className="rounded-xl border border-[var(--ui-border)] bg-white p-2 text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-2 text-sm font-medium text-[var(--ui-text)]">
          International Medical Center
        </div>

        <LanguageSwitcher className="!bg-white" />

        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-[var(--ui-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ui-text)]">
            Wathiq Admin
            <ChevronDown className="h-4 w-4" />
          </summary>
          <div className="absolute z-30 mt-2 w-40 rounded-xl border border-[var(--ui-border)] bg-white p-1 shadow-xl">
            <Link href="/settings" className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--ui-surface-2)]">Profile</Link>
            <Link href="/login" className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--ui-surface-2)]">Logout</Link>
          </div>
        </details>
      </div>
    </header>
  );
}
