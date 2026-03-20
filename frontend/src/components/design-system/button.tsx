import * as React from "react";
import { cn } from "./utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive" | "success";
  size?: "default" | "sm" | "lg" | "icon";
};

export function Button({ 
  className, 
  variant = "default", 
  size = "default", 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-slate-900 text-white hover:bg-slate-800",
        variant === "outline" && "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100",
        variant === "destructive" && "bg-rose-600 text-white hover:bg-rose-700",
        variant === "success" && "bg-emerald-600 text-white hover:bg-emerald-700",
        size === "default" && "h-10 px-4 py-2",
        size === "sm" && "h-8 px-3 text-xs",
        size === "lg" && "h-12 px-8 text-base",
        size === "icon" && "h-10 w-10",
        className,
      )}
      {...props}
    />
  );
}
