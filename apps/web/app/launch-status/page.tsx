"use client";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";

export default function LaunchStatusPage() {
  return (
    <AuthGuard>
      <AppShell
        title="Launch Status"
        subtitle="Temporarily disabled during the 7-day stabilization program"
      >
        <div className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <h2 className="text-lg font-semibold">Route temporarily disabled</h2>
          <p className="mt-2 text-sm text-amber-800">
            This page was removed from active use because it was causing a runtime crash. It will remain disabled until the
            launch-status API contract and UI are revalidated together.
          </p>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
