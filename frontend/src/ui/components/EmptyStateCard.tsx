type EmptyStateCardProps = {
  title: string;
  description: string;
};

export default function EmptyStateCard({ title, description }: EmptyStateCardProps) {
  return (
    <div className="ui-panel flex min-h-40 flex-col items-center justify-center p-6 text-center">
      <h3 className="text-base font-semibold text-[var(--ui-text)]">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-[var(--ui-muted)]">{description}</p>
    </div>
  );
}
