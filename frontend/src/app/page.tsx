import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="rounded-2xl bg-white shadow-lg border p-8 max-w-xl text-center">
        <h1 className="text-3xl font-bold text-slate-900">WathiqCare Dashboard</h1>
        <p className="mt-3 text-slate-600">
          Legal-medical discharge refusal management, audit trails, and evidence bundles.
        </p>

        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-slate-900 text-white px-5 py-2.5 font-medium"
          >
            Login
          </Link>
          <Link
            href="/cases"
            className="rounded-xl border px-5 py-2.5 font-medium text-slate-700"
          >
            Cases
          </Link>
        </div>
      </div>
    </main>
  );
}
