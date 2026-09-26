import * as React from "react";
import { cn } from "./utils";

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size"> & {
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "success"
    | "secondary"
    | "dashed"
    | "brand";
  size?: "default" | "sm" | "lg" | "xl" | "2xl" | "icon";
  fullWidth?: boolean;
  uppercase?: boolean;
};

export function Button({
  className,
  variant = "default",
  size = "default",
  fullWidth = false,
  uppercase = true,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 border font-bold transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20",
        "disabled:pointer-events-none disabled:opacity-50",
        uppercase ? "uppercase tracking-[0.03em] text-[12px]" : "normal-case tracking-normal",
        fullWidth && "w-full",
        variant === "default" &&
          "border-[var(--primary)] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)]",
        variant === "brand" &&
          "border-transparent bg-gradient-to-br from-[var(--wc-navy)] to-[var(--wc-navy-mid)] text-white shadow-[0_10px_26px_rgba(0,43,92,0.28)] hover:shadow-[0_12px_30px_rgba(0,43,92,0.34)] hover:-translate-y-px",
        variant === "secondary" &&
          "border-[var(--border-strong)] bg-[var(--surface-muted)] text-slate-800 hover:bg-[var(--surface-muted)]/80",
        variant === "outline" &&
          "border-[var(--border-strong)] bg-white text-slate-800 hover:bg-[var(--surface-muted)]",
        variant === "dashed" &&
          "border-dashed border-[var(--wc-border)] bg-[var(--wc-surface-2)] text-[var(--wc-text-muted)] hover:bg-[var(--wc-blue-soft)]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-slate-700 hover:bg-[var(--surface-muted)] hover:text-slate-900",
        variant === "destructive" &&
          "border-[var(--state-error)] bg-[var(--state-error)] text-white hover:brightness-95",
        variant === "success" &&
          "border-[var(--state-success)] bg-[var(--state-success)] text-white hover:brightness-95",
        size === "default" && "h-8 px-3 py-1.5",
        size === "sm" && "h-7 px-2.5",
        size === "lg" && "h-9 px-4",
        size === "xl" && !uppercase && "min-h-[54px] px-5 text-[0.95rem] rounded-xl",
        size === "xl" && uppercase && "h-11 px-5 text-[12px] rounded-lg",
        size === "2xl" && !uppercase && "min-h-[60px] px-6 text-[1rem] rounded-xl",
        size === "2xl" && uppercase && "h-12 px-6 text-[13px] rounded-lg",
        size === "icon" && "h-8 w-8",
        className,
      )}
      {...props}
    />
  );
}
