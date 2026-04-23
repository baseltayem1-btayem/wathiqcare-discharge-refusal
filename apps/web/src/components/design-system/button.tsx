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
        "inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "border-[var(--primary)] bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)]",
        variant === "outline" && "border-[var(--border)] bg-white text-slate-800 hover:border-[var(--border-strong)] hover:bg-slate-50",
        variant === "ghost" && "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        variant === "destructive" && "border-[var(--state-error)] bg-[var(--state-error)] text-white hover:brightness-95",
        variant === "success" && "border-[var(--state-success)] bg-[var(--state-success)] text-white hover:brightness-95",
        size === "default" && "h-11 px-4 py-2",
        size === "sm" && "h-9 px-3 text-xs",
        size === "lg" && "h-12 px-8 text-base",
        size === "icon" && "h-11 w-11",
        className,
      )}
      {...props}
    />
  );
}
