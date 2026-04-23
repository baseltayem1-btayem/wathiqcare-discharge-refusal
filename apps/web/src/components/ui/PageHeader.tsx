import { type ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export default function PageHeader({ title, subtitle, badge, action, icon }: PageHeaderProps) {
  return (
    <header className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          {badge && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">{badge}</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            {icon && (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/70 text-blue-700 shadow-sm">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">{title}</h1>
              {subtitle && (
                <p className="mt-1.5 max-w-4xl text-sm text-slate-600 md:text-base">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
        {action && <div className="ml-0 w-full md:ml-4 md:w-auto">{action}</div>}
      </div>
    </header>
  );
}
