import ArchiveStatusCard from "@/ui/components/ArchiveStatusCard";
import DetailPanel from "@/ui/components/DetailPanel";
import LegalRiskBadge from "@/ui/components/LegalRiskBadge";
import SmartDataGrid from "@/ui/components/SmartDataGrid";
import SignatureMethodSelector from "@/ui/components/SignatureMethodSelector";
import StatCard from "@/ui/components/StatCard";
import TimelineCard from "@/ui/components/TimelineCard";
import WorkflowStepCard from "@/ui/components/WorkflowStepCard";

const stats = [
  { label: "Active Cases", value: 84, trend: "+8 this week" },
  { label: "Pending Signatures", value: 17, trend: "3 high priority" },
  { label: "Consents Awaiting Review", value: 11, trend: "Legal queue" },
  { label: "Legal Escalations", value: 5, trend: "2 urgent" },
  { label: "ROI Requests Pending", value: 14, trend: "6 awaiting approval" },
  { label: "Archive Errors", value: 2, trend: "Needs audit" },
];

const workQueue = [
  { caseId: "C-1048", patient: "Fatimah A.", status: "Pending", owner: "Legal Desk" },
  { caseId: "C-1044", patient: "Abdulrahman M.", status: "Indexed", owner: "Archive Ops" },
  { caseId: "C-1039", patient: "Mona S.", status: "Failed", owner: "Compliance" },
  { caseId: "C-1031", patient: "Ibrahim H.", status: "Verified", owner: "Care Team" },
  { caseId: "C-1028", patient: "Rana K.", status: "Archived", owner: "Archive Ops" },
  { caseId: "C-1015", patient: "Nora T.", status: "Pending", owner: "Consent Office" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <header>
        <p className="ui-kicker">SaaS Command Center</p>
        <h1 className="ui-title">Enterprise Medico-Legal Dashboard</h1>
        <p className="ui-subtitle">Visual foundation layer for cases, signatures, consents, archive lifecycle, and risk monitoring.</p>
      </header>

      <section className="ui-grid-auto">
        {stats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} trend={item.trend} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <SmartDataGrid
          title="Work Queue"
          rows={workQueue}
          columns={[
            { key: "caseId", label: "Case", sortable: true },
            { key: "patient", label: "Patient", sortable: true },
            { key: "status", label: "Status", sortable: true, kind: "status" },
            { key: "owner", label: "Owner", sortable: true },
          ]}
        />

        <TimelineCard
          title="Recent Activity Timeline"
          items={[
            { title: "Consent sent for signature", subtitle: "Case C-1048", time: "09:23" },
            { title: "Nafath verification completed", subtitle: "Case C-1044", time: "08:58" },
            { title: "Archive verification failed", subtitle: "Case C-1039", time: "08:15" },
            { title: "ROI request opened", subtitle: "Case C-1028", time: "07:49" },
          ]}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <DetailPanel
          title="Risk Overview"
          rows={[
            { label: "Open Legal Risks", value: "7" },
            { label: "Signature Mismatch", value: "2" },
            { label: "Missing Consent References", value: "3" },
          ]}
        />
        <div className="ui-panel p-4">
          <h3 className="text-base font-semibold text-[var(--ui-text)]">Legal Risk Matrix</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <LegalRiskBadge risk="High" />
            <LegalRiskBadge risk="Medium" />
            <LegalRiskBadge risk="Low" />
          </div>
        </div>
        <ArchiveStatusCard title="Archive lifecycle" state="Pending" reference="AR-20491" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <WorkflowStepCard
          stepTitle="Case Review and Escalation"
          status="Pending"
          owner="Medico-Legal Team"
          dueDate="Today, 18:00"
        />
        <SignatureMethodSelector />
      </section>
    </div>
  );
}
