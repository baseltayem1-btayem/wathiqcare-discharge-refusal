import StatusBadge from "@/ui/components/StatusBadge";

type ArchiveStatusCardProps = {
  title: string;
  state: "Pending" | "Indexed" | "Archived" | "Verified" | "Failed";
  reference: string;
};

export default function ArchiveStatusCard({ title, state, reference }: ArchiveStatusCardProps) {
  return (
    <article className="ui-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
        <StatusBadge status={state} />
      </div>
      <p className="mt-2 text-xs text-[var(--ui-muted)]">Ref: {reference}</p>
    </article>
  );
}
