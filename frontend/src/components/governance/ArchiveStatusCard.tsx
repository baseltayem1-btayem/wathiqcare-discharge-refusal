type ArchiveStatusCardProps = {
  status?: string | null;
  archiveReferenceId?: string | null;
  indexedAt?: string | null;
};

export default function ArchiveStatusCard({ status, archiveReferenceId, indexedAt }: ArchiveStatusCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Archive Status</h3>
      <div className="mt-3 space-y-1 text-sm text-slate-700">
        <p><span className="font-medium">Status:</span> {status ?? "-"}</p>
        <p><span className="font-medium">Reference:</span> {archiveReferenceId ?? "-"}</p>
        <p><span className="font-medium">Indexed At:</span> {indexedAt ?? "-"}</p>
      </div>
    </section>
  );
}
