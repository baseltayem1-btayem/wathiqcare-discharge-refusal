export default function PatientPublicLinkPage() {
  return (
    <main
      data-testid="patient-public-secure-link"
      data-surface="public-patient-link"
      style={{
        minHeight: "100vh",
        background: "#123B5C",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "Inter, IBM Plex Sans Arabic, Tajawal, Segoe UI, system-ui, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          background: "#FFFFFF",
          padding: 28,
          boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
          color: "#102A43",
        }}
      >
        <div
          style={{
            width: 70,
            height: 70,
            margin: "0 auto 18px",
            borderRadius: 22,
            background: "linear-gradient(135deg,#123B5C,#12B7B5)",
            display: "grid",
            placeItems: "center",
            color: "#FFFFFF",
            fontWeight: 900,
            fontSize: 24,
          }}
        >
          WC
        </div>

        <h1 style={{ textAlign: "center", margin: 0, fontSize: 25, fontWeight: 900 }}>
          WathiqCare
        </h1>

        <p style={{ textAlign: "center", color: "#64798B", lineHeight: 1.6 }}>
          Secure patient consent link. Review education, verify by OTP, and sign electronically.
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
          {["Verify Identity", "Review Education", "Read Consent", "Sign Electronically"].map((item, index) => (
            <div
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 14,
                border: "1px solid #D8E8EF",
                borderRadius: 16,
                background: "#F7FBFC",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: "#EAF6FF",
                  color: "#2F90C7",
                  fontWeight: 900,
                }}
              >
                {index + 1}
              </span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>

        <button
          type="button"
          style={{
            width: "100%",
            minHeight: 48,
            marginTop: 22,
            border: 0,
            borderRadius: 16,
            background: "linear-gradient(90deg,#2F90C7,#12B7B5)",
            color: "#FFFFFF",
            fontWeight: 900,
            fontSize: 16,
          }}
        >
          Continue
        </button>
      </section>
    </main>
  );
}
