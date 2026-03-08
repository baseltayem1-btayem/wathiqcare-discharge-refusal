"use client";

type DischargeRefusalStatusBadgeProps = {
  status?: string | null;
};

export default function DischargeRefusalStatusBadge({ status }: DischargeRefusalStatusBadgeProps) {
  const normalized = (status || "draft").toLowerCase();
  const className =
    normalized === "escalated" || normalized === "escalation_required"
      ? "bg-rose-100 text-rose-700"
      : normalized === "active"
        ? "bg-cyan-100 text-cyan-800"
        : "bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{normalized}</span>;
}
