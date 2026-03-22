import { Suspense } from "react";

import PasswordResetClient from "./reset-client";

export default function PasswordResetPage() {
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
