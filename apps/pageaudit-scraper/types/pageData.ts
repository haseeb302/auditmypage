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
  /** Every h2/h3/h4 heading mapped to the text block that follows it. */
  sectionMap: Array<{ level: number; heading: string; content: string }>;
  /** Groups of 3+ structurally similar sibling elements (card layouts). */
  repeatedBlocks: Array<{ items: string[] }>;
  /** Quoted-text + attribution patterns extracted from raw body text. */
  inlineQuotes: Array<{ quote: string; attribution: string }>;
  jsonLd: object[];
  pageSignals: {
    hasFaq: boolean;
    hasPricing: boolean;
    scrollDepth: number;
    wordCount: number;
  };
  mobile: {
    hasHorizontalScroll: boolean;
    /** Three independent signals — evaluated together, not in isolation. */
    mobileNav: {
      /** Nav links hidden at 375 px viewport (collapsed nav = high count). */
      hiddenDesktopLinkCount: number;
      /** Visible element with aria-expanded / aria-controls / aria-haspopup. */
      hasAriaToggle: boolean;
      /** Small visible button in nav/header (hamburger geometry ≤ 64 px). */
      hasVisibleToggleButton: boolean;
    };
    viewportWidth: number;
  };
  scrapedAt: string;
};
