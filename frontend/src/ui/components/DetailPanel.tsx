type DetailPanelRow = {
  label: string;
  value: string;
};

type DetailPanelProps = {
  title: string;
  rows: DetailPanelRow[];
};

export default function DetailPanel({ title, rows }: DetailPanelProps) {
  return (
    <section className="ui-panel p-4">
      <h3 className="text-base font-semibold text-[var(--ui-text)]">{title}</h3>
      <dl className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 rounded-lg border border-[var(--ui-border)] px-3 py-2">
            <dt className="text-xs font-medium text-[var(--ui-muted)]">{row.label}</dt>
            <dd className="text-sm font-semibold text-[var(--ui-text)]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
