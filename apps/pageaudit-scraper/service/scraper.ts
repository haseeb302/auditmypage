import { setTimeout as delay } from "node:timers/promises";
import type { Page } from "puppeteer";
import { browserManager } from "../lib/puppeteer";
import type { PageData } from "../types/pageData";

const PAGE_TIMEOUT_MS = Number.parseInt(
  process.env.PAGE_TIMEOUT_MS ?? "20000",
  10,
);
const JS_SETTLE_MS = Number.parseInt(process.env.JS_SETTLE_MS ?? "2000", 10);

const MOBILE_VIEWPORT = {
  width: 375,
  height: 812,
  deviceScaleFactor: 2,
} as const;

export type ScraperErrorCode =
  | "PAGE_TIMEOUT"
  | "NAVIGATION_FAILED"
  | "HTTP_ERROR"
  | "BLOCKED";

export class ScraperError extends Error {
  code: ScraperErrorCode;
  meta?: Record<string, unknown>;

  constructor(
    code: ScraperErrorCode,
    message: string,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ScraperError";
    this.code = code;
    this.meta = meta;
  }
}

type RawDesktop = {
  title: string;
  metaDesc: string;
  ogTitle: string;
  ogDesc: string;
  canonical: string;
  hasViewport: boolean;
  h1s: string[];
  h2s: string[];
  h3s: string[];
  heroText: string;
  ctas: Array<{
    text: string;
    tagName: string;
    href: string;
    aboveFold: boolean;
  }>;
  logoCount: number;
  logoSamples: string[];
  testimonialSamples: string[];
  socialProofSamples: string[];
  badgeSamples: string[];
  navLinks: string[];
  forms: Array<{ inputCount: number; hasEmail: boolean; submitText: string }>;
  imageTotal: number;
  imageWithAlt: number;
  imageWithoutAlt: number;
  imageLazyLoaded: number;
  imageAboveFoldNotLazy: number;
  bodyText: string;
  sectionMap: Array<{ level: number; heading: string; content: string }>;
  repeatedBlocks: Array<{ items: string[] }>;
  inlineQuotes: Array<{ quote: string; attribution: string }>;
  jsonLd: unknown[];
  hasFaq: boolean;
  hasPricing: boolean;
  scrollDepth: number;
  wordCount: number;
};

type RawMobile = {
  hasHorizontalOverflow: boolean;
  mobileNav: {
    hiddenDesktopLinkCount: number;
    hasAriaToggle: boolean;
    hasVisibleToggleButton: boolean;
  };
};

function mapNavigationError(error: unknown): ScraperError {
  const message = error instanceof Error ? error.message : "Navigation failed";

  if (/timeout/i.test(message)) {
    return new ScraperError("PAGE_TIMEOUT", "Page took too long to load", {
      raw: message,
    });
  }

  if (/ERR_|net::/i.test(message)) {
    return new ScraperError(
      "NAVIGATION_FAILED",
      "Could not reach the target URL",
      { raw: message },
    );
  }

  return new ScraperError("NAVIGATION_FAILED", message, { raw: message });
}

function toPageData(
  url: string,
  d: RawDesktop,
  m: RawMobile,
  scrapedAt: string,
): PageData {
  const trustSignals: PageData["trustSignals"] = {
    logos: {
      count: d.logoCount,
      samples: d.logoSamples.slice(0, 8),
    },
    testimonials: {
      count: d.testimonialSamples.length,
      samples: d.testimonialSamples.slice(0, 5),
    },
    socialProof: {
      count: d.socialProofSamples.length,
      samples: d.socialProofSamples.slice(0, 6),
    },
    badges: {
      count: d.badgeSamples.length,
      samples: d.badgeSamples.slice(0, 6),
    },
  };

  const jsonLd = d.jsonLd.filter(
    (x): x is object => x !== null && typeof x === "object",
  );

  return {
    url,
    title: d.title,
    metaDesc: d.metaDesc,
    ogTitle: d.ogTitle,
    ogDesc: d.ogDesc,
    canonical: d.canonical,
    hasViewport: d.hasViewport,
    headings: {
      h1s: d.h1s,
      h2s: d.h2s,
      h3s: d.h3s,
    },
    heroText: d.heroText,
    ctas: d.ctas.map((c) => ({
      text: c.text,
      tag: c.tagName,
      href: c.href,
      isAboveFold: c.aboveFold,
    })),
    trustSignals,
    navLinks: d.navLinks,
    forms: d.forms,
    imageStats: {
      total: d.imageTotal,
      withAlt: d.imageWithAlt,
      withoutAlt: d.imageWithoutAlt,
      lazyLoaded: d.imageLazyLoaded,
      aboveFoldNotLazy: d.imageAboveFoldNotLazy,
    },
    bodyText: d.bodyText,
    sectionMap: d.sectionMap,
    repeatedBlocks: d.repeatedBlocks,
    inlineQuotes: d.inlineQuotes,
    jsonLd,
    pageSignals: {
      hasFaq: d.hasFaq,
      hasPricing: d.hasPricing,
      scrollDepth: d.scrollDepth,
      wordCount: d.wordCount,
    },
    mobile: {
      hasHorizontalScroll: m.hasHorizontalOverflow,
      mobileNav: m.mobileNav,
      viewportWidth: MOBILE_VIEWPORT.width,
    },
    scrapedAt,
  };
}

