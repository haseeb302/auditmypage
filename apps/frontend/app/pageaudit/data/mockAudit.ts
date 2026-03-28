import type { AuditResult } from "../types";

export const MOCK_AUDIT: AuditResult = {
  url: "https://stripe.com",
  score: 74,
  scanned_at: "Just now",
  dimensions: [
    {
      key: "clarity",
      label: "Message Clarity",
      score: 81,
      summary:
        "Hero message is clear but takes 2 lines to land the value proposition.",
      findings: [
        {
          severity: "suggestion",
          issue:
            "The headline 'Financial infrastructure for the internet' is strong but abstract for first-time visitors.",
          fix: "Consider adding a one-line sub-headline that names the user outcome: 'Accept payments, manage subscriptions, and grow revenue — without writing banking infrastructure from scratch.'",
        },
        {
          severity: "warning",
          issue:
            "The hero subtext is 11 words too long for above-the-fold clarity on mobile.",
          fix: "Trim to a single punchy sentence under 15 words. Test: can a stranger explain your product after reading just the hero?",
        },
      ],
    },
    {
      key: "cta",
      label: "CTA Strength",
      score: 68,
      summary: "Primary CTA is visible but action language is generic.",
      findings: [
        {
          severity: "critical",
          issue:
            "CTA button reads 'Start now' — functional but weak. No outcome is implied.",
          fix: "Rewrite as 'Start accepting payments' or 'Create your free account'. Outcome-focused CTAs convert 14–20% better in A/B tests.",
        },
        {
          severity: "suggestion",
          issue:
            "No secondary CTA for visitors not ready to sign up — you're losing warm leads.",
          fix: "Add a ghost button: 'See how it works →' that scrolls to a demo or explainer section.",
        },
      ],
    },
    {
      key: "trust",
      label: "Trust Signals",
      score: 92,
      summary:
        "Excellent trust layer — logos, numbers, and social proof are all present.",
      findings: [
        {
          severity: "suggestion",
          issue:
            "Customer logos are present but lack names. Anonymous logos don't build trust as strongly.",
          fix: "Add company names below or beside logos. Even recognisable brands benefit from the text label on first encounter.",
        },
      ],
    },
    {
      key: "value_prop",
      label: "Value Proposition",
      score: 71,
      summary:
        "Product benefits are listed but user outcomes are underemphasised.",
      findings: [
        {
          severity: "warning",
          issue:
            "Feature list leads with 'what it does' not 'what you get'. Example: 'Global payments' vs 'Sell in 135+ currencies without extra dev work'.",
          fix: "Rewrite each feature bullet to lead with the user outcome, then support with the feature.",
        },
        {
          severity: "suggestion",
          issue: "No ROI or time-saving claim visible above the fold.",
          fix: "Add a proof stat like 'Teams using Stripe ship payment features 3x faster' near the hero.",
        },
      ],
    },
    {
      key: "structure",
      label: "Page Structure",
      score: 77,
      summary:
        "Logical flow overall, but social proof appears too late in the scroll.",
      findings: [
        {
          severity: "warning",
          issue:
            "Customer testimonials are positioned below the fold on the 4th scroll section. Most visitors won't reach them.",
          fix: "Move at least one testimonial or a key quote directly below the hero section — before the feature list.",
        },
        {
          severity: "suggestion",
          issue:
            "FAQ section is missing. This page likely has common objections that aren't being addressed.",
          fix: "Add a 5-question FAQ section addressing: pricing, security, setup time, migration complexity, and support.",
        },
      ],
    },
    {
      key: "mobile",
      label: "Mobile Readiness",
      score: 58,
      summary:
        "Viewport is set correctly but several elements break on small screens.",
      findings: [
        {
          severity: "critical",
          issue:
            "Navigation menu does not collapse on screens below 375px width — items overflow the viewport.",
          fix: "Ensure hamburger menu activates at <=768px and all nav items are accessible via touch targets >=44px.",
        },
        {
          severity: "warning",
          issue:
            "Hero image is not lazy-loaded — adds ~340kb to initial mobile page load.",
          fix: "Add loading='lazy' to all below-fold images. Use next/image if on Next.js for automatic optimisation.",
        },
        {
          severity: "suggestion",
          issue:
            "CTA button is 280px wide on mobile - could fill full width for easier tap targeting.",
          fix: "Set CTA to width: 100% on mobile breakpoint. Full-width buttons on mobile significantly improve tap conversion.",
        },
      ],
    },
  ],
};
