"use client";

import { X } from "lucide-react";

type DocumentPreviewDrawerProps = {
  open: boolean;
  title: string;
  htmlContent?: string | null;
  onClose: () => void;
};

export default function DocumentPreviewDrawer({
  open,
  title,
  htmlContent,
  onClose,
}: DocumentPreviewDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50">
      <aside className="h-full w-full max-w-2xl border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-4">
          <iframe
            title={title}
            srcDoc={htmlContent || "<p>No preview available.</p>"}
            className="h-[80vh] w-full rounded-lg border border-slate-200"
          />
        </div>
      </aside>
    </div>
  );
}