async function extractDesktop(page: Page): Promise<RawDesktop> {
  return page.evaluate(() => {
    // NOTE: do NOT define named const/let bindings to arrow functions or function
    // declarations inside page.evaluate(). tsx (esbuild) compiles the outer file
    // with keepNames:true, which wraps every named function binding with __name().
    // That runtime helper is available in the Node.js bundle but NOT when Puppeteer
    // serialises this callback as a string and executes it in the browser context.
    // Use inline anonymous expressions everywhere instead.

    // ── Meta ────────────────────────────────────────────────────────────────
    const title = document.title?.trim() || "";
    const metaDesc =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
        ?.trim() ||
      document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute("content")
        ?.trim() ||
      "";
    const ogTitle =
      document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content")
        ?.trim() || "";
    const ogDesc =
      document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute("content")
        ?.trim() || "";
    const canonical =
      document
        .querySelector('link[rel="canonical"]')
        ?.getAttribute("href")
        ?.trim() || "";
    const hasViewport = !!document.querySelector('meta[name="viewport"]');

    // ── Hero text ───────────────────────────────────────────────────────────
    const h1El = document.querySelector("h1");
    // inline: collapse whitespace for single-line text
    const h1Text = h1El
      ? ((h1El as HTMLElement).innerText ?? h1El.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim()
      : "";

    const heroContainers = [
      "[class*='hero']",
      "[class*='Hero']",
      "[id*='hero']",
      "[id*='Hero']",
      "header",
      "section",
      "main > *:first-child",
      "body > *:nth-child(2)",
    ];

    let heroTextChunk = "";
    for (const sel of heroContainers) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const aboveFold = rect.top < window.innerHeight && rect.bottom > 0;
      if (!aboveFold) continue;
      // inline getCleanText: innerText preserves block-level spacing
      heroTextChunk = ((el as HTMLElement).innerText ?? el.textContent ?? "")
        .replace(/[^\S\n]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 1000);
      if (heroTextChunk.length > 50) break;
    }

    const subheadline = (() => {
      const candidates = h1El
        ? [
            h1El.nextElementSibling,
            h1El.parentElement?.nextElementSibling,
            document.querySelector("[class*='subtitle']"),
            document.querySelector("[class*='subheading']"),
            document.querySelector("[class*='sub-heading']"),
            document.querySelector("[class*='tagline']"),
            document.querySelector("header p"),
            document.querySelector("section p"),
            document.querySelector("h2"),
          ]
        : [];
      for (const el of candidates) {
        if (!el) continue;
        const text = ((el as HTMLElement).innerText ?? el.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim();
        if (text.length > 10 && text.length < 400) return text;
      }
      return "";
    })();

    const heroText = [h1Text, subheadline, heroTextChunk]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2500);

    // ── Headings ────────────────────────────────────────────────────────────
    const h1s = Array.from(document.querySelectorAll("h1"))
      .map((el) =>
        ((el as HTMLElement).innerText ?? el.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean)
      .slice(0, 3);
    const h2s = Array.from(document.querySelectorAll("h2"))
      .map((el) =>
        ((el as HTMLElement).innerText ?? el.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean)
      .slice(0, 10);
    const h3s = Array.from(document.querySelectorAll("h3"))
      .map((el) =>
        ((el as HTMLElement).innerText ?? el.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean)
      .slice(0, 12);

    // ── CTAs ─────────────────────────────────────────────────────────────────
    const allButtons = Array.from(
      document.querySelectorAll(
        "button, a[class*='btn'], a[class*='button'], a[class*='cta'], " +
          "[class*='btn'], [class*='button'], [class*='cta'], " +
          "[role='button']",
      ),
    );

    const ctas = allButtons
      .map((el) => ({
        text: ((el as HTMLElement).innerText ?? el.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim(),
        tagName: el.tagName.toLowerCase(),
        href: el.getAttribute("href") || "",
        aboveFold: (() => {
          const rect = el.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        })(),
      }))
      .filter((b) => b.text.length > 0 && b.text.length < 100)
      .slice(0, 15);

    // ── Logos / partner brands ───────────────────────────────────────────────
    const logoElsAll = Array.from(
      document.querySelectorAll(
        "[class*='logo'] img, [class*='logos'] img, [class*='partner'] img, " +
          "[class*='client'] img, [class*='brand'] img, [id*='logo'] img, " +
          "[class*='sponsor'] img, [class*='customer-logo'] img",
      ),
    );

    const logoSamples = logoElsAll
      .slice(0, 20)
      .map((img) => {
        const alt = img.getAttribute("alt")?.trim();
        const src = img.getAttribute("src")?.trim() || "";
        return alt || src || "";
      })
      .filter(Boolean);

    // ── Testimonials / reviews ────────────────────────────────────────────────
    const testimonialItems: string[] = [];

    const reviewContainerSelectors = [
      "[class*='testimonial']",
      "[class*='Testimonial']",
      "[class*='review']",
      "[class*='Review']",
      "[class*='feedback']",
      "[class*='quote']",
      "[class*='success-story']",
      "[id*='testimonial']",
      "[id*='review']",
      "[id*='feedback']",
    ];

    const visitedEls = new WeakSet<Element>();

    for (const containerSel of reviewContainerSelectors) {
      for (const container of Array.from(
        document.querySelectorAll(containerSel),
      ).slice(0, 5)) {
        if (visitedEls.has(container)) continue;

        const items = Array.from(
          container.querySelectorAll(
            'li, article, [class*="item"], [class*="card"], [class*="block"], [class*="slide"], [class*="entry"]',
          ),
        ).filter((el) => !visitedEls.has(el));

        if (items.length > 1) {
          for (const item of items.slice(0, 6)) {
            const text = (
              (item as HTMLElement).innerText ?? item.textContent ?? ""
            )
              .replace(/[^\S\n]+/g, " ")
              .replace(/\n{3,}/g, "\n\n")
              .trim()
              .slice(0, 500);
            if (text.length > 20) {
              testimonialItems.push(text);
              visitedEls.add(item);
            }
          }
          visitedEls.add(container);
        } else {
          const text = (
            (container as HTMLElement).innerText ?? container.textContent ?? ""
          )
            .replace(/[^\S\n]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
            .slice(0, 500);
          if (text.length > 20) {
            testimonialItems.push(text);
            visitedEls.add(container);
          }
        }

        if (testimonialItems.length >= 8) break;
      }
      if (testimonialItems.length >= 8) break;
    }

    for (const el of Array.from(document.querySelectorAll("blockquote"))) {
      if (visitedEls.has(el)) continue;
      const text = ((el as HTMLElement).innerText ?? el.textContent ?? "")
        .replace(/[^\S\n]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 500);
      if (text.length > 20) testimonialItems.push(text);
    }

    const testimonialSamples = [...new Set(testimonialItems)].slice(0, 8);

    // ── Social proof text ─────────────────────────────────────────────────────
    const bodyTextFull = document.body?.innerText || "";

    const socialProofSamples = (() => {
      const patterns = [
        /[\d,]+\+?\s*(customers?|users?|companies|teams?|businesses?|brands?|clients?)/gi,
        /[\d,]+\+?\s*(reviews?|ratings?|five[- ]star|5[- ]star)/gi,
        /\d+(?:\.\d+)?\/\d+\s*stars?/gi,
        /\d+(?:\.\d+)?\s*(?:out of\s*)?\d+\s*stars?/gi,
        /trusted by\s+[\w\s,&]+/gi,
        /rated\s+\d+(?:\.\d+)?\s*(?:out of\s*)?\d/gi,
        /\d+%\s*(?:of\s+)?(?:customers?|users?|businesses?|satisfaction|positive|recommend)/gi,
        /(?:G2|Capterra|Trustpilot|Product Hunt)[^\n]{0,80}/gi,
        /[\d,]+\+?\s*(?:happy|satisfied|active)\s*(?:customers?|users?)/gi,
      ];
      const found: string[] = [];
      for (const p of patterns) {
        const matches = bodyTextFull.match(p) || [];
        found.push(...matches.map((m) => m.trim().slice(0, 120)).slice(0, 3));
      }
      return [...new Set(found)].slice(0, 8);
    })();

    // ── Trust badges ──────────────────────────────────────────────────────────
    const badgeSamples = Array.from(
      document.querySelectorAll(
        "[class*='trust'], [class*='secure'], [class*='security'], " +
          "[class*='badge'], [class*='cert'], [class*='guarantee'], " +
          "[class*='award'], [class*='accredit']",
      ),
    )
      .map((el) =>
        ((el as HTMLElement).innerText ?? el.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((t) => t.length > 2 && t.length < 120)
      .slice(0, 8);

    // ── Nav links ─────────────────────────────────────────────────────────────
    const navLinks = [
      ...new Set(
        Array.from(document.querySelectorAll("nav a[href], header nav a[href]"))
          .map((a) => (a as HTMLAnchorElement).href)
          .filter(Boolean),
      ),
    ].slice(0, 40);

    // ── Forms ─────────────────────────────────────────────────────────────────
    const forms = Array.from(document.querySelectorAll("form"))
      .map((f) => {
        const inputs = Array.from(
          f.querySelectorAll("input, textarea, select"),
        );
        const hasEmail = inputs.some((i) => {
          const type = (i.getAttribute("type") || "").toLowerCase();
          const name = (i.getAttribute("name") || "").toLowerCase();
          const placeholder = (
            i.getAttribute("placeholder") || ""
          ).toLowerCase();
          return (
            type === "email" ||
            name.includes("email") ||
            placeholder.includes("email")
          );
        });
        const submit = f.querySelector(
          'button[type="submit"], input[type="submit"], button:not([type])',
        );
        let submitText = "";
        if (submit) {
          if (submit instanceof HTMLInputElement) {
            submitText = submit.value?.trim() || "";
          } else {
            submitText = (
              (submit as HTMLElement).innerText ?? submit.textContent ?? ""
            )
              .replace(/\s+/g, " ")
              .trim();
          }
        }
        return {
          inputCount: inputs.length,
          hasEmail,
          submitText: submitText.slice(0, 80),
        };
      })
      .slice(0, 5);

    // ── Images ────────────────────────────────────────────────────────────────
    const imgs = Array.from(document.querySelectorAll("img")).slice(0, 60);
    const imageRows = imgs.map((img) => ({
      hasAlt: !!img.getAttribute("alt"),
      loading: (img.getAttribute("loading") || "eager").toLowerCase(),
      aboveFold: (() => {
        const rect = img.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      })(),
    }));

    // ── JSON-LD ────────────────────────────────────────────────────────────────
    const jsonLd: unknown[] = [];
    for (const s of document.querySelectorAll(
      'script[type="application/ld+json"]',
    )) {
      const raw = s.textContent?.trim();
      if (!raw) continue;
      try {
        jsonLd.push(JSON.parse(raw));
      } catch {
        /* ignore invalid */
      }
    }

    // ── Section map: heading → following content ──────────────────────────────
    // Captures every h2/h3/h4 and the text block that follows it so the AI can
    // classify sections by reading their actual heading text (e.g. "Here's what
    // our users say" → testimonials) without any CSS class matching.
    const sectionMap: Array<{ level: number; heading: string; content: string }> = [];
    const allSectionHeadings = Array.from(
      document.querySelectorAll("h2, h3, h4"),
    ).slice(0, 30);

    for (const heading of allSectionHeadings) {
      const level = parseInt(heading.tagName[1], 10);
      const headingText = (
        (heading as HTMLElement).innerText ?? heading.textContent ?? ""
      )
        .replace(/\s+/g, " ")
        .trim();
      if (headingText.length < 2 || headingText.length > 200) continue;

      // Tags that stop content collection (same or higher heading level)
      const stopAtLevel2 = ["H1", "H2"];
      const stopAtLevel3 = ["H1", "H2", "H3"];
      const stopTags = level <= 2 ? stopAtLevel2 : stopAtLevel3;

      const contentParts: string[] = [];
      let next: Element | null = heading.nextElementSibling;
      while (next) {
        if (stopTags.includes(next.tagName)) break;
        const t = (
          (next as HTMLElement).innerText ?? next.textContent ?? ""
        )
          .replace(/[^\S\n]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        if (t.length > 5) contentParts.push(t);
        if (contentParts.join("").length >= 600) break;
        next = next.nextElementSibling;
      }

      // Fallback: if heading is isolated in a wrapper, grab the parent's text
      if (contentParts.length === 0 && heading.parentElement) {
        const parentText = (
          (heading.parentElement as HTMLElement).innerText ??
          heading.parentElement.textContent ??
          ""
        )
          .replace(/[^\S\n]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        const withoutHeading = parentText.replace(headingText, "").trim();
        if (withoutHeading.length > 5) contentParts.push(withoutHeading);
      }

      sectionMap.push({
        level,
        heading: headingText,
        content: contentParts.join("\n\n").slice(0, 600),
      });
      if (sectionMap.length >= 20) break;
    }

    // ── Repeated sibling blocks (card layouts — testimonials, features, etc.) ─
    // Detects groups of 3+ structurally similar siblings regardless of class names.
    const repeatedBlocks: Array<{ items: string[] }> = [];
    const rbVisited = new WeakSet<Element>();

    const rbContainers = Array.from(
      document.querySelectorAll(
        "section, main > div, article, " +
          "[class*='grid'], [class*='cards'], [class*='features'], " +
          "[class*='testimonials'], [class*='reviews'], [class*='team']",
      ),
    ).slice(0, 25);

    for (const container of rbContainers) {
      if (rbVisited.has(container)) continue;
      const children = Array.from(container.children);
      if (children.length < 3) continue;

      // Find which child tag appears most (the "card" element)
      const tagMap: Record<string, Element[]> = {};
      for (const child of children) {
        if (!tagMap[child.tagName]) tagMap[child.tagName] = [];
        tagMap[child.tagName].push(child);
      }
      let dominantGroup: Element[] = [];
      for (const group of Object.values(tagMap)) {
        if (group.length > dominantGroup.length) dominantGroup = group;
      }
      if (dominantGroup.length < 3) continue;

      const texts = dominantGroup.slice(0, 8).map((el) =>
        (
          (el as HTMLElement).innerText ?? el.textContent ?? ""
        )
          .replace(/[^\S\n]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim(),
      ).filter((t) => t.length > 20 && t.length < 700);

      if (texts.length < 3) continue;

      // Reject if text lengths are wildly dissimilar (e.g. nav items mixed with cards)
      const lengths = texts.map((t) => t.length);
      const minLen = Math.min(...lengths);
      const maxLen = Math.max(...lengths);
      if (maxLen > 0 && minLen / maxLen < 0.08) continue;

      rbVisited.add(container);
      repeatedBlocks.push({ items: texts.slice(0, 6) });
      if (repeatedBlocks.length >= 4) break;
    }

    // ── Inline quotes (testimonials not in a container) ───────────────────────
    // Regex scan for "quoted text" — attribution patterns in the raw body text.
    const inlineQuotes: Array<{ quote: string; attribution: string }> = [];

    const quoteEmDash = /"([^"]{20,350})"[^a-zA-Z0-9]{0,10}[—–-]\s*([^\n"]{3,100})/g;
    const singleEmDash = /'([^']{20,350})'[^a-zA-Z0-9]{0,10}[—–-]\s*([^\n']{3,100})/g;

    let qMatch;
    while (
      (qMatch = quoteEmDash.exec(bodyTextFull)) !== null &&
      inlineQuotes.length < 8
    ) {
      inlineQuotes.push({
        quote: qMatch[1].trim(),
        attribution: qMatch[2].trim(),
      });
    }
    if (inlineQuotes.length < 3) {
      let sqMatch;
      while (
        (sqMatch = singleEmDash.exec(bodyTextFull)) !== null &&
        inlineQuotes.length < 8
      ) {
        inlineQuotes.push({
          quote: sqMatch[1].trim(),
          attribution: sqMatch[2].trim(),
        });
      }
    }

    // ── Body text (prefer main content to avoid nav/footer noise) ─────────────
    const mainContentEl = document.querySelector(
      'main, [role="main"], article, #content, .content, #main, .main',
    );
    const bodyText = mainContentEl
      ? (
          (mainContentEl as HTMLElement).innerText ??
          mainContentEl.textContent ??
          ""
        )
          .replace(/[^\S\n]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
          .slice(0, 20000)
      : bodyTextFull
          .replace(/[^\S\n]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
          .slice(0, 20000);

    // ── Page signals ──────────────────────────────────────────────────────────
    const hasFaq = !!(
      document.querySelector("[class*='faq'], [id*='faq'], [class*='accordion']") ||
      bodyTextFull.toLowerCase().includes("frequently asked") ||
      bodyTextFull.toLowerCase().includes("common question") ||
      sectionMap.some((s) => /faq|question/i.test(s.heading))
    );

    const hasPricing = !!(
      document.querySelector(
        "[class*='pricing'], [id*='pricing'], a[href*='pricing']",
      ) ||
      sectionMap.some((s) => /pric|plan|subscription/i.test(s.heading))
    );

    const scrollDepth = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
    );

    const wordCount = bodyTextFull.split(/\s+/).filter(Boolean).length;

    return {
      title,
      metaDesc,
      ogTitle,
      ogDesc,
      canonical,
      hasViewport,
      h1s,
      h2s,
      h3s,
      heroText,
      ctas,
      logoCount: logoElsAll.length,
      logoSamples,
      testimonialSamples,
      socialProofSamples,
      badgeSamples,
      navLinks,
      forms,
      imageTotal: imgs.length,
      imageWithAlt: imageRows.filter((i) => i.hasAlt).length,
      imageWithoutAlt: imageRows.filter((i) => !i.hasAlt).length,
      imageLazyLoaded: imageRows.filter((i) => i.loading === "lazy").length,
      imageAboveFoldNotLazy: imageRows.filter(
        (i) => i.aboveFold && i.loading !== "lazy",
      ).length,
      bodyText,
      sectionMap,
      repeatedBlocks,
      inlineQuotes,
      jsonLd,
      hasFaq,
      hasPricing,
      scrollDepth,
      wordCount,
    };
  });
}

async function extractMobile(page: Page): Promise<RawMobile> {
  return page.evaluate(() => {
    const hasHorizontalOverflow =
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth;

    // Count how many desktop nav links are hidden at this (mobile) viewport.
    // A high number means the nav collapsed — a strong mobile-nav signal.
    const navLinkEls = Array.from(
      document.querySelectorAll("nav a[href], header nav a[href]"),
    );
    const hiddenDesktopLinkCount = navLinkEls.filter((a) => {
      const s = window.getComputedStyle(a);
      return (
        s.display === "none" || s.visibility === "hidden" || s.opacity === "0"
      );
    }).length;

    // ARIA-based toggle: any visible element that controls a collapsible menu.
    // This works regardless of class naming — aria attributes are semantic.
    const ariaEl = document.querySelector(
      "[aria-expanded], [aria-controls], [aria-haspopup='true'], [aria-haspopup='menu']",
    );
    const hasAriaToggle = ariaEl
      ? window.getComputedStyle(ariaEl).display !== "none" &&
        window.getComputedStyle(ariaEl).visibility !== "hidden"
      : false;

    // Geometry-based toggle: a small visible button inside nav/header.
    // Hamburger icons are typically ≤ 52px × 52px.
    const toggleCandidates = Array.from(
      document.querySelectorAll(
        "nav button, header button, " +
          "nav [role='button'], header [role='button'], " +
          "[aria-label*='menu' i], [aria-label*='nav' i]",
      ),
    );
    const hasVisibleToggleButton = toggleCandidates.some((el) => {
      const s = window.getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.width <= 64 && rect.height > 0;
    });

    return {
      hasHorizontalOverflow,
      mobileNav: { hiddenDesktopLinkCount, hasAriaToggle, hasVisibleToggleButton },
    };
  });
}

export async function scrapePage(url: string): Promise<PageData> {
  const browser = await browserManager.getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["font", "media", "websocket"].includes(type)) {
        void req.abort();
      } else {
        void req.continue();
      }
    });

    let response;
    try {
      response = await page.goto(url, {
        waitUntil: "load",
        timeout: PAGE_TIMEOUT_MS,
      });
    } catch (error) {
      throw mapNavigationError(error);
    }

    const status = response?.status() ?? 0;
    if (status >= 500) {
      console.warn(`[scraper] ${url} returned HTTP ${status}`);
    }

    await delay(JS_SETTLE_MS);
    const desktop = await extractDesktop(page);
    console.log("desktop extracted");

    await page.setViewport(MOBILE_VIEWPORT);
    await delay(500);
    const mobile = await extractMobile(page);

    const scrapedAt = new Date().toISOString();
    return toPageData(url, desktop, mobile, scrapedAt);
  } finally {
    await page.close().catch(() => undefined);
  }
}
