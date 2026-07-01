import * as React from "react";
import { cn } from "./utils";

type ContainerProps<T extends React.ElementType = "div"> = {
  as?: T;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  center?: boolean;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithRef<T>, "as" | "size" | "center" | "className" | "children">;

export function Container<T extends React.ElementType = "div">({
  as,
  className,
  size = "full",
  center = false,
  ...props
}: ContainerProps<T>) {
  const Component = as || "div";
  return (
    <Component
      className={cn(
        "w-full mx-auto px-4 sm:px-6 lg:px-8",
        size === "sm" && "max-w-[560px]",
        size === "md" && "max-w-[680px]",
        size === "lg" && "max-w-[720px]",
        size === "xl" && "max-w-[1200px]",
        size === "2xl" && "max-w-[1800px]",
        center && "flex items-center justify-center",
        className,
      )}
      {...props}
    />
  );
}
