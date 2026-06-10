import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscriber Login | WathiqCare™",
  description: "Sign in to your WathiqCare enterprise healthcare legal workspace.",
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#001a3a 0%,#002B5C 50%,#0a3a74 100%)", padding: "24px", fontFamily: "'Inter',ui-sans-serif,sans-serif" }}>
      {/* Background decoration */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(circle at 20% 20%,rgba(75,156,211,.20) 0%,transparent 40%),radial-gradient(circle at 80% 80%,rgba(201,161,59,.12) 0%,transparent 35%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        {/* Card */}
        <div style={{ background: "white", borderRadius: 24, padding: "40px 36px", boxShadow: "0 32px 64px rgba(0,0,0,.24)" }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#002B5C,#1976D2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 20, boxShadow: "0 4px 12px rgba(0,43,92,.30)" }}>W</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#002B5C", letterSpacing: "-.02em" }}>WathiqCare™</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#5A6E82", letterSpacing: ".06em" }}>ENTERPRISE HEALTHCARE LEGAL</div>
            </div>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#002B5C", letterSpacing: "-.02em", margin: "0 0 6px" }}>Subscriber Login</h1>
          <p style={{ fontSize: 14, color: "#5A6E82", margin: "0 0 28px", lineHeight: 1.5 }}>Sign in to your enterprise workspace</p>

          {/* Login form — POSTs to existing auth API */}
          <form action="/api/auth/login" method="POST" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="email" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#102A43", marginBottom: 6, letterSpacing: ".02em" }}>Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="doctor@hospital.sa"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #D8E4EE", fontSize: 14, color: "#102A43", background: "#F8FBFD", outline: "none", fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label htmlFor="password" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#102A43", marginBottom: 6, letterSpacing: ".02em" }}>Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #D8E4EE", fontSize: 14, color: "#102A43", background: "#F8FBFD", outline: "none", fontFamily: "inherit" }}
              />
            </div>
            <button
              type="submit"
              style={{ width: "100%", padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 800, color: "white", background: "linear-gradient(135deg,#002B5C,#1976D2)", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,43,92,.25)", fontFamily: "inherit", marginTop: 4 }}
            >
              Sign In
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #E8F0F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ fontSize: 13, color: "#5A6E82", textDecoration: "none" }}>← Back to home</Link>
            <Link href="/modules/informed-consents" style={{ fontSize: 13, color: "#1976D2", fontWeight: 600, textDecoration: "none" }}>Request Demo →</Link>
          </div>
        </div>

        {/* Security note */}
        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.40)", marginTop: 20 }}>
          🔒 Secured connection · WathiqCare™ Enterprise · MOH Certified
        </p>
      </div>
    </main>
  );
}
