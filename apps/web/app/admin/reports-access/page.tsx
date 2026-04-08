import ComplianceConsolePage from "@/components/admin/ComplianceConsolePage";

export default function AdminReportsAccessPage() {
  return (
    <ComplianceConsolePage
      title="Reports & Evidence Access"
      subtitle="Review report access, export activity, and compliance dashboard usage for legal defensibility."
      endpoint="/api/admin/reports-access"
      highlights={[
        "Report access and export activity are logged per tenant and case.",
        "Audit viewing is included in privileged evidence-access history.",
        "Compliance reporting remains traceable for medico-legal review.",
      ]}
    />
  );
}