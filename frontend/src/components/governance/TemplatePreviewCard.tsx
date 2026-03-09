type TemplatePreviewCardProps = {
  templateName?: string | null;
  templateType?: string | null;
  formNumber?: string | null;
  version?: string | null;
};

export default function TemplatePreviewCard({
  templateName,
  templateType,
  formNumber,
  version,
}: TemplatePreviewCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Template Preview</h3>
      <p className="mt-2 text-sm text-slate-700">{templateName ?? "Template not linked"}</p>
      <div className="mt-2 grid gap-1 text-sm text-slate-600 md:grid-cols-3">
        <p>Type: {templateType ?? "-"}</p>
        <p>Form #: {formNumber ?? "-"}</p>
        <p>Version: {version ?? "-"}</p>
      </div>
    </section>
  );
}
