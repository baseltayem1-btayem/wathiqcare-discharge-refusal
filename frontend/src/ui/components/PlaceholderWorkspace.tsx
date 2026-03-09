import EmptyStateCard from "@/ui/components/EmptyStateCard";

type PlaceholderWorkspaceProps = {
  title: string;
  description: string;
};

export default function PlaceholderWorkspace({ title, description }: PlaceholderWorkspaceProps) {
  return (
    <div className="space-y-4">
      <header>
        <p className="ui-kicker">Module Workspace</p>
        <h1 className="ui-title">{title}</h1>
        <p className="ui-subtitle">{description}</p>
      </header>
      <EmptyStateCard
        title="UI foundation placeholder"
        description="This workspace is intentionally visual-only in this phase. Existing backend workflows remain untouched."
      />
    </div>
  );
}
