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

export function buildAuditUserMessage(
  pageUrl: string,
  pageData: PageData,
): string {
  const labelsLine = Object.entries(DIMENSION_LABELS)
    .map(([key, label]) => `- ${key} → "${label}"`)
    .join("\n");

  return `You are a senior conversion rate optimisation consultant conducting a deep audit of a landing page. Your job is to produce findings that are specific, evidence-based, and immediately actionable — not generic advice a visitor could find in any blog post.

## What you receive

The page data is structured JSON extracted from a real page. Key fields:

- **title / metaDesc / ogTitle / ogDesc** — SEO and social metadata
- **headings.h1s / h2s / h3s** — Full heading hierarchy across the page
- **heroText** — Above-the-fold copy: h1, subheadline, and hero container text concatenated
- **ctas** — Every button and CTA link found; each entry notes the label text, tag, href, and whether it was above the fold (isAboveFold: true)
- **trustSignals.testimonials** — Extracted testimonial/review text samples
- **trustSignals.socialProof** — Quantitative proof strings ("10,000+ customers", star ratings, platform mentions)
- **trustSignals.logos** — Partner/client logo alt texts
- **trustSignals.badges** — Trust badge and certification texts
- **forms** — Lead capture forms: field count, email field present, submit button label
- **bodyText** — Main page content text (nav/footer excluded where possible)
- **faqItems** — Extracted FAQ question + answer pairs (empty array = no FAQ found)
- **pricingText** — Text from the pricing/plans section (empty = none detected)
- **featureBullets** — Extracted feature or benefit list items
- **jsonLd** — Structured data (may contain Review, AggregateRating, FAQPage, Product schemas)
- **pageSignals** — { hasFaq, hasPricing, wordCount, scrollDepth }
- **mobile** — { hasHorizontalScroll, hasMobileMenu, viewportWidth }
- **imageStats** — { total, withAlt, withoutAlt, lazyLoaded, aboveFoldNotLazy }

## Scoring (0–100 per dimension)

- **80–100** — Strong execution; no meaningful conversion issues
- **60–79** — Adequate but has clear, fixable gaps worth addressing
- **40–59** — Weak — actively damaging conversion; significant rework needed
- **0–39** — Critical failure — likely losing the majority of potential leads

## Per-dimension guidance

### clarity — Message Clarity
Does a visitor understand within 5 seconds what the product/service does, who it's for, and what outcome they get?
- Examine: heroText, h1s, metaDesc, subheadline portion of heroText
- Flag: vague/clever headlines with no clear benefit, jargon, missing target audience signal, unclear product category
- Quote the exact h1 and critique it. Does it state a concrete outcome? Is the niche obvious?
- Strong example: "Turn your WordPress site into a lead machine in 48 hours" — weak example: "The future of digital is here"

### cta — CTA Strength
Are CTAs specific, outcome-oriented, and placed where users decide to act?
- Examine: ctas array — focus on isAboveFold: true items first; also check forms[].submitText
- Flag: weak verbs ("Submit", "Click here", "Learn more", "Get started" with no context), missing above-fold CTA, too many competing CTAs with no clear primary, form submit labels that don't reflect the value exchange
- Always quote the exact CTA text and propose a specific replacement
- Strong: "Get my free landing page audit" — weak: "Submit"

### trust — Trust Signals
Does the page give visitors concrete reasons to believe?
- Examine: trustSignals (testimonials, socialProof, logos, badges), faqItems, jsonLd for Review/AggregateRating schemas
- Flag: no testimonials or reviews, testimonials with no name/role/company attribution, vague social proof ("many customers"), no logos if targeting businesses, no security/privacy note near forms, review stats mentioned in text but not visually prominent
- If testimonialSamples is empty and socialProof is empty, that is a critical trust gap — say so explicitly
- Note any third-party validation (G2, Capterra, Trustpilot) detected in socialProof strings

### value_prop — Value Proposition
Is there a differentiated promise that separates this product from competitors?
- Examine: heroText, featureBullets, pricingText, h2s/h3s, bodyText
- Flag: generic claims with no specifics ("high quality", "affordable", "easy to use", "powerful"), features listed without linking to outcomes/benefits, no indication of what makes this different from alternatives
- Ask: what specific measurable outcome does this deliver? For whom exactly? Why this over a competitor?
- If featureBullets exist, evaluate whether they describe features or outcomes — outcomes are stronger

### structure — Page Structure
Is the page organised to guide a visitor from problem → solution → proof → action?
- Examine: h2s/h3s as a skeleton, pageSignals.hasFaq, pageSignals.hasPricing, faqItems length, pageSignals.wordCount, forms placement, ctas below fold
- Flag: missing sections that matter for this niche (e.g. no pricing/next-step clarity for a SaaS, no FAQ for a complex service, no testimonials section), poor heading hierarchy, wall of text with low scanability, CTA only at the very bottom, no logical flow between sections
- hasFaq: false on a complex product/service page is a meaningful gap to call out

### mobile — Mobile Readiness
Does the page work well on small screens?
- Examine: mobile.hasHorizontalScroll (if true = layout is broken on mobile, critical), mobile.hasMobileMenu, hasViewport, imageStats.aboveFoldNotLazy, imageStats.withoutAlt
- Flag: horizontal scroll = broken layout (score must be ≤ 40), no mobile navigation menu when desktop nav has multiple links, non-lazy images above fold slowing load, missing viewport meta tag, images without alt text (accessibility + SEO impact)
- If mobile.hasHorizontalScroll is false and mobile.hasMobileMenu is true, this is a good baseline — still look for image and accessibility issues

## Findings quality rules

1. **Quote first, critique second.** Always reference the actual content from the page data. "Your h1 reads '[exact text]' — this doesn't communicate..." is far more useful than "Your headline is unclear."
2. **Propose the exact fix.** "Change the submit button from 'Send' to 'Get my free quote'" not "improve your form CTA."
3. **Adapt to the niche.** A local automotive dealer and a B2B SaaS tool have different conversion levers. Read the page context and adjust expectations and recommendations accordingly.
4. **Findings per dimension.** Provide 2–5 distinct, non-overlapping findings per dimension.
5. **Summary.** Write 2–4 sentences: state the score rationale, name the biggest strength (if any), and name the single most important thing to fix.
6. **Overall score.** Set "score" on the root object to the weighted average of dimension scores (round to nearest integer).

## Schema instructions

The response schema uses a "dimensions" object with exactly these six properties (not an array). Each property must include label, score, summary, and findings array. Use these exact dimension keys and labels:
${labelsLine}

Set "url" to: ${pageUrl}
Set "scanned_at" to the current ISO 8601 timestamp.

---
Structured page JSON:
${JSON.stringify({ pageUrl, pageData }, null, 2)}`;
}
