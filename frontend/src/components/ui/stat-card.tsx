import { type ReactNode } from "react";

type StatTone = "default" | "active" | "under-review" | "resolved" | "high-risk" | "info";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  tone?: StatTone;
};

const TONE_STYLES: Record<StatTone, { icon: string }> = {
  default: { icon: "bg-gray-100 text-gray-700" },
  active: { icon: "bg-red-100 text-red-700" },
  "under-review": { icon: "bg-yellow-100 text-yellow-700" },
  resolved: { icon: "bg-green-100 text-green-700" },
  "high-risk": { icon: "bg-purple-100 text-purple-700" },
  info: { icon: "bg-blue-100 text-blue-700" },
};

export type { StatCardProps, StatTone };

export default function StatCard({ title, value, description, icon, tone = "default" }: StatCardProps) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
        </div>
        {icon ? (
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${TONE_STYLES[tone].icon}`}>
            {icon}
          </div>
        ) : null}
      </div>
    </article>
  );
}
