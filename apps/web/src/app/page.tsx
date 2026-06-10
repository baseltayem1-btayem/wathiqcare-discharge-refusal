import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "WathiqCare™ | Enterprise Healthcare Legal Automation Platform",
  description: "Healthcare consent, clinical-legal workflows, and audit-ready governance — governed from request to signature.",
};

const features = [
  {
    eyebrow: "Consent Library",
    title: "Approved Forms",
    titleAr: "النماذج المعتمدة",
    description: "Smart governed search for approved IMC consent templates with in-page PDF preview and version control.",
    href: "/modules/informed-consents/forms",
    icon: "📋",
    accent: "#1976D2",
    bg: "#EAF4FB",
  },
  {
    eyebrow: "Clinical Workflow",
    title: "Doctor Workspace",
    titleAr: "مساحة عمل الطبيب",
    description: "A physician journey for patient selection, procedure, anesthesia, education, review, and secure sending.",
    href: "/modules/informed-consents",
    icon: "🩺",
    accent: "#002B5C",
    bg: "#E6EEF8",
  },
  {
    eyebrow: "Governance",
    title: "Audit Ready",
    titleAr: "جاهزية التدقيق",
    description: "Controlled medico-legal traceability aligned with healthcare governance and production review.",
    href: "/modules",
    icon: "🛡️",
    accent: "#C9A13B",
    bg: "#FFF8E6",
  },
];

const process = [
  { en: "Patient & Encounter",   ar: "المريض والزيارة" },
  { en: "Template Selection",    ar: "اختيار النموذج" },
  { en: "Procedure Disclosure",  ar: "الإفصاح عن الإجراء" },
  { en: "Anesthesia Review",     ar: "مراجعة التخدير" },
  { en: "Education",             ar: "التثقيف الصحي" },
  { en: "Secure Signing",        ar: "التوقيع الآمن" },
];

const compliance = ["MOH", "NCA", "HIPAA", "GDPR"];

