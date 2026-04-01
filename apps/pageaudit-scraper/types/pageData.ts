/**
 * Canonical scrape payload shape. Used internally and as input to the OpenAI audit step.
 */
export type PageData = {
  url: string;
  title: string;
  metaDesc: string;
  ogTitle: string;
  ogDesc: string;
  canonical: string;
  hasViewport: boolean;
  headings: {
    h1s: string[];
    h2s: string[];
    h3s: string[];
  };
  heroText: string;
  ctas: Array<{
    text: string;
    tag: string;
    href: string;
    isAboveFold: boolean;
  }>;
  trustSignals: Record<string, { count: number; samples: string[] }>;
  navLinks: string[];
  forms: Array<{
    inputCount: number;
    hasEmail: boolean;
    submitText: string;
  }>;
  imageStats: {
    total: number;
    withAlt: number;
    withoutAlt: number;
    lazyLoaded: number;
    aboveFoldNotLazy: number;
  };
  bodyText: string;
  faqItems: Array<{ q: string; a: string }>;
  pricingText: string;
  featureBullets: string[];
  jsonLd: object[];
  pageSignals: {
    hasFaq: boolean;
    hasPricing: boolean;
    scrollDepth: number;
    wordCount: number;
  };
  mobile: {
    hasHorizontalScroll: boolean;
    hasMobileMenu: boolean;
    viewportWidth: number;
  };
  scrapedAt: string;
};
