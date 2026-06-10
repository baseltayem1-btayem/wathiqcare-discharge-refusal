"use client";

import Link from "next/link";
import type { ReactNode, ComponentType } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  CheckSquare,
  ChevronRight,
  FileCheck,
  FileText,
  Globe2,
  HeartPulse,
  History,
  Search,
  Settings,
  ShieldCheck,
  UserCircle,
  Clock,
  Archive,
} from "lucide-react";

const sidebarItems = [
  ["Create Consent", "/modules/informed-consents/create", FileText],
  ["Pending Consents", "/modules/informed-consents/pending", Clock],
  ["Consent Records", "/modules/informed-consents/records", Archive],
  ["Approved Forms", "/modules/informed-consents/forms", FileCheck],
  ["Anesthesia Queue", "/modules/informed-consents/anesthesia", Activity],
  ["Patient Education", "/modules/informed-consents/education", BookOpen],
  ["Compliance Review", "/modules/informed-consents/compliance", ShieldCheck],
  ["Audit Trail", "/modules/informed-consents/audit", History],
  ["Settings & Support", "/modules/informed-consents/settings", Settings],
] as const;

type WorkspaceIcon = ComponentType<{ size?: number; className?: string }>;

export function DoctorWorkspaceLayout({
  title,
  subtitle,
  activeHref,
  children,
}: {
  title: string;
  subtitle?: string;
  activeHref?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F6FAFB] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <Link
            href="/modules/informed-consents"
            className="flex items-center gap-3 border-b border-slate-100 px-6 py-5"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#0E6E9E] text-white">
              <UserCircle size={23} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#123047]">WathiqCare</p>
              <p className="text-xs text-slate-500">Doctor Workspace</p>
            </div>
          </Link>

          <nav className="flex-1 px-3 py-6">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Services
            </p>
            <div className="space-y-1">
              {sidebarItems.map(([label, href, Icon]) => {
                const active = activeHref === href;
                return (
                  <Link
                    key={label}
                    href={href}
                    className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition hover:bg-cyan-50 ${
                      active ? "bg-cyan-50 text-[#0E6E9E]" : "text-slate-600"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={17} />
                      {label}
                    </span>
                    {active && <ChevronRight size={16} />}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="m-4 rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#0E6E9E] text-xs font-bold text-white">
                AK
              </div>
              <div>
                <p className="text-sm font-semibold">Dr. Ahmad Khalil</p>
                <p className="text-xs text-slate-500">Surgeon | ICU</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#123047]">{title}</h1>
              <p className="text-sm text-slate-500">
                {subtitle || "WathiqCare informed consent production workspace"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 md:flex">
                <Search size={16} className="text-slate-400" />
                <input
                  className="ml-2 w-44 bg-transparent text-sm outline-none"
                  placeholder="Search patients..."
                />
              </div>
              <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#0E6E9E]">
                <Globe2 size={16} />
                English
              </button>
              <button className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white">
                <Bell size={17} />
              </button>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[#0E6E9E] text-sm font-bold text-white">
                AK
              </button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function WorkspaceHero({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-3xl bg-gradient-to-r from-[#0D4371] via-[#1976D2] to-[#20C5BA] p-7 text-white shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/75">
        {label}
      </p>
      <h2 className="mt-3 text-3xl font-extrabold">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">
        {description}
      </p>
    </section>
  );
}

export function WorkspaceCard({
  title,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  description: string;
  icon: WorkspaceIcon;
  href?: string;
}) {
  const body = (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500 text-white">
        <Icon size={22} />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-[#123047]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );

  if (!href) return body;
  return <Link href={href}>{body}</Link>;
}

export const WorkspaceIcons = {
  Activity,
  BookOpen,
  CheckSquare,
  FileCheck,
  FileText,
  HeartPulse,
  History,
  Settings,
  ShieldCheck,
  Clock,
  Archive,
  UserCircle,
};
