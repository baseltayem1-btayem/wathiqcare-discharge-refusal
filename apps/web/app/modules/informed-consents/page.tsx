"use client";

import Link from "next/link";
import {
  Activity,
  Bell,
  BookOpen,
  CheckSquare,
  ChevronRight,
  ClipboardList,
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

const quickServices = [
  {
    title: "Create Consent",
    subtitle: "New procedure consent",
    href: "/modules/informed-consents/create",
    icon: FileText,
    color: "bg-cyan-500",
  },
  {
    title: "Pending Consents",
    subtitle: "7 awaiting response",
    href: "/modules/informed-consents/pending",
    icon: Clock,
    color: "bg-amber-400",
  },
  {
    title: "Approved Forms",
    subtitle: "Browse form library",
    href: "/modules/informed-consents/forms",
    icon: CheckSquare,
    color: "bg-emerald-500",
  },
  {
    title: "Anesthesia Queue",
    subtitle: "4 patients queued",
    href: "/modules/informed-consents/anesthesia",
    icon: Activity,
    color: "bg-violet-500",
  },
  {
    title: "Patient Education",
    subtitle: "Education resources",
    href: "/modules/informed-consents/education",
    icon: BookOpen,
    color: "bg-sky-700",
  },
  {
    title: "Compliance Review",
    subtitle: "Smart AI audit",
    href: "/modules/informed-consents/compliance",
    icon: ShieldCheck,
    color: "bg-teal-500",
  },
  {
    title: "Consent Records",
    subtitle: "Historical archive",
    href: "/modules/informed-consents/records",
    icon: Archive,
    color: "bg-rose-500",
  },
  {
    title: "Audit Trail",
    subtitle: "Legal evidence log",
    href: "/modules/informed-consents/audit",
    icon: HeartPulse,
    color: "bg-yellow-500",
  },
];

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

const recentActivity = [
  ["Layla Hassan", "Appendectomy", "9:14 AM", "Signed"],
  ["Omar Al-Rashidi", "Cardiac Catheterization", "8:47 AM", "Pending"],
  ["Sara Al-Mansouri", "Knee Replacement", "8:02 AM", "Approved"],
  ["Khalid Nasser", "Anesthesia Pre-op", "Yesterday", "Anesthesia"],
];

function statusClass(status: string) {
  if (status === "Signed") return "bg-sky-50 text-sky-700";
  if (status === "Pending") return "bg-amber-50 text-amber-700";
  if (status === "Approved") return "bg-emerald-50 text-emerald-700";
  return "bg-cyan-50 text-cyan-700";
}

export default function DoctorWorkspacePage() {
  return (
    <main className="min-h-screen bg-[#F6FAFB] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#0E6E9E] text-white">
              <UserCircle size={23} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#123047]">WathiqCare</p>
              <p className="text-xs text-slate-500">Doctor Workspace</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-6">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Services
            </p>
            <div className="space-y-1">
              {sidebarItems.map(([label, href, Icon], index) => (
                <Link
                  key={label}
                  href={href}
                  className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition hover:bg-cyan-50 ${
                    index === 0 ? "bg-cyan-50 text-[#0E6E9E]" : "text-slate-600"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={17} />
                    {label}
                  </span>
                  {index === 0 && <ChevronRight size={16} />}
                </Link>
              ))}
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
              <h1 className="text-2xl font-extrabold text-[#123047]">
                Doctor Workspace
              </h1>
              <p className="text-sm text-slate-500">Tuesday, June 9, 2026</p>
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
            <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D4371] via-[#1976D2] to-[#20C5BA] p-7 text-white shadow-sm">
              <p className="text-lg font-bold">Good morning, Dr. Ahmad</p>
              <p className="mt-1 text-sm text-white/80">
                Here's your clinical consent activity for today — Tuesday, June 9, 2026
              </p>

              <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
                <div>
                  <p className="text-3xl font-extrabold">7</p>
                  <p className="text-sm text-white/75">Pending Consents</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold">12</p>
                  <p className="text-sm text-white/75">Signed Today</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold">4</p>
                  <p className="text-sm text-white/75">Anesthesia Queue</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold">98%</p>
                  <p className="text-sm text-white/75">Compliance Score</p>
                </div>
              </div>
            </section>

            <section className="mt-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              <p>
                <span className="font-bold">2 consents awaiting patient signature</span>
                {" "}— Send reminders or re-issue secure links
              </p>
              <Link
                href="/modules/informed-consents/pending"
                className="rounded-full bg-amber-400 px-5 py-2 font-bold text-white"
              >
                View
              </Link>
            </section>

            <section className="mt-7">
              <h2 className="mb-4 text-sm font-bold text-slate-600">Quick Services</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {quickServices.map(({ title, subtitle, href, icon: Icon, color }) => (
                  <Link
                    key={title}
                    href={href}
                    className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${color} text-white`}>
                      <Icon size={22} />
                    </div>
                    <p className="mt-4 font-bold text-[#123047]">{title}</p>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="mt-7">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-600">Recent Activity</h2>
                <Link href="/modules/informed-consents/records" className="text-sm font-semibold text-cyan-700">
                  See all
                </Link>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Patient</th>
                      <th className="px-5 py-4">Procedure</th>
                      <th className="px-5 py-4">Time</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map(([patient, procedure, time, status]) => (
                      <tr key={patient} className="border-t border-slate-100">
                        <td className="px-5 py-4 font-semibold text-[#123047]">{patient}</td>
                        <td className="px-5 py-4 text-slate-600">{procedure}</td>
                        <td className="px-5 py-4 text-slate-500">{time}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <ChevronRight size={16} className="text-slate-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
