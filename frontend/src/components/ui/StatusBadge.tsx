import { type ReactNode } from "react";

export type StatusVariant = 
  | "draft" 
  | "pending" 
  | "active" 
  | "in-progress" 
  | "completed" 
  | "resolved"
  | "escalated" 
  | "high-risk" 
  | "under-review"
  | "closed"
  | "success"
  | "warning"
  | "error"
  | "info";

type StatusBadgeProps = {
  variant: StatusVariant;
  children?: ReactNode;
  label?: string;
};

const VARIANT_STYLES: Record<StatusVariant, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  escalated: "bg-rose-50 text-rose-700 border-rose-200",
  "high-risk": "bg-rose-100 text-rose-800 border-rose-300 font-semibold",
  "under-review": "bg-purple-50 text-purple-700 border-purple-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function StatusBadge({ variant, children, label }: StatusBadgeProps) {
  const content = children || label || variant;
  
  return (
    <span 
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${VARIANT_STYLES[variant]}`}
    >
      {content}
    </span>
  );
}
