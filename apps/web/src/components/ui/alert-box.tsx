import { type ReactNode } from "react";

type AlertVariant = "info" | "warning" | "critical" | "success";

type AlertBoxProps = {
  variant?: AlertVariant;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

const VARIANT_STYLES: Record<AlertVariant, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-900",
  critical: "border-red-200 bg-red-50 text-red-900",
  success: "border-green-200 bg-green-50 text-green-900",
};

export default function AlertBox({
  variant = "info",
  title,
  description,
  icon,
  action,
}: AlertBoxProps) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${VARIANT_STYLES[variant]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {icon ? <div className="mt-0.5">{icon}</div> : null}
          <div>
            <p className="text-sm font-medium">{title}</p>
            {description ? <p className="mt-1 text-xs opacity-90">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}
