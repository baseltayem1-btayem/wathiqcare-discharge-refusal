import StatusBadge from "@/ui/components/StatusBadge";

type ConsentIntelligencePanelProps = {
  required: string[];
  recommended: string[];
  missing: string[];
};

export default function ConsentIntelligencePanel({ required, recommended, missing }: ConsentIntelligencePanelProps) {
  return (
    <section className="ui-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--ui-text)]">Consent Intelligence</h3>
        <StatusBadge status={missing.length > 0 ? "Attention" : "Ready"} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Required Consents</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ui-text)]">
            {required.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Recommended Consents</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ui-text)]">
            {recommended.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Missing Consents</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ui-text)]">
            {missing.map((item) => (
              <li key={item}>• {item}</li>
            ))}
            {missing.length === 0 ? <li>• None</li> : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
