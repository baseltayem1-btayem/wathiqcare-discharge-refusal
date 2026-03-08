"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearToken } from "../../src/lib/api";

type CaseItem = {
  id: string;
  patient_mrn: string;
  patient_name: string;
  status: string;
  refusal_reason?: string;
  signer_name?: string;
  signer_role?: string;
  pdf_file?: string;
  created_at?: string;
};

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/discharge/cases")
      .then((data) => setCases(data as CaseItem[]))
      .catch((err) => {
        setError(err.message);
        if (err.message.includes("401") || err.message.includes("Invalid")) {
          clearToken();
          router.push("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Discharge Cases</h1>
            <p className="mt-1 text-slate-600">Tenant-scoped legal-medical case list.</p>
          </div>
          <Link href="/bundles" className="rounded-xl border px-4 py-2 font-medium text-slate-700">
            Evidence Bundles
          </Link>
        </div>

        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">MRN</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Signer</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3">{item.patient_mrn}</td>
                    <td className="px-4 py-3">{item.patient_name}</td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.signer_name} {item.signer_role ? `(${item.signer_role})` : ""}
                    </td>
                    <td className="px-4 py-3">{item.created_at || "-"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${item.id}`}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-white"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}

                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No cases found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </main>
  );
}
