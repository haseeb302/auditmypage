"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { requestAudit, resolveSampleAuditId } from "@/app/actions/audit";
import { HASEEB_LINKEDIN_URL } from "@/app/constants";
import { LANDING_FEATURES } from "../constants/features";
import { fadeUp, stagger } from "../design-system/theme";
import { useRouter } from "next/navigation";
import {
  ArrowRightCircle,
  LayoutPanelLeft,
  BadgeCheck,
  Smartphone,
  ScanEye,
} from "lucide-react";

const LOADING_STEPS = [
  "Fetching your page…",
  "Analysing structure and copy…",
  "Scoring 6 dimensions…",
  "Generating recommendations…",
];

const SAMPLES = [
  {
    label: "Motorbook",
    url: "https://motorbook.co.uk",
    description:
      "iOS application for car dealerships to manage their inventory and finance on the go.",
  },
  {
    label: "SmartRetain",
    url: "https://smartretain.xyz",
    description:
      "AI powered tool that converts anything (video, article) into a quiz or flashcards.",
  },
] as const;

type LandingPageProps = {
  onRegisterUrlFocus: (fn: () => void) => void;
};

export function LandingPage({ onRegisterUrlFocus }: LandingPageProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onRegisterUrlFocus(() => {
      if (!urlInputRef.current) return;
      urlInputRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      urlInputRef.current.focus();
    });
  }, [onRegisterUrlFocus]);

  async function handleSubmit(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setStep(0);
    setError(null);

    const stepTimer = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 650);

    try {
      const result = await requestAudit(url.trim());

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/audit/${result.auditId}`);
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      window.clearInterval(stepTimer);
      setLoading(false);
    }
  }

  return (
    <>
      <section className="hero">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <motion.div className="hero-badge" variants={fadeUp} custom={0}>
            <div className="hero-badge-dot" />
            AI-powered · instant results · free to try
          </motion.div>

          <motion.h1 className="hero-h1" variants={fadeUp} custom={1}>
            Your landing page,
            <br />
            <em>honestly audited.</em>
          </motion.h1>

          <motion.p className="hero-sub" variants={fadeUp} custom={2}>
            Paste any URL. In 30 seconds get a scored report covering message
            clarity, CTA strength, trust signals, and mobile readiness — with
            specific fixes.
          </motion.p>

          <motion.form
            className="url-form"
            variants={fadeUp}
            custom={3}
            onSubmit={handleSubmit}
            style={{ pointerEvents: loading ? "none" : "auto" }}
          >
            <input
              className="url-input"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="yoursite.com or https://yoursite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              ref={urlInputRef}
            />
            <button
              className="url-submit"
              type="submit"
              disabled={!url.trim() || loading}
            >
              {loading ? "Auditing…" : "Audit page →"}
            </button>
          </motion.form>

          <AnimatePresence>
            {loading && (
              <motion.div
                className="loading-bar-wrap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="loading-steps">
                  {LOADING_STEPS.map((loadingStep, loadingIndex) => (
                    <div
                      key={loadingIndex}
                      className={`loading-step${step > loadingIndex ? " done" : step === loadingIndex ? " active" : ""}`}
                    >
                      <div className="step-dot" />
                      {loadingStep}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p
              className="url-note"
              style={{ color: "#b91c1c", maxWidth: 560, textAlign: "center" }}
            >
              {error}
            </p>
          )}

          {!loading && !error && (
            <motion.p className="url-note" variants={fadeUp} custom={4}>
              No account needed · reports shareable by link
            </motion.p>
          )}

          <motion.div className="proof-row" variants={fadeUp} custom={5}>
            {[
              { num: "~100", label: "pages audited" },
              { num: "6", label: "dimensions scored" },
              { num: "30s", label: "average time" },
            ].map((stat, index) => (
              <div key={index} className="proof-stat">
                <div className="proof-num">{stat.num}</div>
                <div className="proof-label">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <section className="features">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="features-eyebrow">What we analyse</span>
          <h2 className="features-h2">
            Six dimensions.
            <br />
            One honest score.
          </h2>
        </motion.div>

        <div className="features-grid">
          {LANDING_FEATURES.map((feature, index) => {
            let Icon: React.ComponentType<{
              size?: number;
              strokeWidth?: number;
            }> | null = null;

            // Use icon library for most cards; keep simple glyphs only where you prefer.
            if (feature.name === "Message Clarity") {
              Icon = ScanEye;
            } else if (feature.name === "CTA Strength") {
              Icon = ArrowRightCircle;
            } else if (feature.name === "Page Structure") {
              Icon = LayoutPanelLeft;
            } else if (feature.name === "Value Proposition") {
              Icon = BadgeCheck;
            } else if (feature.name === "Mobile Readiness") {
              Icon = Smartphone;
            }

            return (
              <motion.div
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="feature-icon">
                  {Icon ? <Icon size={18} strokeWidth={2} /> : feature.icon}
                </div>
                <div className="feature-name">{feature.name}</div>
                <div className="feature-desc">{feature.desc}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="features">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="features-eyebrow">See real examples</span>
          <h2 className="features-h2">
            Try a sample audit.
            <br />
            No URL required.
          </h2>
        </motion.div>

        <div className="features-grid">
          {SAMPLES.map((sample, index) => (
            <motion.div
              key={sample.url}
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="feature-name">{sample.label}</div>
              <div className="feature-desc">{sample.description}</div>
              <button
                className="url-submit"
                style={{ marginTop: 16, width: "100%" }}
                disabled={!!sampleLoading}
                onClick={async () => {
                  setError(null);
                  setSampleLoading(sample.url);
                  const result = await resolveSampleAuditId(sample.url);
                  setSampleLoading(null);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  router.push(`/audit/${result.auditId}`);
                }}
              >
                {sampleLoading === sample.url
                  ? "Opening…"
                  : "View sample audit →"}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      <footer>
        <div className="footer-logo">PageAudit</div>
        <div>
          <a
            href={HASEEB_LINKEDIN_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              textDecoration: "underline",
              fontSize: 14,
              fontWeight: "bolder",
            }}
          >
            @haseeb
          </a>
        </div>
        <div className="footer-copy">Free to use · No account required</div>
      </footer>
    </>
  );
}
