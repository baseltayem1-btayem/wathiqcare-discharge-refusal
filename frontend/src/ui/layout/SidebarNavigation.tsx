"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_ITEMS } from "@/ui/navigation/menu";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SidebarNavigation() {
  const pathname = usePathname();

  return (
    <aside className="ui-panel hidden h-[calc(100vh-32px)] w-72 shrink-0 flex-col p-4 lg:flex">
      <div className="rounded-xl bg-[var(--ui-primary-soft)] p-3">
        <p className="ui-kicker">WathiqCare</p>
        <p className="mt-1 text-sm font-semibold text-[var(--ui-text)]">Medico-Legal Platform</p>
      </div>

      <nav className="mt-4 space-y-1">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-2 rounded-xl bg-[var(--ui-primary)] px-3 py-2 text-sm font-semibold text-white"
                  : "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)]"
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
