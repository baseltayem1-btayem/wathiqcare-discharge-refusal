import { type ReactNode } from "react";

type ActionButtonProps = {
  onClick?: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  icon?: ReactNode;
  fullWidth?: boolean;
};

const VARIANT_STYLES = {
  primary: "bg-slate-900 text-white hover:bg-slate-800 border-slate-900",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
  outline: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300",
  danger: "bg-rose-600 text-white hover:bg-rose-700 border-rose-600",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600",
};

const SIZE_STYLES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function ActionButton({
  onClick,
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  icon,
  fullWidth = false,
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl border font-medium 
        transition-colors disabled:cursor-not-allowed disabled:opacity-50
        ${VARIANT_STYLES[variant]} 
        ${SIZE_STYLES[size]}
        ${fullWidth ? "w-full" : ""}
      `}
    >
      {icon}
      {children}
    </button>
  );
}
