"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isAdministrator, toShortSha } from "@/lib/release-governance";
import { apiFetch } from "@/utils/api";

type ReleaseSnapshot = {
  version: string;
  environment: string;
  buildDate: string;
  commitSha: string;
};

type ReleaseResponse = {
  data?: ReleaseSnapshot;
};

export default function AdminReleaseFooterBadge({
  userType,
  platformRole,
  role,
}: {
  userType?: string | null;
  platformRole?: string | null;
  role?: string | null;
}) {
  const [snapshot, setSnapshot] = useState<ReleaseSnapshot | null>(null);

  useEffect(() => {
    if (!isAdministrator({ userType, platformRole, role })) {
      return;
    }

    apiFetch<ReleaseResponse>("/api/admin/release-governance/summary", {
      cache: "no-store",
      authFailureMode: "inline",
    })
      .then((response) => {
        if (response?.data) {
          setSnapshot(response.data);
        }
      })
      .catch(() => {
        // Best-effort informational widget only.
      });
  }, [platformRole, role, userType]);

  if (!snapshot) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-300">
      <span className="rounded border border-white/20 px-2 py-0.5">Version {snapshot.version}</span>
      <span className="rounded border border-white/20 px-2 py-0.5">Env {snapshot.environment}</span>
      <span className="rounded border border-white/20 px-2 py-0.5">Build {snapshot.buildDate}</span>
      <span className="rounded border border-white/20 px-2 py-0.5">Commit {toShortSha(snapshot.commitSha)}</span>
      <Link href="/admin/release-dashboard" className="rounded border border-cyan-400/40 px-2 py-0.5 text-cyan-200 hover:bg-cyan-500/10">
        Release Dashboard
      </Link>
    </div>
  );
}
