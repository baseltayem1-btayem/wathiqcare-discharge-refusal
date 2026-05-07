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
        "inline-flex items-center justify-center gap-1.5 border text-[12px] font-bold uppercase tracking-[0.03em] transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "border-[var(--primary)] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)]",
        variant === "outline" && "border-[var(--border-strong)] bg-white text-slate-800 hover:bg-[var(--surface-muted)]",
        variant === "ghost" && "border-transparent bg-transparent text-slate-700 hover:bg-[var(--surface-muted)] hover:text-slate-900",
        variant === "destructive" && "border-[var(--state-error)] bg-[var(--state-error)] text-white hover:brightness-95",
        variant === "success" && "border-[var(--state-success)] bg-[var(--state-success)] text-white hover:brightness-95",
        size === "default" && "h-8 px-3 py-1.5",
        size === "sm" && "h-7 px-2.5 text-[11px]",
        size === "lg" && "h-9 px-4 text-[12px]",
        size === "icon" && "h-8 w-8",
        className,
      )}
      {...props}
    />
  );
}
