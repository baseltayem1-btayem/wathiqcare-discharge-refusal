type DocumentActionsCardProps = {
  onGeneratePdf: () => void;
  onArchive: () => void;
  onReindex: () => void;
};

export default function DocumentActionsCard({
  onGeneratePdf,
  onArchive,
  onReindex,
}: DocumentActionsCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Document Actions</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onGeneratePdf} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">Generate Final PDF</button>
        <button type="button" onClick={onArchive} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">Archive</button>
        <button type="button" onClick={onReindex} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">Re-index</button>
      </div>
    </section>
  );
}
