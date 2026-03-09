import { statusColorMap } from "@/ui/design-system/tokens";

type StatusBadgeProps = {
  status: string;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.trim().toLowerCase();
  const color = statusColorMap[normalized] ?? "var(--ui-muted)";

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: `${color}66`,
        color,
        backgroundColor: `${color}1A`,
      }}
    >
      {status}
    </span>
  );
}
