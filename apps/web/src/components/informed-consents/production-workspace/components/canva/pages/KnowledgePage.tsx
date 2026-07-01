"use client";

import { Plus, BookOpen } from "lucide-react";
import { Button, Input } from "@/components/design-system";

export function KnowledgePage() {
  return (
    <div className="bg-white border border-slate-200 rounded-[10px] p-[14px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm text-slate-800">Knowledge Base</h2>
        <Button
          variant="brand"
          size="sm"
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1"
          disabled
        >
          <Plus className="w-3 h-3" /> Create Package
        </Button>
      </div>
      <div className="mb-3 flex gap-2">
        <Input
          type="text"
          placeholder="Search knowledge base..."
          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:border-blue-400"
          disabled
        />
        <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] outline-none bg-white" disabled>
          <option>All Categories</option>
        </select>
      </div>
      <div className="py-10 text-center">
        <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="text-[11px] text-slate-500 mb-1">No knowledge packages available.</p>
        <p className="text-[10px] text-slate-500">
          Knowledge package browsing is not enabled in this release.
        </p>
      </div>
    </div>
  );
}
