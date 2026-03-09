import StatusBadge from "@/ui/components/StatusBadge";

type SignatureMethodCardProps = {
  method: string;
  strength: string;
  availability: "Available" | "Limited" | "Unavailable";
};

export default function SignatureMethodCard({ method, strength, availability }: SignatureMethodCardProps) {
  return (
    <article className="ui-panel p-4">
      <h3 className="text-base font-semibold text-[var(--ui-text)]">{method}</h3>
      <p className="mt-1 text-sm text-[var(--ui-muted)]">Verification: {strength}</p>
      <div className="mt-3">
        <StatusBadge status={availability} />
      </div>
    </article>
  );
}
