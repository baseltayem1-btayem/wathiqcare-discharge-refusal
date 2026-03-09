type StatCardProps = {
  label: string;
  value: string | number;
  trend?: string;
};

export default function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <article className="ui-panel p-4">
      <p className="text-sm font-medium text-[var(--ui-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--ui-text)]">{value}</p>
      {trend ? <p className="mt-1 text-xs text-[var(--ui-accent)]">{trend}</p> : null}
    </article>
  );
}
