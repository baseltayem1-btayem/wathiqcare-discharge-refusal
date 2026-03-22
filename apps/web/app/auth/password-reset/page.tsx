import { Suspense } from "react";
import Link from "next/link";

import PasswordResetClient from "./reset-client";

export default function PasswordResetPage() {
    return (
        <main className="min-h-screen bg-[#eff7fa] px-4 py-10">
            <div className="mx-auto max-w-xl">
                <Link href="/login" className="mb-6 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-800">
                    Back to login
                </Link>
                <Suspense fallback={<div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading password reset…</div>}>
                    <PasswordResetClient />
                </Suspense>
            </div>
        </main>
    );
}