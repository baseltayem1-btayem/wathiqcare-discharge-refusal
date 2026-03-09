type ConsentLifecycleCardProps = {
  status?: string | null;
  signatureStatus?: string | null;
  archiveStatus?: string | null;
};

export default function ConsentLifecycleCard({
  status,
  signatureStatus,
  archiveStatus,
}: ConsentLifecycleCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Consent Lifecycle</h3>
      <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
        <p><span className="font-medium">Status:</span> {status ?? "-"}</p>
        <p><span className="font-medium">Signature:</span> {signatureStatus ?? "-"}</p>
        <p><span className="font-medium">Archive:</span> {archiveStatus ?? "-"}</p>
      </div>
    </section>
  );
}
