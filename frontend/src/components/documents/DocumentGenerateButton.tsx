"use client";

import { FilePlus2 } from "lucide-react";

type DocumentGenerateButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  label?: string;
};

export default function DocumentGenerateButton({
  disabled,
  loading,
  onClick,
  label = "Generate Document",
}: DocumentGenerateButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      <FilePlus2 className="h-3.5 w-3.5" />
      {loading ? "Generating..." : label}
    </button>
  );
}
