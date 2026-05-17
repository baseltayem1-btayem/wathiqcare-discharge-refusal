"use client";

import Link from "next/link";
import { useEffect } from "react";

type LoginErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LoginError({ error, reset }: LoginErrorProps) {
  useEffect(() => {
    console.error("[login] route error", {
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">تعذر تحميل صفحة تسجيل الدخول</h1>
        <p className="mt-2 text-sm text-slate-600">
          حدث خطأ غير متوقع. يمكنك إعادة المحاولة أو الرجوع إلى الصفحة الرئيسية.
        </p>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
          >
            إعادة المحاولة
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            الرئيسية
          </Link>
        </div>
      </section>
    </main>
  );
}
