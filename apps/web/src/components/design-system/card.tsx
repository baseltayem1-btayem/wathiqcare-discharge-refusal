import * as React from "react";
import { cn } from "./utils";

type CardProps = React.ComponentProps<"div"> & {
  variant?: "default" | "login";
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "border bg-[var(--surface)]",
        variant === "default" &&
          "rounded-[18px] border-[var(--border)] shadow-[var(--shadow-md)]",
        variant === "login" &&
          "rounded-[28px] sm:rounded-[32px] border-[var(--wc-border)] bg-[var(--wc-surface)] shadow-[0_24px_60px_rgba(16,42,67,0.12),0_8px_20px_rgba(16,42,67,0.06)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-4 pb-2.5", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-[13px] font-semibold leading-tight text-[var(--foreground)] tracking-[0.02em]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[11px] leading-5 text-[var(--foreground-secondary)]", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center p-4 pt-0", className)}
      {...props}
    />
  );
}
