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
          Operational case command panel for medico-legal workflows, signatures, documents, archive, and escalation paths.
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
          <Link href={`/consents/new?caseId=${encodeURIComponent(caseId)}&intent=signature`}><SecondaryActionButton type="button" className="w-full">Send for Signature</SecondaryActionButton></Link>
          <Link href={`/consents/new?caseId=${encodeURIComponent(caseId)}&intent=pdf`}><SecondaryActionButton type="button" className="w-full">Generate PDF</SecondaryActionButton></Link>
          <Link href={`/archive?case=${encodeURIComponent(caseId)}`}><SecondaryActionButton type="button" className="w-full">Archive</SecondaryActionButton></Link>
          <Link href={`/cases/${encodeURIComponent(caseId)}?tab=audit`}><SecondaryActionButton type="button" className="w-full">Escalate</SecondaryActionButton></Link>
        </div>
      </article>
    </section>
  );
}
