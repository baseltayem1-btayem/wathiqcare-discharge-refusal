import Link from "next/link";
import ModulePortalPage from "@/components/ModulePortalPage";
import { type PageAuthClaims, requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

/**
 * Returns true for Next.js internal errors (redirect, not-found) that must
 * propagate to the framework — never swallowed by a try/catch.
 */
function isNextInternalError(error: unknown): boolean {
  const digest = (error as { digest?: string } | null)?.digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")
  );
}

export default async function ModulesPage() {
  let auth: PageAuthClaims;

  try {
    auth = await requirePageAuthClaimsOrRedirect("/modules");
  } catch (error) {
    // Re-throw Next.js redirect / not-found errors so the framework can
    // handle them (redirect to /login). Swallowing them would show the
    // error UI to unauthenticated users instead of redirecting them.
    if (isNextInternalError(error)) {
      throw error;
    }
    console.error("MODULES_RUNTIME_ERROR", {
      route: "/modules",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      stackFile: error instanceof Error ? error.stack?.split("\n")[1]?.trim() || null : null,
    });
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <h1 className="text-center text-xl font-semibold text-slate-900">Modules portal is temporarily unavailable</h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            A runtime guard prevented a full crash. Please retry shortly or open dashboard.
          </p>
          {error instanceof Error && error.message ? (
            <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50 p-2 text-center font-mono text-xs text-amber-800">
              {error.message}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/modules"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Retry modules
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Open dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <ModulePortalPage auth={auth} />;
}
