import * as React from "react";
import { cn } from "./utils";

type BoxProps = React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode };

export function Container({ className, ...props }: BoxProps & { as?: "div"; size?: "full" }) {
  const { as: _as, size: _size, ...divProps } = props;
  void _as;
  void _size;
  return <div className={cn("mx-auto w-full px-4", className)} {...divProps} />;
}

export function Stack({ className, direction = "column", align, justify, wrap, gap = 0, ...props }: BoxProps & {
  direction?: "row" | "column";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  gap?: number;
}) {
  const alignClass = align ? { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" }[align] : undefined;
  const justifyClass = justify ? { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" }[justify] : undefined;
  const gapClass = { 0: "gap-0", 1: "gap-1", 2: "gap-2", 3: "gap-3", 4: "gap-4", 5: "gap-5", 6: "gap-6", 8: "gap-8" }[gap];
  return <div className={cn("flex", direction === "column" ? "flex-col" : "flex-row", alignClass, justifyClass, wrap && "flex-wrap", gapClass, className)} {...props} />;
}

export function Grid({ className, cols = 1, gap = 0, responsive, ...props }: BoxProps & {
  cols?: number;
  gap?: number;
  responsive?: { sm?: number; md?: number; lg?: number; xl?: number };
}) {
  const colClass = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[cols];
  const gapClass = { 0: "gap-0", 1: "gap-1", 2: "gap-2", 3: "gap-3", 4: "gap-4", 5: "gap-5", 6: "gap-6", 8: "gap-8" }[gap];
  const smClass = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[responsive?.sm ?? 0];
  const mdClass = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[responsive?.md ?? 0];
  const lgClass = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[responsive?.lg ?? 0];
  const xlClass = { 1: "xl:grid-cols-1", 2: "xl:grid-cols-2", 3: "xl:grid-cols-3", 4: "xl:grid-cols-4" }[responsive?.xl ?? 0];
  return <div className={cn("grid", colClass, gapClass, smClass, mdClass, lgClass, xlClass, className)} {...props} />;
}

export function Alert({ className, variant = "info", icon, children, ...props }: BoxProps & {
  variant?: "info" | "warning" | "success" | "error" | "destructive";
  icon?: React.ReactNode;
}) {
  return <div className={cn("flex gap-2 rounded-lg border px-3 py-2 text-sm", variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900", variant === "warning" && "border-amber-200 bg-amber-50 text-amber-900", (variant === "error" || variant === "destructive") && "border-red-200 bg-red-50 text-red-900", variant === "info" && "border-blue-200 bg-blue-50 text-blue-900", className)} {...props}>{icon}{children}</div>;
}
