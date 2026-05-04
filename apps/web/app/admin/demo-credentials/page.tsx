"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check, ShieldAlert, ArrowLeft, Eye, EyeOff } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch, clearToken } from "@/utils/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type MeResponse = {
  platformRole?: string | null;
  userType?: string;
};

const DEMO_CREDENTIALS = [
  { username: "superadmin", email: "superadmin@wathiqcare.local", password: "Admin@12345", role: "Platform Super Admin", domain: "wathiqcare.local", status: "active" },
  { username: "imc.admin", email: "imc.admin@imc.local", password: "Welcome@123", role: "Hospital Admin (IMC)", domain: "imc.local", status: "active" },
  { username: "imc.jeddah.doctor1", email: "imc.jeddah.doctor1@imc.local", password: "Doctor@123", role: "Doctor (IMC Jeddah)", domain: "imc.local", status: "active" },
  { username: "imc.jeddah.nurse1", email: "imc.jeddah.nurse1@imc.local", password: "Nurse@123", role: "Nurse (IMC Jeddah)", domain: "imc.local", status: "active" },
  { username: "imc.legal", email: "imc.legal@imc.local", password: "Legal@123", role: "Legal Officer (IMC)", domain: "imc.local", status: "active" },
  { username: "imc.medicaldirector", email: "imc.medicaldirector@imc.local", password: "Medical@123", role: "Medical Director (IMC)", domain: "imc.local", status: "active" },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available
    }
  }
  return (
    <button
      type="button"
      onClick={() => { void handleCopy(); }}
      className="ml-1 rounded p-0.5 text-slate-400 transition hover:text-slate-700"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function PasswordCell({ password }: { password: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-800">
        {show ? password : "••••••••••"}
      </code>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="text-slate-400 hover:text-slate-700 transition"
        title={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <CopyButton text={password} />
    </div>
  );
}

export default function DemoCredentialsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch<MeResponse>("/api/auth/me", { cache: "no-store", authFailureMode: "inline" })
      .then((me) => {
        const isPlatformAdmin = me?.userType === "platform_admin" ||
          me?.platformRole === "platform_superadmin" ||
          me?.platformRole === "platform_admin";
        setAuthorized(isPlatformAdmin);
        if (!isPlatformAdmin) {
          router.replace("/login");
        }
      })
      .catch(() => {
        setAuthorized(false);
        router.replace("/login");
      });
  }, [router]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* best-effort */ }
    clearToken();
    router.replace("/login");
  }

  if (authorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Checking authorization…</p>
      </div>
    );
  }

  if (authorized === false) {
    return null;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <div className="h-[3px] bg-[linear-gradient(90deg,#7c3aed,#0891b2,#7c3aed)]" />

        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/platform" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
                <ArrowLeft className="h-4 w-4" />
                Platform
              </Link>
              <span className="text-slate-300">|</span>
              <span className="text-sm font-semibold text-slate-800">Demo Credentials</span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => { void handleLogout(); }}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Super Admin — Restricted Access</p>
              <p className="text-xs text-amber-700 mt-0.5">
                These are demo credentials for testing and onboarding purposes only.
                Do not share outside the platform admin team.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h1 className="text-lg font-bold text-slate-900">WathiqCare Demo Accounts</h1>
              <p className="text-sm text-slate-500 mt-0.5">All demo users are pre-seeded. Use username login on /login.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Password</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEMO_CREDENTIALS.map((cred) => (
                    <tr key={cred.username} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <code className="rounded bg-cyan-50 px-1.5 py-0.5 text-xs font-mono text-cyan-800">{cred.username}</code>
                          <CopyButton text={cred.username} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-600">{cred.email}</span>
                          <CopyButton text={cred.email} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PasswordCell password={cred.password} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{cred.role}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {cred.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-400">
                To seed these users: <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-600">node apps/web/scripts/seed-demo-users.mjs</code>
              </p>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
