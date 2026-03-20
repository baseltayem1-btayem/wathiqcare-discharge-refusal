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
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  active: "bg-red-100 text-red-800 border-red-200",
  "in-progress": "bg-red-100 text-red-800 border-red-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  escalated: "bg-red-100 text-red-800 border-red-200",
  "high-risk": "bg-purple-100 text-purple-800 border-purple-200 font-semibold",
  "under-review": "bg-yellow-100 text-yellow-800 border-yellow-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
  success: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  error: "bg-red-100 text-red-800 border-red-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function StatusBadge({ variant, children, label }: StatusBadgeProps) {
  const content = children || label || variant;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${VARIANT_STYLES[variant]}`}>
      {content}
    </span>
  );
}
