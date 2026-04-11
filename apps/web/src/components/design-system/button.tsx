import * as React from "react";
import { cn } from "./utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive" | "success";
  size?: "default" | "sm" | "lg" | "icon";
};

export function Button({ 
  className, 
  variant = "default", 
  size = "default", 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "border-[var(--primary-soft-border)] bg-[var(--primary-soft)] text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8]",
        variant === "outline" && "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        variant === "ghost" && "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        variant === "destructive" && "border-[var(--state-error)] bg-[var(--state-error)] text-white hover:brightness-95",
        variant === "success" && "border-[var(--state-success)] bg-[var(--state-success)] text-white hover:brightness-95",
        size === "default" && "h-10 px-4 py-2",
        size === "sm" && "h-8 px-3 text-xs",
        size === "lg" && "h-12 px-8 text-base",
        size === "icon" && "h-10 w-10",
        className,
      )}
      {...props}
    />
  );
}
