import * as React from "react";
import { cn } from "./utils";

export type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: "sm" | "default" | "lg" | "xl";
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  error?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = "default", startIcon, endIcon, error, ...props }, ref) => {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 w-full border bg-white transition-all duration-150",
          "focus-within:border-[var(--wc-blue)] focus-within:bg-[var(--wc-surface)] focus-within:ring-[3px] focus-within:ring-[rgba(25,118,210,0.14)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" && "h-7 px-2 text-[11px] rounded-md",
          size === "default" &&
            "h-8 px-2.5 py-1 text-[12px] text-slate-900 border-[var(--border-strong)] rounded-md",
          size === "lg" && "h-11 px-3 text-sm rounded-lg",
          size === "xl" && "min-h-[54px] px-3.5 text-[0.95rem] rounded-xl border-[var(--wc-border)] bg-[var(--wc-surface-2)]",
          error && "border-[var(--wc-danger)] focus-within:border-[var(--wc-danger)] focus-within:ring-[var(--wc-danger)]/20",
          className,
        )}
      >
        {startIcon ? (
          <span className="flex-shrink-0 text-[var(--wc-blue)]">{startIcon}</span>
        ) : null}
        <input
          ref={ref}
          className={cn(
            "flex-1 w-full bg-transparent border-0 outline-0 text-[var(--wc-text)] placeholder:text-[var(--wc-text-light)]",
            size === "default" && "text-[12px]",
            size === "xl" && "min-h-[54px]",
          )}
          {...props}
        />
        {endIcon ? (
          <span className="flex-shrink-0 text-[var(--wc-text-light)]">{endIcon}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full border border-[var(--border-strong)] bg-white px-2.5 py-1.5 text-[12px] text-slate-900 rounded-md",
        "placeholder:text-slate-400",
        "focus-visible:bg-[#fffbeb] focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-8 w-full border border-[var(--border-strong)] bg-white px-2.5 py-1 text-[12px] text-slate-900 rounded-md",
        "focus-visible:bg-[#fffbeb] focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-[var(--wc-border)] bg-[var(--wc-surface)] accent-[var(--wc-navy)] cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(25,118,210,0.18)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
