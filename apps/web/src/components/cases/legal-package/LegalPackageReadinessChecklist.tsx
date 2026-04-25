"use client";

import { Badge } from "@/components/design-system/badge";

type ChecklistItem = {
  key: string;
  label: string;
  passed: boolean;
  reason: string;
};

type Props = {
  canGenerate: boolean;
  checklist: ChecklistItem[];
  missing: ChecklistItem[];
};

export default function LegalPackageReadinessChecklist({ canGenerate, checklist, missing }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={canGenerate ? "success" : "warning"}>
          {canGenerate ? "READY_TO_GENERATE" : "DRAFT"}
        </Badge>
        <span className="text-sm text-slate-600">{canGenerate ? "All generation requirements are satisfied." : "Generation is blocked until missing requirements are completed."}</span>
      </div>

      <div className="space-y-2">
        {checklist.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <span>{item.label}</span>
            <Badge variant={item.passed ? "success" : "warning"}>{item.passed ? "OK" : "MISSING"}</Badge>
          </div>
        ))}
      </div>

      {missing.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <div className="font-semibold">Missing requirements</div>
          <ul className="mt-1 space-y-1">
            {missing.map((item) => (
              <li key={`missing-${item.key}`}>• {item.reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
