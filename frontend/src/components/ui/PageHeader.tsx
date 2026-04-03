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
    <header className="mb-8">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {badge && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">{badge}</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            {icon && (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">{title}</h1>
              {subtitle && (
                <p className="mt-1.5 text-base text-slate-600">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
    </header>
  );
}
