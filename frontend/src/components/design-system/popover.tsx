"use client";

import * as React from "react";
import { cn } from "./utils";

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

type PopoverProps = {
  children: React.ReactNode;
};

export function Popover({ children }: PopoverProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn("inline-flex", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  const ctx = React.useContext(PopoverContext);

  React.useEffect(() => {
    if (!ctx || !ctx.open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-popover]")) {
        ctx?.setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ctx]);

  if (!ctx || !ctx.open) return null;

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <div
      data-popover
      className={cn(
        "absolute z-50 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-lg",
        alignClasses[align],
        className
      )}
      style={{ top: `calc(100% + ${sideOffset}px)` }}
      {...props}
    />
  );
}

export function PopoverArrow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-slate-200 bg-white",
        className
      )}
    />
  );
}
