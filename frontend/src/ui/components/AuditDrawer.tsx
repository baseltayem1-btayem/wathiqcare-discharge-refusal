type AuditItem = {
  action: string;
  actor: string;
  time: string;
};

type AuditDrawerProps = {
  title?: string;
  items: AuditItem[];
};

export default function AuditDrawer({ title = "Audit Trail", items }: AuditDrawerProps) {
  return (
    <aside className="ui-panel p-4">
      <h3 className="text-base font-semibold text-[var(--ui-text)]">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${item.action}-${index}`} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3">
            <p className="text-sm font-semibold text-[var(--ui-text)]">{item.action}</p>
            <p className="text-xs text-[var(--ui-muted)]">{item.actor}</p>
            <p className="text-xs text-[var(--ui-info)]">{item.time}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
