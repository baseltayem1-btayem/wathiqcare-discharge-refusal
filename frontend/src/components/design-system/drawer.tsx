"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "./utils";

type DrawerContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  direction?: "left" | "right" | "top" | "bottom";
};

export function Drawer({ open, onOpenChange, children, direction = "right" }: DrawerProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  return (
    <DrawerContext.Provider value={{ open, setOpen: onOpenChange }}>
      {open && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50"
          onClick={() => onOpenChange(false)}
        />
      )}
      <div 
        className={cn(
          "fixed z-50 bg-white transition-transform duration-300",
          direction === "right" && "right-0 top-0 h-full max-w-md",
          direction === "left" && "left-0 top-0 h-full max-w-md",
          direction === "top" && "left-0 top-0 w-full max-h-[50vh]",
          direction === "bottom" && "bottom-0 left-0 w-full max-h-[50vh]",
          !open && direction === "right" && "translate-x-full",
          !open && direction === "left" && "-translate-x-full",
          !open && direction === "top" && "-translate-y-full",
          !open && direction === "bottom" && "translate-y-full"
        )}
      >
        {children}
      </div>
    </DrawerContext.Provider>
  );
}

export function DrawerTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const ctx = React.useContext(DrawerContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(true)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export function DrawerContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex h-full flex-col", className)} {...props} />
  );
}

export function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between border-b border-slate-200 px-6 py-4", className)}
      {...props}
    />
  );
}

export function DrawerTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-lg font-semibold text-slate-900", className)}
      {...props}
    />
  );
}

export function DrawerDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm text-slate-600", className)}
      {...props}
    />
  );
}

export function DrawerClose({ className, ...props }: React.ComponentProps<"button">) {
  const ctx = React.useContext(DrawerContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(false)}
      className={cn(
        "rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600",
        className
      )}
      {...props}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

export function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-auto border-t border-slate-200 px-6 py-4", className)}
      {...props}
    />
  );
}
