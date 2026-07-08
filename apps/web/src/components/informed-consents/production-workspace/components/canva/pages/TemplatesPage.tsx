"use client";

import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/design-system";

export function TemplatesPage() {
  return (
    <div className="bg-white border border-slate-200 rounded-[10px] p-[14px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm text-slate-800">Consent Templates</h2>
        <Button
          variant="brand"
          size="sm"
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1"
          disabled
        >
          <Plus className="w-3 h-3" /> New Template
        </Button>
      </div>
      <div className="py-10 text-center">
        <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="text-[11px] text-slate-500 mb-1">No templates available.</p>
        <p className="text-[10px] text-slate-500">
          Template management is not enabled in this release.
        </p>
      </div>
    </div>
  );
}
