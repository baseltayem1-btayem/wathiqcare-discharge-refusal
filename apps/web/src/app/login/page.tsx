import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscriber Login | WathiqCareâ„¢",
  description: "Sign in to your WathiqCare enterprise healthcare legal workspace.",
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#001a3a_0%,#002B5C_50%,#0a3a74_100%)] px-6 py-10 font-[var(--font-inter)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(75,156,211,.20)_0%,transparent_40%),radial-gradient(circle_at_80%_80%,rgba(201,161,59,.12)_0%,transparent_35%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/10 shadow-[0_32px_80px_rgba(0,0,0,.26)] backdrop-blur md:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden flex-col justify-between bg-[linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.02))] p-10 text-white md:flex">
            <div>
              <div className="mb-8 inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EAF6FF] to-[#12B7B5] text-lg font-black text-[#002B5C] shadow-lg">
                  W
                </div>
                <div>
                  <div className="text-lg font-extrabold tracking-[-0.02em]">WathiqCare</div>
                  <div className="text-xs font-semibold uppercase tracking-[0.26em] text-white/60">Subscriber Access</div>
                </div>
              </div>

              <div className="max-w-md">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#C9A13B]">Clinical Consent Platform</p>
                <h1 className="text-4xl font-black leading-tight tracking-[-0.03em]">
                  Secure doctor access for informed consent operations.
                </h1>
                <p className="mt-5 text-sm leading-7 text-white/72">
                  Sign in to review approved forms, manage consent journeys, and access support workflows without exposing internal navigation on the public site.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                ["Workspace", "Doctor Only"],
                ["Signing", "OTP Protected"],
                ["Evidence", "Audit Ready"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <div className="text-xl font-black">{value}</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white px-6 py-8 sm:px-10 sm:py-10">
            <div className="mb-8 flex items-center gap-3 md:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#002B5C] to-[#1976D2] text-lg font-black text-white shadow-lg">
                W
              </div>
              <div>
                <div className="text-lg font-extrabold tracking-[-0.02em] text-[#002B5C]">WathiqCare</div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5A6E82]">Subscriber Access</div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#1976D2]">Subscriber Login</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#002B5C]">Sign in to your workspace</h2>
              <p className="mt-3 text-sm leading-6 text-[#5A6E82]">Use your organization account to access the doctor workspace and consent operations.</p>
            </div>

            <form action="/api/auth/login" method="POST" className="mt-8 flex flex-col gap-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#102A43]">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="doctor@hospital.sa"
                  className="h-12 w-full rounded-2xl border border-[#D8E4EE] bg-[#F8FBFD] px-4 text-sm font-medium text-[#102A43] outline-none transition focus:border-[#1976D2] focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#102A43]">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-12 w-full rounded-2xl border border-[#D8E4EE] bg-[#F8FBFD] px-4 text-sm font-medium text-[#102A43] outline-none transition focus:border-[#1976D2] focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="mt-1 inline-flex h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#002B5C,#1976D2)] text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(0,43,92,.24)] transition hover:brightness-105"
              >
                Sign In
              </button>
            </form>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#E8F0F6] pt-6 text-sm">
              <Link href="/" className="font-medium text-[#5A6E82] transition hover:text-[#002B5C]">
                â† Back to home
              </Link>
              <Link href="/" className="font-bold text-[#1976D2] transition hover:text-[#002B5C]">
                Explore WathiqCare â†’
              </Link>
            </div>

            <p className="mt-6 text-center text-xs text-[#7A8CA3]">
              Secured connection Â· WathiqCare Enterprise Â· MOH aligned
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}


