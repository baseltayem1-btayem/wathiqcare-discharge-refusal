"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";

export default function SuperAdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Super admin goes to /platform
    router.replace("/platform");
  }, [router]);

  return (
    <AuthGuard>
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">Redirecting to Platform Admin…</p>
      </div>
    </AuthGuard>
  );
}
