"use client";

type WorkflowAuditTrailItem = {
  id: string;
  action: string;
  details?: string;
  created_at?: string;
};

type WorkflowAuditTrailProps = {
  items: WorkflowAuditTrailItem[];
};

export default function WorkflowAuditTrail({ items }: WorkflowAuditTrailProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Workflow Audit Trail</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No audit records found.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{item.action}</p>
              <p className="mt-1 text-slate-700">{item.details || "-"}</p>
              <p className="mt-1 text-xs text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
