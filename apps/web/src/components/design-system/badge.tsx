import * as React from "react";
import { cn } from "./utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        variant === "default" && "border-transparent bg-slate-900 text-white",
        variant === "secondary" && "border-transparent bg-slate-100 text-slate-900",
        variant === "outline" && "text-slate-900",
        variant === "success" && "border-transparent bg-emerald-100 text-emerald-700",
        variant === "warning" && "border-transparent bg-amber-100 text-amber-700",
        variant === "destructive" && "border-transparent bg-rose-100 text-rose-700",
        className
      )}
      {...props}
    />
  );
}
