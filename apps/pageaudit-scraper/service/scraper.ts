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
  faqItems: Array<{ q: string; a: string }>;
  pricingText: string;
  featureBullets: string[];
  jsonLd: unknown[];
  hasFaq: boolean;
  hasPricing: boolean;
  scrollDepth: number;
  wordCount: number;
};

type RawMobile = {
  hasHorizontalOverflow: boolean;
  hasMobileMenu: boolean;
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
    faqItems: d.faqItems,
    pricingText: d.pricingText,
    featureBullets: d.featureBullets,
    jsonLd,
    pageSignals: {
      hasFaq: d.hasFaq,
      hasPricing: d.hasPricing,
      scrollDepth: d.scrollDepth,
      wordCount: d.wordCount,
    },
    mobile: {
      hasHorizontalScroll: m.hasHorizontalOverflow,
      hasMobileMenu: m.hasMobileMenu,
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

    // ── FAQ extraction ─────────────────────────────────────────────────────────
    const faqItems: Array<{ q: string; a: string }> = [];

    // Method 1: <details>/<summary> accordion pattern
    for (const detail of Array.from(
      document.querySelectorAll("details"),
    ).slice(0, 20)) {
      const summary = detail.querySelector("summary");
      if (!summary) continue;
      const q = ((summary as HTMLElement).innerText ?? summary.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();
      if (!q || q.length < 5) continue;
      const clone = detail.cloneNode(true) as HTMLElement;
      clone.querySelector("summary")?.remove();
      const a = (clone.innerText || clone.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
      if (q && a) faqItems.push({ q: q.slice(0, 250), a: a.slice(0, 600) });
      if (faqItems.length >= 12) break;
    }

    // Method 2: FAQ section with heading + sibling paragraph/div pattern
    if (faqItems.length < 3) {
      const faqSection = document.querySelector(
        "[class*='faq'], [id*='faq'], [class*='FAQ'], [id*='FAQ'], " +
          "[class*='accordion'], [id*='accordion']",
      );
      if (faqSection) {
        const questionEls = Array.from(
          faqSection.querySelectorAll(
            "h2, h3, h4, dt, " +
              "[class*='question'], [class*='title'], [class*='heading'], [class*='trigger'], [class*='toggle']",
          ),
        );
        for (const qEl of questionEls.slice(0, 15)) {
          const q = (
            (qEl as HTMLElement).innerText ?? qEl.textContent ?? ""
          )
            .replace(/\s+/g, " ")
            .trim();
          if (!q || q.length < 5) continue;
          let next = qEl.nextElementSibling;
          while (next && ["H2", "H3", "H4", "DT"].includes(next.tagName)) {
            next = next.nextElementSibling;
          }
          if (next) {
            const a = (
              (next as HTMLElement).innerText ?? next.textContent ?? ""
            )
              .replace(/[^\S\n]+/g, " ")
              .replace(/\n{3,}/g, "\n\n")
              .trim()
              .slice(0, 600);
            if (a.length > 5) faqItems.push({ q: q.slice(0, 250), a });
          }
          if (faqItems.length >= 12) break;
        }
      }
    }

    // ── Pricing text ──────────────────────────────────────────────────────────
    const pricingEl = document.querySelector(
      "[class*='pricing'], [id*='pricing'], [class*='Pricing'], " +
        "[class*='plans'], [id*='plans'], [class*='packages'], section[class*='plan']",
    );
    const pricingText = pricingEl
      ? (
          (pricingEl as HTMLElement).innerText ?? pricingEl.textContent ?? ""
        )
          .replace(/[^\S\n]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
          .slice(0, 2500)
      : "";

    // ── Feature / benefit bullets ─────────────────────────────────────────────
    const featureBullets: string[] = [];

    const featureListSelectors = [
      "[class*='feature'] li",
      "[class*='features'] li",
      "[class*='benefit'] li",
      "[class*='benefits'] li",
      "[class*='advantage'] li",
      "[class*='advantages'] li",
      "[class*='include'] li",
      "[class*='why'] li",
      "[class*='what-you-get'] li",
      "[class*='offer'] li",
    ];

    for (const sel of featureListSelectors) {
      const items = Array.from(document.querySelectorAll(sel));
      const texts = items
        .map((el) =>
          ((el as HTMLElement).innerText ?? el.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter((t) => t.length > 5 && t.length < 250);
      if (texts.length >= 3) {
        featureBullets.push(...texts.slice(0, 15));
        break;
      }
    }

    if (featureBullets.length === 0) {
      const mainEl = document.querySelector(
        'main, [role="main"], article, #content, .content',
      );
      const searchRoot = mainEl || document.body;
      for (const ul of Array.from(searchRoot.querySelectorAll("ul")).slice(
        0,
        10,
      )) {
        const items = Array.from(ul.querySelectorAll("li"))
          .map((el) =>
            ((el as HTMLElement).innerText ?? el.textContent ?? "")
              .replace(/\s+/g, " ")
              .trim(),
          )
          .filter((t) => t.length > 5 && t.length < 250);
        if (items.length >= 3) {
          featureBullets.push(...items.slice(0, 12));
          if (featureBullets.length >= 12) break;
        }
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
          .slice(0, 14000)
      : bodyTextFull
          .replace(/[^\S\n]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
          .slice(0, 14000);

    // ── Page signals ──────────────────────────────────────────────────────────
    const hasFaq = !!(
      faqItems.length > 0 ||
      document.querySelector(
        "[class*='faq'], [id*='faq'], [class*='accordion']",
      ) ||
      bodyTextFull.toLowerCase().includes("frequently asked") ||
      bodyTextFull.toLowerCase().includes("common question")
    );

    const hasPricing = !!(
      pricingEl ||
      document.querySelector(
        "[class*='pricing'], [id*='pricing'], a[href*='pricing']",
      )
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
      faqItems,
      pricingText,
      featureBullets,
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
    const hasMobileMenu = !!document.querySelector(
      "[class*='hamburger'], [class*='mobile-menu'], [class*='menu-toggle'], [class*='nav-toggle'], [aria-label*='menu']",
    );
    const hasHorizontalOverflow =
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth;
    return { hasHorizontalOverflow, hasMobileMenu };
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
