import { type ReactNode } from "react";

type SectionPanelProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  variant?: "default" | "bordered" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
};

export default function SectionPanel({ 
  title, 
  subtitle, 
  children, 
  action,
  variant = "default",
  padding = "md" 
}: SectionPanelProps) {
  const variantClasses = {
    default: "bg-white",
    bordered: "border border-slate-200 bg-white rounded-2xl",
    elevated: "border border-slate-200 bg-white rounded-2xl shadow-sm",
  };

  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <section className={variantClasses[variant]}>
      {(title || action) && (
        <div className={`flex items-center justify-between ${paddingClasses[padding]} ${padding === "none" ? "pb-4" : "pb-4 border-b border-slate-100"}`}>
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={title || action ? paddingClasses[padding] : paddingClasses[padding]}>
        {children}
      </div>
    </section>
  );
}
