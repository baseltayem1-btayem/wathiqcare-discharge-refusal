import * as React from "react";
import { cn } from "./utils";

type GridProps = React.ComponentProps<"div"> & {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 6;
    md?: 1 | 2 | 3 | 4 | 6;
    lg?: 1 | 2 | 3 | 4 | 6;
  };
};

export function Grid({
  className,
  cols = 1,
  gap = 4,
  responsive,
  ...props
}: GridProps) {
  return (
    <div
      className={cn(
        "grid",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-3",
        cols === 4 && "grid-cols-4",
        cols === 5 && "grid-cols-5",
        cols === 6 && "grid-cols-6",
        cols === 12 && "grid-cols-12",
        responsive?.sm === 1 && "sm:grid-cols-1",
        responsive?.sm === 2 && "sm:grid-cols-2",
        responsive?.sm === 3 && "sm:grid-cols-3",
        responsive?.sm === 4 && "sm:grid-cols-4",
        responsive?.sm === 6 && "sm:grid-cols-6",
        responsive?.md === 1 && "md:grid-cols-1",
        responsive?.md === 2 && "md:grid-cols-2",
        responsive?.md === 3 && "md:grid-cols-3",
        responsive?.md === 4 && "md:grid-cols-4",
        responsive?.md === 6 && "md:grid-cols-6",
        responsive?.lg === 1 && "lg:grid-cols-1",
        responsive?.lg === 2 && "lg:grid-cols-2",
        responsive?.lg === 3 && "lg:grid-cols-3",
        responsive?.lg === 4 && "lg:grid-cols-4",
        responsive?.lg === 6 && "lg:grid-cols-6",
        gap === 0 && "gap-0",
        gap === 1 && "gap-1",
        gap === 2 && "gap-2",
        gap === 3 && "gap-3",
        gap === 4 && "gap-4",
        gap === 5 && "gap-5",
        gap === 6 && "gap-6",
        gap === 8 && "gap-8",
        gap === 10 && "gap-10",
        className,
      )}
      {...props}
    />
  );
}
