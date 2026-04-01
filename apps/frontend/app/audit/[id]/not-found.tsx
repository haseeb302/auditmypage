import Link from "next/link";
import { APP_CSS } from "@/app/design-system/theme";

export default function AuditNotFound() {
  return (
    <>
      <style>{APP_CSS}</style>
      <div className="audit-wrap">
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            padding: "32px 32px 28px",
          }}
        >
          <div className="audit-header" style={{ marginBottom: 20 }}>
            <div className="audit-url-row" style={{ marginBottom: 16 }}>
              <span className="audit-url-badge">
                <span className="audit-url-dot" />
                Audit not found
              </span>
            </div>
            <h1 className="audit-h1" style={{ marginBottom: 8 }}>
              This report couldn&apos;t be found
            </h1>
            <p className="audit-sub">
              The link may be wrong, expired, or the report is no longer
              available. You can run a fresh audit from the homepage in a few
              seconds.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Link
              href="/?focus=url"
              className="url-submit"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Audit a new page →
            </Link>
            <Link
              href="/"
              style={{
                fontSize: 13.5,
                color: "var(--ink-2)",
                textDecoration: "underline",
              }}
            >
              Back to landing page
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
