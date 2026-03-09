type AuditTimelineItem = {
  label: string;
  timestamp: string;
};

type AuditTimelineProps = {
  items: AuditTimelineItem[];
};

export default function AuditTimeline({ items }: AuditTimelineProps) {
  return (
    <section className="ui-panel p-4">
      <h3 className="text-base font-semibold text-[var(--ui-text)]">Audit Timeline</h3>
      <ol className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={`${item.label}-${item.timestamp}`} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3">
            <p className="text-sm font-semibold text-[var(--ui-text)]">{item.label}</p>
            <p className="text-xs text-[var(--ui-muted)]">{item.timestamp}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
