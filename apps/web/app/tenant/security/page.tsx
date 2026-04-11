"use client";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";

export default function TenantSecurityPage() {
  return (
    <AuthGuard>
      <AppShell
        title="Security & Permissions"
        subtitle="Temporarily disabled during the stabilization program"
      >
        <div className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <h2 className="text-lg font-semibold">Route temporarily disabled</h2>
          <p className="mt-2 text-sm text-amber-800">
            This route is offline until tenant role APIs and permission management are fully validated. User administration
            remains available through the dedicated tenant user management flow.
          </p>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
