import { type ReactNode } from "react";
import StatCard from "./stat-card";

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

export default function KPICard({
  label,
  value,
  subtitle,
  icon,
  variant = "default",
}: KPICardProps) {
  const tone =
    variant === "danger"
      ? "active"
      : variant === "warning"
        ? "under-review"
        : variant === "success"
          ? "resolved"
          : variant === "purple"
            ? "high-risk"
            : variant === "primary"
              ? "info"
              : "default";

  return <StatCard title={label} value={value} description={subtitle} icon={icon} tone={tone} />;
}
