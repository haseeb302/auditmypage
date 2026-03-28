import type { PageData } from "../types/pageData";

/** System message: model must follow structured output schema. */
export const AUDIT_SYSTEM_PROMPT =
  "You are a precise JSON API. Follow the user's instructions and fill the structured response schema exactly. Output must match the schema — no markdown, no commentary outside the structured fields.";

const DIMENSION_LABELS = {
  clarity: "Message Clarity",
  cta: "CTA Strength",
  trust: "Trust Signals",
  value_prop: "Value Proposition",
  structure: "Page Structure",
  mobile: "Mobile Readiness",
} as const;

/**
 * Full audit instructions + interpolated page payload.
 * Uses TS string interpolation so you can branch, trim, or inject sections easily.
 */
export function buildAuditUserMessage(pageUrl: string, pageData: PageData): string {
  const labelsLine = Object.entries(DIMENSION_LABELS)
    .map(([key, label]) => `- ${key} → "${label}"`)
    .join("\n");

  return `You are a conversion rate optimisation expert reviewing a landing page.

You receive structured JSON extracted from a real page (title, headings, CTAs, trust signals, mobile signals, body text, etc.).

Return JSON that matches the response schema you are given (no markdown, no prose before or after).

Scoring rules for each dimension (0–100):
- 80–100: strong, no significant issues
- 60–79: adequate but has clear improvements
- 40–59: weak, hurting conversion
- 0–39: critical issues, likely costing significant leads

For each finding, be specific. Do not say "improve your CTA." Say something like: "Your CTA button says 'Submit' — change it to an outcome-focused phrase like 'Get my free audit'."

The response schema uses a "dimensions" object with exactly these six properties (not an array). Each property must include label, score, summary, and findings. Use these labels exactly:
${labelsLine}

Set "url" to the audited page URL: ${pageUrl}
Set "scanned_at" to an ISO-8601 timestamp for when the audit was produced.

---
Structured page JSON:
${JSON.stringify({ pageUrl, pageData }, null, 2)}`;
}
