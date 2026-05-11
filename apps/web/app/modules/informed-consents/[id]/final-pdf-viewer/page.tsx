import Link from "next/link";

export default async function ConsentFinalPdfViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Final PDF Viewer</h1>
      <div className="rounded border border-slate-200 bg-white p-3">
        <iframe title="Final Consent PDF" src={`/api/modules/informed-consents/documents/${id}/pdf?lang=bilingual`} className="h-[80vh] w-full" />
      </div>
      <Link className="rounded border border-slate-300 px-3 py-2 text-sm" href={`/api/modules/informed-consents/documents/${id}/pdf?lang=bilingual`} target="_blank">
        Open PDF in new tab
      </Link>
    </main>
  );
}
