import * as React from "react";
import { cn } from "./utils";

type StackProps = React.ComponentProps<"div"> & {
  direction?: "row" | "column";
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  wrap?: boolean;
};

export function Stack({
  className,
  direction = "column",
  gap = 4,
  align,
  justify,
  wrap = false,
  ...props
}: StackProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "column" && "flex-col",
        direction === "row" && "flex-row",
        gap === 0 && "gap-0",
        gap === 1 && "gap-1",
        gap === 2 && "gap-2",
        gap === 3 && "gap-3",
        gap === 4 && "gap-4",
        gap === 5 && "gap-5",
        gap === 6 && "gap-6",
        gap === 8 && "gap-8",
        gap === 10 && "gap-10",
        gap === 12 && "gap-12",
        align === "start" && "items-start",
        align === "center" && "items-center",
        align === "end" && "items-end",
        align === "stretch" && "items-stretch",
        justify === "start" && "justify-start",
        justify === "center" && "justify-center",
        justify === "end" && "justify-end",
        justify === "between" && "justify-between",
        justify === "around" && "justify-around",
        justify === "evenly" && "justify-evenly",
        wrap && "flex-wrap",
        className,
      )}
      {...props}
    />
  );
}
