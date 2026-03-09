type TimelineItem = {
  title: string;
  subtitle: string;
  time: string;
};

type TimelineCardProps = {
  title: string;
  items: TimelineItem[];
};

export default function TimelineCard({ title, items }: TimelineCardProps) {
  return (
    <section className="ui-panel p-4">
      <h3 className="text-base font-semibold text-[var(--ui-text)]">{title}</h3>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={`${item.title}-${item.time}`} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3">
            <p className="text-sm font-semibold text-[var(--ui-text)]">{item.title}</p>
            <p className="text-xs text-[var(--ui-muted)]">{item.subtitle}</p>
            <p className="mt-1 text-xs font-medium text-[var(--ui-info)]">{item.time}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
