import StatusBadge from "@/ui/components/StatusBadge";
import PrimaryActionButton from "@/ui/components/PrimaryActionButton";
import SecondaryActionButton from "@/ui/components/SecondaryActionButton";

type WorkflowStepCardProps = {
  stepTitle: string;
  status: string;
  owner: string;
  dueDate: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

export default function WorkflowStepCard({
  stepTitle,
  status,
  owner,
  dueDate,
  onPrimaryAction,
  onSecondaryAction,
}: WorkflowStepCardProps) {
  return (
    <article className="ui-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--ui-text)]">{stepTitle}</p>
          <p className="mt-1 text-sm text-[var(--ui-muted)]">Owner: {owner}</p>
          <p className="text-sm text-[var(--ui-muted)]">Due: {dueDate}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryActionButton type="button" onClick={onPrimaryAction}>Primary Action</PrimaryActionButton>
        <SecondaryActionButton type="button" onClick={onSecondaryAction}>Secondary Action</SecondaryActionButton>
      </div>
    </article>
  );
}
