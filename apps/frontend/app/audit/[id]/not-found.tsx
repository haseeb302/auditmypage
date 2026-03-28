import Link from "next/link";

export default function AuditNotFound() {
  return (
    <div
      style={{
        minHeight: "50vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>Audit not found</h1>
      <p style={{ color: "#64748b", textAlign: "center", maxWidth: 360 }}>
        This link may be wrong or the report is no longer available.
      </p>
      <Link
        href="/"
        style={{
          color: "#0f172a",
          fontWeight: 500,
          textDecoration: "underline",
        }}
      >
        ← Back to PageAudit
      </Link>
    </div>
  );
}
