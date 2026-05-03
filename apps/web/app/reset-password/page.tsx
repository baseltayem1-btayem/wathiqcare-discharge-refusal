import { Suspense } from "react";

/**
 * /reset-password?token=xxx — alias for /auth/password-reset?token=xxx
 * Renders the same PasswordResetClient component.
 */
import PasswordResetClient from "@/app/auth/password-reset/reset-client";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#eef7fb] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Suspense fallback={
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 text-center">
            Loading…
          </div>
        }>
          <PasswordResetClient />
        </Suspense>
      </div>
    </main>
  );
}
