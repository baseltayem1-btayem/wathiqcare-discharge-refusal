import * as React from "react";
import { cn } from "./utils";

type PageHeaderProps = Omit<React.ComponentProps<"div">, "title"> & {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "start" | "center";
  size?: "default" | "lg" | "xl";
};

export function PageHeader({
  className,
  eyebrow,
  title,
  subtitle,
  align = "start",
  size = "default",
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        align === "start" && "items-start text-start",
        align === "center" && "items-center text-center",
        className,
      )}
      {...props}
    >
      {eyebrow ? (
        <span className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--wc-gold)]">
          {eyebrow}
        </span>
      ) : null}
      {title ? (
        <h1
          className={cn(
            "font-bold text-[var(--wc-text)]",
            size === "default" && "text-xl md:text-2xl leading-tight",
            size === "lg" && "text-2xl md:text-3xl leading-tight",
            size === "xl" && "text-3xl md:text-[2.75rem] leading-[1.15]",
          )}
        >
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p
          className={cn(
            "text-[var(--wc-text-muted)] leading-relaxed",
            size === "default" && "text-sm mt-1",
            size === "lg" && "text-base mt-2",
            size === "xl" && "text-base md:text-lg mt-2 md:mt-3",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
