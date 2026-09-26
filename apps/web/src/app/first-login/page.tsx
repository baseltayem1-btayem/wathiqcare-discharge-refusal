"use client";

import { useEffect, useState } from "react";
import type React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch, clearToken } from "@/utils/api";
import { PASSWORD_REQUIREMENTS } from "@/lib/password-policy";
import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormField,
  Input,
} from "@/components/design-system";

function validateClientPassword(password: string): string | null {
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`;
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    return "Password must contain at least one number";
  }
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Password must contain at least one special character";
  }
  return null;
}

export default function FirstLoginPage() {
  const { isRtl, lang } = useI18n();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const copy = {
    title: isRtl ? "تعيين كلمة المرور" : "Set Your Password",
    subtitle: isRtl
      ? "يجب تغيير كلمة المرور المؤقتة قبل المتابعة."
      : "You must set a new password before continuing.",
    notice: isRtl
      ? "تم تسجيل دخولك بكلمة مرور مؤقتة. يرجى تحديثها الآن."
      : "You are logged in with a temporary password. Please update it now.",
    newPasswordLabel: isRtl ? "كلمة المرور الجديدة" : "New Password",
    newPasswordPlaceholder: isRtl ? "أدخل كلمة المرور الجديدة" : "Enter new password",
    confirmPasswordLabel: isRtl ? "تأكيد كلمة المرور" : "Confirm New Password",
    confirmPasswordPlaceholder: isRtl ? "أعد إدخال كلمة المرور" : "Re-enter new password",
    requirement: isRtl
      ? "12 حرفًا على الأقل مع حرف كبير وحرف صغير ورقم ورمز."
      : "Min. 12 chars with uppercase, lowercase, number & symbol.",
    mismatch: isRtl ? "كلمتا المرور غير متطابقتين" : "Passwords do not match",
    submit: isRtl ? "تحديث كلمة المرور" : "Set New Password",
    submitting: isRtl ? "جاري التحديث..." : "Updating...",
    signOutInstead: isRtl ? "تسجيل الخروج" : "Sign out instead",
    genericError: isRtl ? "فشل تحديث كلمة المرور. حاول مرة أخرى." : "Failed to update password. Please try again.",
  };

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      try {
        await apiFetch("/api/auth/me", {
          method: "GET",
          authFailureMode: "inline",
        });
      } catch (err: unknown) {
        const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : null;
        // 403 means the session is valid but a password reset is required — that is exactly why we are here.
        if (status !== 403) {
          if (!cancelled) {
            router.replace("/login");
          }
          return;
        }
      }
      if (!cancelled) {
        setCheckingSession(false);
      }
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const passwordError = validateClientPassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(copy.mismatch);
      return;
    }

    setLoading(true);
    try {
      await apiFetch<{ ok: boolean }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ newPassword }),
        authFailureMode: "inline",
      });
      router.push("/modules");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : copy.genericError;
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // best-effort
    }
    clearToken();
    router.replace("/login");
  }

  if (checkingSession) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-4"
        style={{
          background:
            "radial-gradient(circle at 82% 10%, rgba(173, 213, 255, 0.28), transparent 34%), linear-gradient(180deg, #f2f7fc 0%, #edf3fa 100%)",
        }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--wc-border)] border-t-[var(--wc-blue)]" />
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-10"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        background:
          "radial-gradient(circle at 82% 10%, rgba(173, 213, 255, 0.28), transparent 34%), linear-gradient(180deg, #f2f7fc 0%, #edf3fa 100%)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <Image
            src="/images/wathiqcare-logo.png"
            alt="WathiqCare"
            width={180}
            height={55}
            className="h-auto w-[150px] object-contain"
            priority
          />
        </div>

        <Card variant="login" className="p-6 sm:p-8">
          <CardHeader className="p-0 pb-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className={`text-lg ${isRtl ? "arabic-headline" : ""}`}>{copy.title}</CardTitle>
                <CardDescription className={`text-xs ${isRtl ? "arabic-body" : ""}`}>{copy.subtitle}</CardDescription>
              </div>
            </div>

            <Alert variant="warning" icon={<ShieldCheck className="h-4 w-4" />}>
              <span className={isRtl ? "arabic-body" : ""}>{copy.notice}</span>
            </Alert>
          </CardHeader>

          <Form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <FormField
              name="new-password"
              label={<span className={isRtl ? "arabic-body" : ""}>{copy.newPasswordLabel}</span>}
              htmlFor="new-password"
            >
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                required
                autoFocus
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={copy.newPasswordPlaceholder}
                size="xl"
                startIcon={<Lock className="h-5 w-5" aria-hidden="true" />}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowNew((prev) => !prev)}
                    className="text-slate-400 transition hover:text-slate-600"
                    aria-label={showNew ? "Hide password" : "Show password"}
                    aria-pressed={showNew}
                  >
                    {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
                className={isRtl ? "text-right arabic-body" : "text-left"}
              />
              <p className={`mt-1 text-xs text-slate-500 ${isRtl ? "arabic-body" : ""}`}>{copy.requirement}</p>
            </FormField>

            <FormField
              name="confirm-password"
              label={<span className={isRtl ? "arabic-body" : ""}>{copy.confirmPasswordLabel}</span>}
              htmlFor="confirm-password"
            >
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={copy.confirmPasswordPlaceholder}
                size="xl"
                startIcon={<Lock className="h-5 w-5" aria-hidden="true" />}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="text-slate-400 transition hover:text-slate-600"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    aria-pressed={showConfirm}
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
                className={isRtl ? "text-right arabic-body" : "text-left"}
              />
            </FormField>

            {error ? (
              <Alert variant="error" className={isRtl ? "arabic-body" : ""}>
                {error}
              </Alert>
            ) : null}

            <Button
              type="submit"
              variant="brand"
              size="xl"
              fullWidth
              uppercase={false}
              disabled={loading}
              className={`${isRtl ? "arabic-body" : ""}`}
            >
              {loading ? copy.submitting : copy.submit}
            </Button>
          </Form>

          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className={`text-xs text-slate-400 transition hover:text-slate-600 ${isRtl ? "arabic-body" : ""}`}
            >
              {copy.signOutInstead}
            </button>
          </div>
        </Card>

        <p className={`mt-6 text-center text-xs text-[#5b6f86] ${isRtl ? "arabic-body" : ""}`}>
          © {new Date().getFullYear()} WathiqCare. {isRtl ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </p>
      </div>
    </main>
  );
}
