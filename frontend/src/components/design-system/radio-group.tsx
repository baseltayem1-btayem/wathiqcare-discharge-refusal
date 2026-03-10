"use client";

import * as React from "react";
import { Circle } from "lucide-react";
import { cn } from "./utils";

type RadioGroupContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

type RadioGroupProps = {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
  className?: string;
  children: React.ReactNode;
};

export function RadioGroup({ value, onValueChange, name, className, children }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
      <div className={cn("grid gap-2", className)} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

type RadioGroupItemProps = Omit<React.ComponentProps<"button">, "onChange"> & {
  value: string;
};

export function RadioGroupItem({ value: itemValue, className, ...props }: RadioGroupItemProps) {
  const ctx = React.useContext(RadioGroupContext);
  if (!ctx) return null;

  const isChecked = ctx.value === itemValue;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChecked}
      onClick={() => ctx.onValueChange(itemValue)}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        isChecked ? "border-emerald-600 bg-emerald-600" : "border-slate-300",
        className
      )}
      {...props}
    >
      {isChecked && (
        <div className="h-2 w-2 rounded-full bg-white" />
      )}
    </button>
  );
}

export function RadioGroupLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("flex items-center gap-2 text-sm text-slate-700 cursor-pointer", className)}
      {...props}
    />
  );
}
