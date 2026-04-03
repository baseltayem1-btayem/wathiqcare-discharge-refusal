"use client";

import * as React from "react";
import { cn } from "./utils";

type TooltipContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  delayDuration: number;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

type TooltipProps = {
  children: React.ReactNode;
  delayDuration?: number;
};

export function Tooltip({ children, delayDuration = 300 }: TooltipProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipContext.Provider value={{ open, setOpen, delayDuration }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const ctx = React.useContext(TooltipContext);
  const openTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearOpenTimeout() {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  }

  function scheduleOpen() {
    if (!ctx) {
      return;
    }

    clearOpenTimeout();
    openTimeoutRef.current = setTimeout(() => {
      ctx.setOpen(true);
      openTimeoutRef.current = null;
    }, ctx.delayDuration);
  }

  function closeImmediately() {
    if (!ctx) {
      return;
    }

    clearOpenTimeout();
    ctx.setOpen(false);
  }

  React.useEffect(() => {
    return () => {
      clearOpenTimeout();
    };
  }, []);

  if (!ctx) return null;

  return (
    <button
      type="button"
      onMouseEnter={scheduleOpen}
      onMouseLeave={closeImmediately}
      onFocus={scheduleOpen}
      onBlur={closeImmediately}
      className={cn("inline-flex", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function TooltipContent({
  className,
  side = "top",
  ...props
}: React.ComponentProps<"div"> & { side?: "top" | "bottom" | "left" | "right" }) {
  const ctx = React.useContext(TooltipContext);
  if (!ctx || !ctx.open) return null;

  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={cn(
        "absolute z-50 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg",
        sideClasses[side],
        className
      )}
      {...props}
    />
  );
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
