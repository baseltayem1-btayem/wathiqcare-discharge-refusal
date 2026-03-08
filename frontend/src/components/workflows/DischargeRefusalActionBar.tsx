"use client";

type ActionItem = {
  key: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

type DischargeRefusalActionBarProps = {
  actions: ActionItem[];
};

export default function DischargeRefusalActionBar({ actions }: DischargeRefusalActionBarProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Workflow Actions</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled={action.disabled}
            onClick={action.onClick}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
