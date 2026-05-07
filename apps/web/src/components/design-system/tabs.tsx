"use client";

import * as React from "react";
import { cn } from "./utils";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

export function Tabs({ value, onValueChange, className, children }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("flex flex-col gap-4", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "inline-flex min-h-8 flex-wrap items-center justify-start gap-1 border border-[var(--border)] bg-[#eef3f8] p-1 text-slate-600",
        className
      )}
      {...props}
    />
  );
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;

  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.03em]",
        "ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "border border-[var(--primary)] bg-white text-[var(--primary-pressed)] shadow-[var(--shadow-sm)]"
          : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        className
      )}
      {...props}
    />
  );
}

type TabsContentProps = React.ComponentProps<"div"> & {
  value: string;
};

export function TabsContent({ value, className, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn("mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20", className)}
      {...props}
    />
  );
}
