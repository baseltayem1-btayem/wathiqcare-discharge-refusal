"use client";

import { Download } from "lucide-react";

type DocumentDownloadButtonProps = {
  disabled?: boolean;
  onClick: () => void;
  label?: string;
};

export default function DocumentDownloadButton({ disabled, onClick, label = "Download" }: DocumentDownloadButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
