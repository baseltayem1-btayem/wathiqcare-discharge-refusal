import { type ReactNode } from "react";
import BaseStatCard from "./stat-card";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "primary" | "success" | "warning" | "error";
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
}: StatCardProps) {
  const tone =
    variant === "success"
      ? "resolved"
      : variant === "warning"
        ? "under-review"
        : variant === "error"
          ? "active"
          : variant === "primary"
            ? "info"
            : "default";

  return (
    <BaseStatCard
      title={title}
      value={value}
      description={subtitle}
      icon={icon}
      tone={tone}
    />
  );
}
