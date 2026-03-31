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
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const hasViewport = !!viewportMeta;

    const h1El = document.querySelector("h1");

    const heroContainers = [
      "header",
      "section",
      "[class*='hero']",
      "[class*='Hero']",
      "[id*='hero']",
      "[id*='Hero']",
      "main > *:first-child",
      "body > *:nth-child(2)",
    ];

    let heroTextChunk = "";
    for (const sel of heroContainers) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        const aboveFold = rect.top < window.innerHeight && rect.bottom > 0;
        if (!aboveFold) continue;
        heroTextChunk = el.textContent?.trim().slice(0, 800) || "";
        if (heroTextChunk.length > 50) break;
      }
    }

    const subheadline = (() => {
      const candidates = h1El
        ? [
            h1El.nextElementSibling,
            h1El.parentElement?.nextElementSibling,
            document.querySelector("h2"),
            document.querySelector("[class*='subtitle']"),
            document.querySelector("[class*='subheading']"),
            document.querySelector("header p"),
            document.querySelector("section p"),
          ]
        : [];
      for (const el of candidates) {
        if (!el) continue;
        const text = el.textContent?.trim() || "";
        if (text.length > 10 && text.length < 300) return text;
      }
      return "";
    })();

    const h1Text = h1El?.textContent?.trim() || "";
    const heroText = [h1Text, subheadline, heroTextChunk]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2000);

    const h1s = Array.from(document.querySelectorAll("h1"))
      .map((el) => el.textContent?.trim() || "")
      .filter(Boolean)
      .slice(0, 3);
    const h2s = Array.from(document.querySelectorAll("h2"))
      .map((el) => el.textContent?.trim() || "")
      .filter(Boolean)
      .slice(0, 8);
    const h3s = Array.from(document.querySelectorAll("h3"))
      .map((el) => el.textContent?.trim() || "")
      .filter(Boolean)
      .slice(0, 8);

    const allButtons = Array.from(
      document.querySelectorAll(
        "button, a[class*='btn'], a[class*='button'], a[class*='cta'], [class*='btn'], [class*='button'], [class*='cta']",
      ),
    );

    const ctas = allButtons
      .map((el) => ({
        text: el.textContent?.trim() || "",
        tagName: el.tagName.toLowerCase(),
        href: el.getAttribute("href") || "",
        aboveFold: (() => {
          const rect = el.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        })(),
      }))
      .filter((b) => b.text.length > 0 && b.text.length < 80)
      .slice(0, 12);

    const logoElsAll = Array.from(
      document.querySelectorAll(
        "[class*='logo'] img, [class*='logos'] img, [class*='partner'] img, [class*='client'] img, [class*='brand'] img, [id*='logo'] img",
      ),
    );
    const logoEls = logoElsAll.slice(0, 20);

    const logoSamples = logoEls
      .map((img) => {
        const alt = img.getAttribute("alt")?.trim();
        const src = img.getAttribute("src")?.trim() || "";
        return alt || src || "";
      })
      .filter(Boolean);

    const testimonialSamples = Array.from(
      document.querySelectorAll(
        "blockquote, [class*='testimonial'], [class*='quote'], [class*='review'], [class*='feedback'], [class*='customer']",
      ),
    )
      .map((el) => el.textContent?.trim().slice(0, 300) || "")
      .filter((t) => t.length > 20)
      .slice(0, 5);

    const bodyTextFull = document.body?.innerText || "";
    const socialProofSamples = (() => {
      const patterns = [
        /[\d,]+\+?\s*(customers?|users?|companies|teams?|businesses?)/gi,
        /[\d,]+\+?\s*(reviews?|ratings?)/gi,
        /\d+(?:\.\d+)?\/\d+\s*stars?/gi,
        /trusted by\s+[\w\s,]+/gi,
      ];
      const found: string[] = [];
      for (const p of patterns) {
        const matches = bodyTextFull.match(p) || [];
        found.push(...matches.slice(0, 2));
      }
      return [...new Set(found)].slice(0, 6);
    })();

    const badgeSamples = Array.from(
      document.querySelectorAll(
        "[class*='trust'], [class*='secure'], [class*='security'], [class*='badge'], [class*='cert'], [class*='guarantee']",
      ),
    )
      .map((el) => el.textContent?.trim() || "")
      .filter((t) => t.length > 2 && t.length < 100)
      .slice(0, 6);

    const navLinks = [
      ...new Set(
        Array.from(document.querySelectorAll("nav a[href], header nav a[href]"))
          .map((a) => (a as HTMLAnchorElement).href)
          .filter(Boolean),
      ),
    ].slice(0, 40);

    const forms = Array.from(document.querySelectorAll("form"))
      .map((f) => {
        const inputs = Array.from(
          f.querySelectorAll("input, textarea, select"),
        );
        const hasEmail = inputs.some((i) => {
          const type = (i.getAttribute("type") || "").toLowerCase();
          const name = (i.getAttribute("name") || "").toLowerCase();
          return type === "email" || name.includes("email");
        });
        const submit = f.querySelector(
          'button[type="submit"], input[type="submit"], button:not([type])',
        );
        let submitText = "";
        if (submit) {
          if (submit instanceof HTMLInputElement)
            submitText = submit.value?.trim() || "";
          else submitText = submit.textContent?.trim() || "";
        }
        return {
          inputCount: inputs.length,
          hasEmail,
          submitText: submitText.slice(0, 80),
        };
      })
      .slice(0, 5);

    const imgs = Array.from(document.querySelectorAll("img")).slice(0, 40);
    const imageRows = imgs.map((img) => ({
      hasAlt: !!img.getAttribute("alt"),
      loading: (img.getAttribute("loading") || "eager").toLowerCase(),
      aboveFold: (() => {
        const rect = img.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      })(),
    }));

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

    const hasFaq = !!(
      document.querySelector("[class*='faq'], [id*='faq']") ||
      bodyTextFull.toLowerCase().includes("frequently asked") ||
      bodyTextFull.toLowerCase().includes("faq")
    );

    const hasPricing = !!document.querySelector(
      "[class*='pricing'], [id*='pricing'], a[href*='pricing']",
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
      bodyText: bodyTextFull.slice(0, 12000),
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

    await page.setViewport(MOBILE_VIEWPORT);
    await delay(500);
    const mobile = await extractMobile(page);

    const scrapedAt = new Date().toISOString();
    return toPageData(url, desktop, mobile, scrapedAt);
  } finally {
    await page.close().catch(() => undefined);
  }
}
