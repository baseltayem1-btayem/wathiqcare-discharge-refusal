import { type ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type KPICardProps = {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "purple";
  size?: "sm" | "md" | "lg";
};

const VARIANT_STYLES = {
  default: {
    card: "border-slate-200 bg-white",
    value: "text-slate-900",
    icon: "bg-slate-50 text-slate-700 border-slate-200",
  },
  primary: {
    card: "border-blue-200 bg-gradient-to-br from-blue-50 to-white",
    value: "text-blue-900",
    icon: "bg-blue-100 text-blue-700 border-blue-200",
  },
  success: {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
    value: "text-emerald-900",
    icon: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  warning: {
    card: "border-amber-200 bg-gradient-to-br from-amber-50 to-white",
    value: "text-amber-900",
    icon: "bg-amber-100 text-amber-700 border-amber-200",
  },
  danger: {
    card: "border-rose-200 bg-gradient-to-br from-rose-50 to-white",
    value: "text-rose-900",
    icon: "bg-rose-100 text-rose-700 border-rose-200",
  },
  purple: {
    card: "border-purple-200 bg-gradient-to-br from-purple-50 to-white",
    value: "text-purple-900",
    icon: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

export default function KPICard({
  label,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = "default",
  size = "md",
}: KPICardProps) {
  const styles = VARIANT_STYLES[variant];
  
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${styles.card}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className={`mt-2 font-bold tracking-tight ${styles.value} ${
            size === "sm" ? "text-2xl" : size === "lg" ? "text-4xl" : "text-3xl"
          }`}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`rounded-xl border p-2.5 ${styles.icon}`}>
            {icon}
          </div>
        )}
      </div>
      
      {trend && trendValue && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5 text-sm">
            {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-600" />}
            {trend === "down" && <TrendingDown className="h-4 w-4 text-rose-600" />}
            {trend === "neutral" && <Minus className="h-4 w-4 text-slate-400" />}
            <span className={
              trend === "up" ? "text-emerald-700 font-semibold" :
              trend === "down" ? "text-rose-700 font-semibold" :
              "text-slate-600"
            }>
              {trendValue}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
