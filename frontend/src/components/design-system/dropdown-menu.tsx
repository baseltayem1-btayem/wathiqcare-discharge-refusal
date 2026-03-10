"use client";

import * as React from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "./utils";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

type DropdownMenuProps = {
  children: React.ReactNode;
};

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ 
  className, 
  align = "end", 
  ...props 
}: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx || !ctx.open) return null;

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dropdown-menu]")) {
        if (ctx) {
          ctx.setOpen(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ctx]);

  return (
    <div
      data-dropdown-menu
      className={cn(
        "absolute z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg",
        align === "end" && "right-0",
        align === "start" && "left-0",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<"button">) {
  const ctx = React.useContext(DropdownMenuContext);

  return (
    <button
      type="button"
      onClick={(e) => {
        props.onClick?.(e);
        ctx?.setOpen(false);
      }}
      className={cn(
        "w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("my-1 h-px bg-slate-200", className)}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("px-2 py-1.5 text-xs font-semibold text-slate-500", className)}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ 
  checked, 
  className, 
  children, 
  ...props 
}: React.ComponentProps<"button"> & { checked?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100",
        className
      )}
      {...props}
    >
      <div className="flex h-4 w-4 items-center justify-center">
        {checked && <Check className="h-3.5 w-3.5" />}
      </div>
      {children}
    </button>
  );
}

export function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}
