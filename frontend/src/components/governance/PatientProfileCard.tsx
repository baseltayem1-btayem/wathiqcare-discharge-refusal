type PatientProfileCardProps = {
  patient: Record<string, unknown> | null;
};

export default function PatientProfileCard({ patient }: PatientProfileCardProps) {
  if (!patient) {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No patient selected.</div>;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Demographics</h3>
      <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        <p><span className="font-medium">MRN:</span> {String(patient.mrn ?? "-")}</p>
        <p><span className="font-medium">Name:</span> {String(patient.fullName ?? "-")}</p>
        <p><span className="font-medium">National ID:</span> {String(patient.nationalId ?? "-")}</p>
        <p><span className="font-medium">Mobile:</span> {String(patient.mobileNumber ?? "-")}</p>
        <p><span className="font-medium">Guardian:</span> {String(patient.legalGuardianName ?? "-")}</p>
        <p><span className="font-medium">Capacity:</span> {String(patient.capacityStatus ?? "-")}</p>
      </div>
    </section>
  );
}
