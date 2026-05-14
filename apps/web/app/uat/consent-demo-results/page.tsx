import fs from "node:fs/promises";
import path from "node:path";

type UatCaseResult = {
  id: number;
  slug: string;
  titleEn: string;
  titleAr: string;
  status: "PASS" | "FAIL";
  workflowStatus: "FINAL" | "SEALED" | "FAILED";
  legalSealHash: string;
  qrVerificationStatus: "VALID" | "INVALID";
  files: {
    arabicPdf: string;
    englishPdf: string;
    bilingualPdf: string;
    consentSnapshot: string;
    auditTrail: string;
    evidencePackage: string;
    previewArabic: string;
    previewEnglish: string;
    previewBilingual: string;
    qrResult: string;
  };
  languageIsolation: {
    arabicLeakageCount: number;
    englishLeakageCount: number;
  };
};

type UatSummary = {
  generatedAt: string;
  commitHash: string;
  environment: string;
  totalModules: number;
  passed: number;
  failed: number;
  results: UatCaseResult[];
};

async function loadSummary(): Promise<UatSummary | null> {
  try {
    const summaryPath = path.join(process.cwd(), "public", "uat-results", "summary.json");
    const raw = await fs.readFile(summaryPath, "utf8");
    return JSON.parse(raw) as UatSummary;
  } catch {
    return null;
  }
}

function Badge({ value, pass }: { value: string; pass?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        pass === true
          ? "bg-emerald-100 text-emerald-800"
          : pass === false
            ? "bg-rose-100 text-rose-800"
            : "bg-slate-100 text-slate-700"
      }`}
    >
      {value}
    </span>
  );
}

export default async function UatConsentDemoResultsPage() {
  const summary = await loadSummary();

  if (!summary || !summary.results) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold">Consent UAT Demo Results</h1>
        <p className="mt-3 text-slate-700">
          No UAT results found. Run <code>npx tsx scripts/uat/run-full-consent-uat.ts</code> first.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Consent UAT Demo Results</h1>
        <p className="mt-2 text-sm text-slate-600">Visual review dashboard for all 19 test consent workflows.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge value={`Modules: ${summary.totalModules}`} />
          <Badge value={`Passed: ${summary.passed}`} pass={summary.failed === 0} />
          <Badge value={`Failed: ${summary.failed}`} pass={summary.failed === 0 ? true : false} />
          <Badge value={`Environment: ${summary.environment}`} />
          <Badge value={`Generated: ${new Date(summary.generatedAt).toLocaleString()}`} />
          <Badge value={`Commit: ${summary.commitHash.slice(0, 12)}`} />
        </div>
      </header>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">English Title</th>
              <th className="px-3 py-3">Arabic Title</th>
              <th className="px-3 py-3">Workflow</th>
              <th className="px-3 py-3">QR</th>
              <th className="px-3 py-3">Legal Seal Hash</th>
              <th className="px-3 py-3">Language Isolation</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {summary.results.map((item) => (
              <tr key={item.slug} className="border-t border-slate-100 align-top">
                <td className="px-3 py-3 font-medium text-slate-700">{String(item.id).padStart(2, "0")}</td>
                <td className="px-3 py-3 text-slate-900">{item.titleEn}</td>
                <td className="px-3 py-3 text-slate-900" dir="rtl">{item.titleAr}</td>
                <td className="px-3 py-3"><Badge value={item.workflowStatus} pass={item.workflowStatus === "SEALED"} /></td>
                <td className="px-3 py-3"><Badge value={item.qrVerificationStatus} pass={item.qrVerificationStatus === "VALID"} /></td>
                <td className="px-3 py-3 font-mono text-xs text-slate-700">{item.legalSealHash.slice(0, 16)}...</td>
                <td className="px-3 py-3 text-xs text-slate-700">
                  ar leakage: {item.languageIsolation.arabicLeakageCount}
                  <br />
                  en leakage: {item.languageIsolation.englishLeakageCount}
                </td>
                <td className="px-3 py-3"><Badge value={item.status} pass={item.status === "PASS"} /></td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <a className="rounded bg-slate-900 px-2 py-1 text-xs text-white" href={item.files.previewArabic} target="_blank" rel="noreferrer">AR Preview</a>
                    <a className="rounded bg-slate-700 px-2 py-1 text-xs text-white" href={item.files.previewEnglish} target="_blank" rel="noreferrer">EN Preview</a>
                    <a className="rounded bg-indigo-700 px-2 py-1 text-xs text-white" href={item.files.bilingualPdf} target="_blank" rel="noreferrer">PDF</a>
                    <a className="rounded bg-emerald-700 px-2 py-1 text-xs text-white" href={item.files.evidencePackage} target="_blank" rel="noreferrer">Evidence</a>
                    <a className="rounded bg-amber-700 px-2 py-1 text-xs text-white" href={item.files.auditTrail} target="_blank" rel="noreferrer">Audit</a>
                    <a className="rounded bg-sky-700 px-2 py-1 text-xs text-white" href={item.files.qrResult} target="_blank" rel="noreferrer">QR</a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        <p>
          UAT root: <a className="font-medium text-slate-900 underline" href="/uat-results/" target="_blank" rel="noreferrer">/uat-results/</a>
        </p>
        <p>
          Final report: <a className="font-medium text-slate-900 underline" href="/uat-results/UAT_FINAL_REPORT.md" target="_blank" rel="noreferrer">UAT_FINAL_REPORT.md</a>
        </p>
      </footer>
    </main>
  );
}
