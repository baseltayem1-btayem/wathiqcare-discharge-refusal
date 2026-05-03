"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { apiFetch, clearToken } from "@/utils/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function FirstLoginPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    const lang = typeof window !== "undefined" ? document.documentElement.lang : "en";
    setIsRtl(lang === "ar");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError(isRtl ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(isRtl ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await apiFetch<{ ok?: boolean }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
        authFailureMode: "inline",
      });
      setSuccess(true);
      // Redirect to dashboard after brief delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRtl ? "فشل تحديث كلمة المرور" : "Failed to update password. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // best-effort
    }
    clearToken();
    router.replace("/login");
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef7fb] px-4">
        <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
          <div className="mb-4 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isRtl ? "تم تحديث كلمة المرور" : "Password Updated"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isRtl ? "تمت عملية التحديث بنجاح. سيتم توجيهك تلقائياً..." : "Password changed successfully. Redirecting you now…"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef7fb] px-4">
      <div className="w-full max-w-md" dir={isRtl ? "rtl" : "ltr"}>
        <div className="mb-6 flex items-center justify-between">
          <Image
            src="/images/wathiqcare-logo.png"
            alt="WathiqCare"
            width={140}
            height={42}
            className="h-auto w-[110px] object-contain"
          />
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {isRtl ? "تغيير كلمة المرور الأولي" : "Set Your Password"}
              </h1>
              <p className="text-xs text-slate-500">
                {isRtl ? "يجب تغيير كلمة المرور المؤقتة قبل الدخول" : "You must set a new password before accessing the system"}
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {isRtl
              ? "تم تسجيل دخولك بكلمة مرور مؤقتة. يرجى تحديث كلمة مرورك الآن."
              : "You are logged in with a temporary password. Please update it now to continue."}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">
                {isRtl ? "كلمة المرور الجديدة" : "New Password"}
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  required
                  autoFocus
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pe-10 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                  placeholder={isRtl ? "أدخل كلمة المرور الجديدة" : "Enter new password"}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {isRtl ? "8 أحرف على الأقل مع حرف كبير ورقم ورمز" : "Min. 8 chars with uppercase, number & symbol"}
              </p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
                {isRtl ? "تأكيد كلمة المرور" : "Confirm New Password"}
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pe-10 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                  placeholder={isRtl ? "أعد إدخال كلمة المرور" : "Re-enter new password"}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" />
              {loading ? (isRtl ? "جاري التحديث..." : "Updating...") : (isRtl ? "تحديث كلمة المرور" : "Set New Password")}
            </button>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-3 text-center">
            <button
              type="button"
              onClick={() => { void handleLogout(); }}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              {isRtl ? "تسجيل الخروج" : "Sign out instead"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
