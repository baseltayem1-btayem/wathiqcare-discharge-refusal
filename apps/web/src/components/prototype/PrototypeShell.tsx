"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  FileCheck,
  Stethoscope,
  Network,
  Home,
  ArrowLeft,
  Link2,
  UserCheck,
} from "lucide-react";

const navItems = [
  {
    href: "/prototype",
    label: "Hub",
    icon: Home,
    exact: true,
  },
  {
    href: "/prototype/approved-forms-v2",
    label: "Approved Forms V2",
    icon: FileCheck,
  },
  {
    href: "/prototype/procedure-mapping-engine",
    label: "Procedure Mapping",
    icon: Network,
  },
  {
    href: "/prototype/doctor-workspace-v2",
    label: "Doctor Workspace V2",
    icon: Stethoscope,
  },
  {
    href: "/prototype/content-mapping-service",
    label: "Content Mapping",
    icon: Link2,
  },
  {
    href: "/prototype/consent-journey",
    label: "Consent Journey",
    icon: UserCheck,
  },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PrototypeShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/prototype";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Prototype Lab
              </h1>
              <p className="text-xs text-slate-500">24-Hour Acceleration Mode</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit Prototype
          </Link>
        </div>
        <nav className="border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <ul className="flex gap-1 overflow-x-auto py-2">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href, item.exact);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
