import { type ReactNode } from "react";

type MetadataItem = {
  label: string;
  value: ReactNode;
};

type CaseCardProps = {
  title: string;
  statusBadge: ReactNode;
  reason?: ReactNode;
  metadata?: MetadataItem[];
  actions?: ReactNode;
  children?: ReactNode;
};

export default function CaseCard({
  title,
  statusBadge,
  reason,
  metadata = [],
  actions,
  children,
}: CaseCardProps) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            {statusBadge}
          </div>

          {reason ? (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Reason</p>
              <div className="mt-1 text-sm text-gray-900">{reason}</div>
            </div>
          ) : null}

          {metadata.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {metadata.map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <div className="text-sm font-medium text-gray-900">{item.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {children ? <div className="mt-3">{children}</div> : null}
        </div>

        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}
