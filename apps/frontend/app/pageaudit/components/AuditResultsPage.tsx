"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { fadeUp, scoreBg, scoreColor, stagger } from "../design-system/theme";
import type { AuditResult } from "../types";
import { FindingGroup } from "./FindingGroup";
import { ScoreRing } from "./ScoreRing";
import { useRouter } from "next/navigation";

type AuditResultsPageProps = {
  audit: AuditResult;
  id: string;
  onBack: () => void;
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function AuditResultsPage({ audit, onBack, id }: AuditResultsPageProps) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard?.writeText(`${appUrl}/audit/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const verdict =
    audit.score >= 80
      ? "Strong page with minor optimisations needed."
      : audit.score >= 65
        ? "Solid foundation — key conversion issues to address."
        : audit.score >= 50
          ? "Several issues are likely costing you leads."
          : "Critical problems detected. Significant work needed.";

  const context =
    audit.score >= 80
      ? "Your page communicates well and builds trust. Focus on the specific fixes below to push past 85."
      : audit.score >= 65
        ? "The core message is clear but friction points in your CTA and structure are reducing conversions. Prioritise the critical findings first."
        : "Multiple dimensions are underperforming. Start with CTA strength and message clarity — these have the highest impact on first-visit conversion.";

  return (
    <motion.div
      className="audit-wrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="audit-header"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} custom={0}>
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--sans)",
              fontSize: 13,
              color: "var(--ink-2)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginBottom: 24,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--ink-2)";
            }}
          >
            ← Audit another page
          </button>
        </motion.div>

        <motion.div className="audit-url-row" variants={fadeUp} custom={1}>
          <div className="audit-url-badge">
            <div className="audit-url-dot" />
            {audit.url}
          </div>
          <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            {audit.scanned_at}
          </span>
        </motion.div>

        <motion.h1 className="audit-h1" variants={fadeUp} custom={2}>
          Landing page audit
        </motion.h1>
        <motion.p className="audit-sub" variants={fadeUp} custom={3}>
          {audit.dimensions.reduce((acc, dim) => acc + dim.findings.length, 0)}{" "}
          findings across 6 dimensions
        </motion.p>
      </motion.div>

      <motion.div
        className="share-bar"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <span className="share-text">
          Share this report with your team or clients.
        </span>
        <button className="share-btn share-btn-ghost" onClick={onBack}>
          Audit another
        </button>
        <button className="share-btn share-btn-primary" onClick={copyLink}>
          {copied ? "Link copied ✓" : "Copy share link"}
        </button>
      </motion.div>

      <motion.div
        className="score-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="score-circle-wrap">
          <ScoreRing score={audit.score} size={130} stroke={8} />
          <div className="score-circle-num">
            <motion.span
              className="score-big"
              style={{ color: scoreColor(audit.score) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {audit.score}
            </motion.span>
            <span className="score-label">/ 100</span>
          </div>
        </div>
        <div className="score-hero-right">
          <div className="score-verdict">{verdict}</div>
          <div className="score-context">{context}</div>
        </div>
      </motion.div>

      <motion.div
        className="dim-grid"
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ transitionDelay: "0.1s" }}
      >
        {audit.dimensions.map((dim, index) => (
          <motion.div
            key={dim.key}
            className="dim-card"
            variants={fadeUp}
            custom={index}
          >
            <div className="dim-top">
              <div className="dim-name">{dim.label}</div>
              <div
                className="dim-score-pill"
                style={{
                  color: scoreColor(dim.score),
                  background: scoreBg(dim.score),
                }}
              >
                {dim.score}
              </div>
            </div>
            <div className="dim-bar-wrap">
              <motion.div
                className="dim-bar"
                style={{ background: scoreColor(dim.score) }}
                initial={{ width: 0 }}
                animate={{ width: `${dim.score}%` }}
                transition={{
                  duration: 1,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.3 + index * 0.06,
                }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="findings-section">
        {audit.dimensions.map((dim, index) => (
          <FindingGroup key={dim.key} dim={dim} index={index} />
        ))}
      </div>

      <footer style={{ marginTop: 60, padding: "28px 0 0" }}>
        <div className="footer-logo">PageAudit</div>
        <div className="footer-copy">© 2025 · Free to use</div>
      </footer>
    </motion.div>
  );
}