const stats = [
  { val: "100%", label: "Consent coverage" },
  { val: "< 2s",  label: "PDF generation" },
  { val: "99.9%", label: "Platform uptime" },
  { val: "MOH",   label: "Certified" },
];

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", overflow: "hidden", background: "#F4FAFC", color: "#102A43", fontFamily: "'Inter', ui-sans-serif, sans-serif" }}>

      {/* ─── NAV ──────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.96)",
        borderBottom: "1px solid #D8E4EE",
        backdropFilter: "blur(12px)",
        boxShadow: "0 1px 12px rgba(16,42,67,0.06)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#002B5C,#1976D2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 18, boxShadow: "0 4px 12px rgba(0,43,92,.25)" }}>W</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#002B5C", letterSpacing: "-0.02em", lineHeight: 1.2 }}>WathiqCare™</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#5A6E82", letterSpacing: "0.06em" }}>ENTERPRISE HEALTHCARE LEGAL</div>
            </div>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 2 }} className="hidden md:flex">
            {[
              ["Modules", "/modules"],
              ["Doctor Workspace", "/modules/informed-consents"],
              ["Approved Forms", "/modules/informed-consents/forms"],
            ].map(([label, href]) => (
              <Link key={label} href={href} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#002B5C", textDecoration: "none" }}>{label}</Link>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/login" style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#002B5C", textDecoration: "none", border: "1px solid #D8E4EE", background: "white", boxShadow: "0 1px 4px rgba(16,42,67,.06)" }}>
              Subscriber Login
            </Link>
            <Link href="/modules/informed-consents" style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "white", textDecoration: "none", background: "linear-gradient(135deg,#002B5C,#1976D2)", boxShadow: "0 4px 12px rgba(0,43,92,.25)" }}>
              Request Demo
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section style={{ position: "relative", background: "linear-gradient(135deg,#001a3a 0%,#002B5C 40%,#0a3a74 70%,#174D8C 100%)", overflow: "hidden", padding: "80px 24px 96px" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 20%,rgba(75,156,211,.28) 0%,transparent 40%),radial-gradient(circle at 85% 10%,rgba(201,161,59,.18) 0%,transparent 30%),radial-gradient(circle at 50% 100%,rgba(20,184,166,.15) 0%,transparent 35%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "grid", gap: 48, alignItems: "center" }} className="lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 99, background: "rgba(201,161,59,.15)", border: "1px solid rgba(201,161,59,.35)", color: "#F8E7A1", fontSize: 12, fontWeight: 700, marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A13B", display: "inline-block" }} />
                Production · Enterprise Healthcare Legal Platform
              </div>

              <h1 style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 900, color: "white", lineHeight: 1.05, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
                Healthcare consent,<br />governed from request<br />to signature.
              </h1>
              <p style={{ fontSize: 17, color: "rgba(255,255,255,.72)", lineHeight: 1.7, maxWidth: 520, margin: "0 0 16px" }}>
                WathiqCare delivers digital informed consent, clinical-legal documentation, and audit-ready governance — built for enterprise healthcare in Saudi Arabia.
              </p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.48)", lineHeight: 1.7, maxWidth: 480, margin: "0 0 40px", fontFamily: "'IBM Plex Sans Arabic',sans-serif", direction: "rtl", textAlign: "right" }}>
                منصة الموافقة الرقمية والتوثيق القانوني السريري للمنشآت الصحية في المملكة العربية السعودية.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/modules/informed-consents" style={{ padding: "14px 28px", borderRadius: 12, fontSize: 14, fontWeight: 800, color: "white", background: "linear-gradient(135deg,#1976D2,#4B9CD3)", boxShadow: "0 8px 24px rgba(25,118,210,.40)", textDecoration: "none" }}>
                  Open Doctor Workspace
                </Link>
                <Link href="/modules" style={{ padding: "14px 28px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "white", background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.20)", textDecoration: "none", backdropFilter: "blur(8px)" }}>
                  Explore Modules
                </Link>
                <Link href="/modules/informed-consents/forms" style={{ padding: "14px 28px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#F8E7A1", background: "rgba(201,161,59,.12)", border: "1px solid rgba(201,161,59,.35)", textDecoration: "none" }}>
                  Approved Forms →
                </Link>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 48 }}>
                {stats.map(s => (
                  <div key={s.val} style={{ padding: "16px 12px", borderRadius: 12, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.10)", backdropFilter: "blur(8px)" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "white", lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.50)", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: workflow card */}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: -20, borderRadius: 40, background: "linear-gradient(135deg,rgba(25,118,210,.25),rgba(20,184,166,.20))", filter: "blur(32px)" }} />
              <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", backdropFilter: "blur(20px)", boxShadow: "0 32px 64px rgba(0,0,0,.24)" }}>
                <div style={{ padding: "20px 24px 16px", background: "linear-gradient(135deg,rgba(25,118,210,.30),rgba(20,184,166,.20))", borderBottom: "1px solid rgba(255,255,255,.10)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", color: "#C9A13B", textTransform: "uppercase" }}>Live Workspace</div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: "white", margin: "6px 0 0", letterSpacing: "-.02em" }}>Informed Consent</h2>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {["Patient", "Review", "Sign"].map((s, i) => (
                      <div key={s} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, background: "rgba(255,255,255,.10)", textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "white" }}>0{i + 1}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.60)", marginTop: 2 }}>{s}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {process.map((w, i) => (
                    <div key={w.en} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: i === 2 ? "rgba(25,118,210,.20)" : "rgba(255,255,255,.05)", border: `1px solid ${i === 2 ? "rgba(75,156,211,.40)" : "rgba(255,255,255,.07)"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: i < 2 ? "rgba(10,107,58,.30)" : i === 2 ? "rgba(25,118,210,.40)" : "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: i < 2 ? "#6EE7B7" : i === 2 ? "#93C5FD" : "rgba(255,255,255,.40)" }}>
                          {i < 2 ? "✓" : String(i + 1).padStart(2, "0")}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: i < 2 ? "rgba(255,255,255,.55)" : "white" }}>{w.en}</span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: i < 2 ? "rgba(10,107,58,.25)" : i === 2 ? "rgba(25,118,210,.30)" : "rgba(255,255,255,.06)", color: i < 2 ? "#6EE7B7" : i === 2 ? "#93C5FD" : "rgba(255,255,255,.40)" }}>
                        {i < 2 ? "Done" : i === 2 ? "Active" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MODULES ──────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", color: "#1976D2", textTransform: "uppercase", marginBottom: 12 }}>Platform Modules</div>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "#002B5C", letterSpacing: "-.02em", margin: 0 }}>Enterprise Healthcare Legal Suite</h2>
          </div>
          <div style={{ display: "grid", gap: 24 }} className="lg:grid-cols-3">
            {features.map(f => (
              <Link key={f.title} href={f.href} style={{ display: "flex", flexDirection: "column", gap: 20, padding: 28, borderRadius: 20, background: "white", textDecoration: "none", border: "1px solid #D8E4EE", boxShadow: "0 2px 8px rgba(16,42,67,.05)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{f.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: f.accent, textTransform: "uppercase", letterSpacing: ".10em" }}>{f.eyebrow}</div>
                </div>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#002B5C", margin: "0 0 6px", letterSpacing: "-.01em" }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: "#5A6E82", lineHeight: 1.65, margin: 0 }}>{f.description}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: 10, background: f.bg, marginTop: "auto" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: f.accent }}>Open</span>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: f.accent, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "#F4FAFC" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gap: 64, alignItems: "center" }} className="lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", color: "#C9A13B", textTransform: "uppercase", marginBottom: 12 }}>How It Works</div>
              <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 900, color: "#002B5C", letterSpacing: "-.02em", margin: "0 0 16px" }}>Six-stage consent<br />issuance workflow</h2>
              <p style={{ fontSize: 15, color: "#5A6E82", lineHeight: 1.7, margin: "0 0 28px" }}>Every informed consent follows a governed clinical pathway from patient identification to legally-binding digital signature.</p>
              <Link href="/modules/informed-consents" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "#002B5C", color: "white", textDecoration: "none", boxShadow: "0 4px 16px rgba(0,43,92,.25)" }}>
                Start Consent Workflow →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {process.map((w, i) => (
                <div key={w.en} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderRadius: 14, background: "white", border: "1px solid #D8E4EE", boxShadow: "0 2px 6px rgba(16,42,67,.05)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: i === 5 ? "#002B5C" : "#EAF4FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: i === 5 ? "white" : "#1976D2" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#002B5C" }}>{w.en}</div>
                    <div style={{ fontSize: 12, color: "#8A9BB0", fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{w.ar}</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: i < 3 ? "#0A6B3A" : i === 3 ? "#C9A13B" : "#D8E4EE" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPLIANCE ───────────────────────────────────────── */}
      <section style={{ padding: "64px 24px", background: "linear-gradient(135deg,#002B5C,#0a3a74)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", color: "#C9A13B", textTransform: "uppercase", marginBottom: 12 }}>Compliance & Standards</div>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 900, color: "white", letterSpacing: "-.02em", margin: 0 }}>Built to regional and international standards</h2>
          </div>
          <div style={{ display: "grid", gap: 16 }} className="sm:grid-cols-4">
            {compliance.map(c => (
              <div key={c} style={{ padding: "24px 20px", borderRadius: 16, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#C9A13B" }}>{c}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "#F4FAFC" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "#002B5C", letterSpacing: "-.02em", margin: "0 0 16px" }}>Ready to digitize your consent workflow?</h2>
          <p style={{ fontSize: 16, color: "#5A6E82", lineHeight: 1.7, margin: "0 0 36px" }}>Join hospitals using WathiqCare to issue, track, and govern informed consents at enterprise scale.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/modules/informed-consents" style={{ padding: "16px 36px", borderRadius: 12, fontSize: 15, fontWeight: 800, color: "white", background: "linear-gradient(135deg,#002B5C,#1976D2)", textDecoration: "none", boxShadow: "0 8px 24px rgba(0,43,92,.25)" }}>
              Request a Demo
            </Link>
            <Link href="/login" style={{ padding: "16px 36px", borderRadius: 12, fontSize: 15, fontWeight: 700, color: "#002B5C", background: "white", textDecoration: "none", border: "1px solid #D8E4EE", boxShadow: "0 2px 8px rgba(16,42,67,.06)" }}>
              Subscriber Login
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ background: "#001a3a", color: "rgba(255,255,255,.55)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 24px" }}>
          <div style={{ display: "grid", gap: 40, marginBottom: 40 }} className="sm:grid-cols-4">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#1976D2,#4B9CD3)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 16 }}>W</div>
                <div style={{ color: "white", fontWeight: 800, fontSize: 15 }}>WathiqCare™</div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 240 }}>Enterprise healthcare legal automation platform.</p>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".10em", color: "rgba(255,255,255,.35)", textTransform: "uppercase", marginBottom: 16 }}>Platform</div>
              {[["Modules", "/modules"], ["Doctor Workspace", "/modules/informed-consents"], ["Approved Forms", "/modules/informed-consents/forms"]].map(([l, h]) => (
                <Link key={l} href={h} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,.50)", textDecoration: "none", marginBottom: 10 }}>{l}</Link>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".10em", color: "rgba(255,255,255,.35)", textTransform: "uppercase", marginBottom: 16 }}>Legal</div>
              {[["Legal Queue", "/legal"], ["Cases", "/cases"], ["Dashboard", "/dashboard"]].map(([l, h]) => (
                <Link key={l} href={h} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,.50)", textDecoration: "none", marginBottom: 10 }}>{l}</Link>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".10em", color: "rgba(255,255,255,.35)", textTransform: "uppercase", marginBottom: 16 }}>Access</div>
              <Link href="/login" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,.50)", textDecoration: "none", marginBottom: 10 }}>Subscriber Login</Link>
              <Link href="/modules/informed-consents" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,.50)", textDecoration: "none", marginBottom: 10 }}>Request Demo</Link>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 12 }}>© 2026 International Medical Center (IMC). All rights reserved. CR: 4030143596</div>
            <div style={{ display: "flex", gap: 8 }}>
              {compliance.map(c => (
                <span key={c} style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(201,161,59,.15)", color: "#C9A13B", border: "1px solid rgba(201,161,59,.25)" }}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
