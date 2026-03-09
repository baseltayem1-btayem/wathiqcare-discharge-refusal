import Link from "next/link";
import PrimaryActionButton from "@/ui/components/PrimaryActionButton";
import SecondaryActionButton from "@/ui/components/SecondaryActionButton";
import TimelineCard from "@/ui/components/TimelineCard";

type CaseWorkspacePanelsProps = {
  caseId: string;
};

export default function CaseWorkspacePanels({ caseId }: CaseWorkspacePanelsProps) {
  return (
    <section className="mb-4 grid gap-4 xl:grid-cols-[1.2fr_1.5fr_1fr]">
      <article className="ui-panel p-4">
        <p className="ui-kicker">Case Overview</p>
        <h3 className="mt-1 text-base font-semibold text-[var(--ui-text)]">Case #{caseId.slice(0, 8)}</h3>
        <p className="mt-2 text-sm text-[var(--ui-muted)]">
          This panel is additive and visual-only. Existing discharge refusal logic and actions remain intact below.
        </p>
      </article>

      <TimelineCard
        title="Workflow Timeline"
        items={[
          { title: "Created", subtitle: "Case opened", time: "Day 1" },
          { title: "Sent for Signature", subtitle: "Pending signer", time: "Day 2" },
          { title: "PDF Generated", subtitle: "Final draft", time: "Day 3" },
          { title: "Archive", subtitle: "Awaiting verification", time: "Day 4" },
        ]}
      />

      <article className="ui-panel p-4">
        <p className="ui-kicker">Actions Panel</p>
        <div className="mt-3 grid gap-2">
          <Link href="/consents/new"><PrimaryActionButton type="button" className="w-full">Create Consent</PrimaryActionButton></Link>
          <Link href="/agreements/new"><SecondaryActionButton type="button" className="w-full">Create Agreement</SecondaryActionButton></Link>
          <SecondaryActionButton type="button" className="w-full">Send for Signature</SecondaryActionButton>
          <SecondaryActionButton type="button" className="w-full">Generate PDF</SecondaryActionButton>
          <SecondaryActionButton type="button" className="w-full">Archive</SecondaryActionButton>
          <SecondaryActionButton type="button" className="w-full">Escalate</SecondaryActionButton>
        </div>
      </article>
    </section>
  );
}
