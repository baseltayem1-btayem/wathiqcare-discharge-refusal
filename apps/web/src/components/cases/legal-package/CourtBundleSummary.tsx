"use client";

import { Badge } from "@/components/design-system/badge";

type Props = {
  packageHash: string | null;
  courtBundleDownloadUrl: string | null;
};

export default function CourtBundleSummary({ packageHash, courtBundleDownloadUrl }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-semibold text-slate-800">Court Evidence Package</span>
        <Badge variant={courtBundleDownloadUrl ? "success" : "outline"}>{courtBundleDownloadUrl ? "COURT_READY" : "PENDING"}</Badge>
      </div>
      <div className="text-slate-600">Package Hash: {packageHash || "N/A"}</div>
      <div className="mt-1 text-slate-600">Includes: case summary, timeline, discharge decision, refusal declaration, financial undertaking, notification evidence, risk disclosure, witness record, SMS log, signature certificate, signed PDFs, hash sheet.</div>
    </div>
  );
}
