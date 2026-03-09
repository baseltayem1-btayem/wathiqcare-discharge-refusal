import StatusBadge from "@/ui/components/StatusBadge";

type LegalRiskBadgeProps = {
  risk: "Low" | "Medium" | "High";
};

export default function LegalRiskBadge({ risk }: LegalRiskBadgeProps) {
  return <StatusBadge status={risk} />;
}
