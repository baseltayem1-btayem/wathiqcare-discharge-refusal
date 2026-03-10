import { type ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "primary" | "success" | "warning" | "error";
};

const VARIANT_STYLES = {
  default: "bg-slate-50 border-slate-200",
  primary: "bg-blue-50 border-blue-200",
  success: "bg-emerald-50 border-emerald-200",
  warning: "bg-amber-50 border-amber-200",
  error: "bg-rose-50 border-rose-200",
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = "default",
}: StatCardProps) {
  return (
    <article className={`rounded-2xl border p-4 ${VARIANT_STYLES[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="rounded-lg bg-white/80 p-2.5 text-slate-700">
            {icon}
          </div>
        ) : null}
      </div>
      
      {trend && trendValue ? (
        <div className="mt-3 flex items-center gap-1.5 text-sm">
          {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-600" />}
          {trend === "down" && <TrendingDown className="h-4 w-4 text-rose-600" />}
          {trend === "neutral" && <Minus className="h-4 w-4 text-slate-500" />}
          <span className={
            trend === "up" ? "text-emerald-600 font-medium" :
            trend === "down" ? "text-rose-600 font-medium" :
            "text-slate-500"
          }>
            {trendValue}
          </span>
        </div>
      ) : null}
    </article>
  );
}
