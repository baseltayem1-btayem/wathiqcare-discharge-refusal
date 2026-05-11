"use client";

import { Archive, FileOutput, FileText, Printer, Save, Send, XCircle } from "lucide-react";

type ActionBarProps = {
  onAction: (action: string) => void;
};

const ACTIONS = [
  { key: "save-draft", label: "Save Draft", icon: Save, className: "toolbar-btn toolbar-btn-secondary" },
  { key: "submit-review", label: "Submit for Review", icon: Send, className: "toolbar-btn toolbar-btn-secondary" },
  { key: "generate-draft", label: "Generate Draft PDF", icon: FileText, className: "toolbar-btn toolbar-btn-primary" },
  { key: "generate-final", label: "Generate Final Legal PDF", icon: FileOutput, className: "toolbar-btn toolbar-btn-primary" },
  { key: "print", label: "Print", icon: Printer, className: "toolbar-btn toolbar-btn-secondary" },
  { key: "archive", label: "Archive", icon: Archive, className: "toolbar-btn toolbar-btn-secondary" },
  { key: "cancel", label: "Cancel", icon: XCircle, className: "toolbar-btn toolbar-btn-danger" },
] as const;

export default function ActionBar({ onAction }: ActionBarProps) {
  return (
    <footer className="sticky bottom-0 z-10 rounded-t border border-slate-300 bg-white/95 p-3 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.key} type="button" className={action.className} onClick={() => onAction(action.key)}>
              <Icon className="h-3.5 w-3.5" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </footer>
  );
}
