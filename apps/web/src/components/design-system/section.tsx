import * as React from "react";
import { cn } from "./utils";

type SectionProps = React.ComponentProps<"section"> & {
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
};

export function Section({
  className,
  spacing = "md",
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "relative",
        spacing === "none" && "py-0",
        spacing === "sm" && "py-4",
        spacing === "md" && "py-8",
        spacing === "lg" && "py-12",
        spacing === "xl" && "py-16",
        className,
      )}
      {...props}
    />
  );
}
