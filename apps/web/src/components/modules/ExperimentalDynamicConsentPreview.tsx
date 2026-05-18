import { buildExperimentalDynamicConsentPreview } from "@/modules/consent-engine/service";

export default function ExperimentalDynamicConsentPreview() {
  const preview = buildExperimentalDynamicConsentPreview();

  return (
    <section className="mx-auto mt-6 max-w-7xl rounded-[28px] border border-sky-200 bg-[linear-gradient(135deg,rgba(14,165,233,0.07),rgba(255,255,255,0.96))] p-6 shadow-[0_18px_50px_rgba(14,165,233,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Experimental Dynamic Consent Engine</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{preview.template.displayNameEn}</h2>
          <p className="mt-1 text-sm text-slate-600">Flag-gated server preview only. Current production informed consent flow remains unchanged.</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
          <div><strong>Template:</strong> {preview.template.id}</div>
          <div><strong>Audit Hash:</strong> <span className="font-mono text-xs">{preview.audit.hash.slice(0, 20)}...</span></div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="mb-3 text-sm font-semibold text-slate-900">Layered Sections</div>
          <div className="space-y-3">
            {preview.sections.map((section) => (
              <div key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Layer {section.layer}</span>
                  <span>{section.kind}</span>
                  <span>{section.required ? "Required" : "Optional"}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900">{section.titleEn}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{section.bodyEn}</p>
                <p className="mt-3 text-sm leading-7 text-slate-800" dir="rtl">{section.bodyAr}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Risk Library Resolution</div>
            <div className="mt-3 space-y-3">
              {preview.risks.map((risk) => (
                <div key={risk.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">{risk.titleEn}</div>
                    <div className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">{risk.severity}</div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{risk.descriptionEn}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Render Output</div>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div><strong>Generated:</strong> {preview.generatedAt}</div>
              <div><strong>File:</strong> {preview.rendered.pdfFileName}</div>
              <div><strong>Warnings:</strong> {preview.warnings.length > 0 ? preview.warnings.join(" | ") : "None"}</div>
            </div>
            <pre className="mt-4 max-h-48 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">{preview.rendered.html.slice(0, 900)}...</pre>
          </div>
        </aside>
      </div>
    </section>
  );
}