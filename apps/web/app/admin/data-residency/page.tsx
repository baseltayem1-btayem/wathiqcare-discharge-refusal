import ComplianceConsolePage from "@/components/admin/ComplianceConsolePage";

export default function AdminDataResidencyPage() {
  return (
    <ComplianceConsolePage
      title="Data Residency"
      subtitle="Track where regulated data is hosted and whether each class remains KSA-compliant."
      endpoint="/api/admin/data-residency"
      highlights={[
        "Patient-sensitive data is enforced as KSA-only.",
        "Analytics exports require anonymization before non-KSA transfer.",
        "Deployment validation blocks unsafe patient-data hosting regions.",
      ]}
    />
  );
}