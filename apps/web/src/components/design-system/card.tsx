import * as React from "react";
import { cn } from "./utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]",
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
      className={cn("text-[13px] font-semibold leading-tight text-[var(--foreground)] tracking-[0.02em]", className)}
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
  return (
    <div className={cn("p-4 pt-0", className)} {...props} />
  );
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center p-4 pt-0", className)}
      {...props}
    />
  );
}
