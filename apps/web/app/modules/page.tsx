import ModulePortalPage from "@/components/ModulePortalPage";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function ModulesPage() {
  try {
    const auth = await requirePageAuthClaimsOrRedirect("/modules");
    return <ModulePortalPage auth={auth} />;
  } catch (error) {
    console.error("MODULES_PAGE_RUNTIME_ERROR", error);
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <h1 className="text-center text-xl font-semibold text-slate-900">Modules portal is temporarily unavailable</h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            A runtime guard prevented a full crash. Please retry shortly or open dashboard.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="/modules"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Retry modules
            </a>
            <a
              href="/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Open dashboard
            </a>
          </div>
        </section>
      </main>
    );
  }
}
