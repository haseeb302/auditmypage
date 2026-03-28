// /**
//  * Tests for the PageAudit scraping service.
//  *
//  * Strategy:
//  * - Unit tests: test the route logic with a mocked scrapePage function.
//  *   These run fast (no real browser) and test validation, auth, error handling.
//  * - Integration test: one real scrape against example.com to verify
//  *   the full pipeline works. Skipped in CI by default (slow, needs internet).
//  *
//  * Run all:         npm test
//  * Run unit only:   npm test -- --testPathPattern=unit
//  * Run integration: npm test -- --testPathPattern=integration
//  */

// import request from "supertest";
// import { jest } from "@jest/globals";

// // ─── Mock the scraper module before importing the app ─────────────────────────
// // We mock scrapePage so unit tests don't launch a real browser.
// // jest.unstable_mockModule is the ESM-compatible way to mock modules.
// const mockScrapePage = jest.fn();

// await jest.unstable_mockModule("../src/scraper.js", () => ({
//   scrapePage: mockScrapePage,
//   ScraperError: class ScraperError extends Error {
//     constructor(code, message, meta = {}) {
//       super(message);
//       this.name = "ScraperError";
//       this.code = code;
//       this.meta = meta;
//     }
//   },
// }));

// // Import app AFTER setting up mocks
// const { default: app } = await import("../src/index.js");

// // ─── Test helpers ─────────────────────────────────────────────────────────────
// const VALID_API_KEY = "test-api-key-123";
// const TEST_URL = "https://example.com";

// // Set the API key env var before tests run
// process.env.SCRAPER_API_KEY = VALID_API_KEY;
// process.env.NODE_ENV = "test";

// function makeRequest(body = {}, apiKey = VALID_API_KEY) {
//   return request(app).post("/api/scrape").set("x-api-key", apiKey).send(body);
// }

// // ─── Mock page data fixture ───────────────────────────────────────────────────
// const mockPageData = {
//   url: "https://example.com",
//   title: "Example Domain",
//   metaDesc: "This domain is for illustrative examples.",
//   ogTitle: "",
//   ogDesc: "",
//   canonical: "https://example.com",
//   hasViewport: true,
//   headings: {
//     h1s: ["Example Domain"],
//     h2s: [],
//     h3s: [],
//   },
//   heroText: "Example Domain This domain is for use in illustrative examples.",
//   ctas: [
//     {
//       text: "More information...",
//       tag: "a",
//       href: "https://www.iana.org/domains/reserved",
//       isAboveFold: true,
//     },
//   ],
//   trustSignals: {
//     testimonials: { count: 0, samples: [] },
//     logos: { count: 0, samples: [] },
//     socialProof: { count: 0, samples: [] },
//     badges: { count: 0, samples: [] },
//     ratings: { count: 0, samples: [] },
//   },
//   navLinks: [],
//   forms: [],
//   imageStats: {
//     total: 0,
//     withAlt: 0,
//     withoutAlt: 0,
//     lazyLoaded: 0,
//     aboveFoldNotLazy: 0,
//   },
//   bodyText:
//     "Example Domain. This domain is for use in illustrative examples in documents.",
//   jsonLd: [],
//   pageSignals: {
//     hasFaq: false,
//     hasPricing: false,
//     scrollDepth: 800,
//     wordCount: 14,
//   },
//   mobile: {
//     hasHorizontalScroll: false,
//     hasMobileMenu: false,
//     viewportWidth: 375,
//   },
//   scrapedAt: "2025-01-01T00:00:00.000Z",
// };

// // ─── UNIT TESTS ───────────────────────────────────────────────────────────────

// describe("POST /api/scrape — authentication", () => {
//   it("returns 401 when no API key provided", async () => {
//     const res = await request(app).post("/api/scrape").send({ url: TEST_URL });
//     expect(res.status).toBe(401);
//     expect(res.body.error).toMatch(/unauthorised/i);
//   });

//   it("returns 401 when wrong API key provided", async () => {
//     const res = await makeRequest({ url: TEST_URL }, "wrong-key");
//     expect(res.status).toBe(401);
//   });

//   it("proceeds when correct API key provided", async () => {
//     mockScrapePage.mockResolvedValueOnce(mockPageData);
//     const res = await makeRequest({ url: TEST_URL });
//     expect(res.status).toBe(200);
//   });
// });

// describe("POST /api/scrape — input validation", () => {
//   it("returns 400 when URL is missing", async () => {
//     const res = await makeRequest({});
//     expect(res.status).toBe(400);
//     expect(res.body.error).toBe("Invalid request");
//   });

//   it("returns 400 for a non-URL string", async () => {
//     const res = await makeRequest({ url: "not a url at all" });
//     expect(res.status).toBe(400);
//   });

//   it("auto-prepends https:// if missing", async () => {
//     mockScrapePage.mockResolvedValueOnce(mockPageData);
//     const res = await makeRequest({ url: "example.com" });
//     expect(res.status).toBe(200);
//     // Confirm scrapePage was called with the https version
//     expect(mockScrapePage).toHaveBeenCalledWith("https://example.com");
//   });

//   it("returns 400 for localhost (SSRF protection)", async () => {
//     const res = await makeRequest({ url: "http://localhost:8080/admin" });
//     expect(res.status).toBe(400);
//   });

//   it("returns 400 for internal IP (SSRF protection)", async () => {
//     const res = await makeRequest({ url: "http://192.168.1.1" });
//     expect(res.status).toBe(400);
//   });

//   it("returns 400 for private IP range 10.x (SSRF protection)", async () => {
//     const res = await makeRequest({ url: "http://10.0.0.1/internal" });
//     expect(res.status).toBe(400);
//   });

//   it("accepts a valid https URL", async () => {
//     mockScrapePage.mockResolvedValueOnce(mockPageData);
//     const res = await makeRequest({ url: "https://stripe.com" });
//     expect(res.status).toBe(200);
//   });
// });

// describe("POST /api/scrape — success response shape", () => {
//   beforeEach(() => {
//     mockScrapePage.mockResolvedValue(mockPageData);
//   });

//   it("returns success:true with data and meta", async () => {
//     const res = await makeRequest({ url: TEST_URL });
//     expect(res.status).toBe(200);
//     expect(res.body.success).toBe(true);
//     expect(res.body.data).toBeDefined();
//     expect(res.body.meta).toBeDefined();
//   });

//   it("response data includes all expected fields", async () => {
//     const res = await makeRequest({ url: TEST_URL });
//     const { data } = res.body;

//     expect(data.title).toBeDefined();
//     expect(data.headings).toBeDefined();
//     expect(data.headings.h1s).toBeInstanceOf(Array);
//     expect(data.ctas).toBeInstanceOf(Array);
//     expect(data.trustSignals).toBeDefined();
//     expect(data.imageStats).toBeDefined();
//     expect(data.mobile).toBeDefined();
//     expect(data.pageSignals).toBeDefined();
//   });

//   it("response meta includes url and duration", async () => {
//     const res = await makeRequest({ url: TEST_URL });
//     const { meta } = res.body;
//     expect(meta.url).toBe("https://example.com");
//     expect(typeof meta.duration).toBe("number");
//     expect(meta.scrapedAt).toBeDefined();
//   });
// });

// describe("POST /api/scrape — error handling", () => {
//   it("returns 408 when page times out", async () => {
//     const { ScraperError } = await import("../src/scraper.js");
//     mockScrapePage.mockRejectedValueOnce(
//       new ScraperError("PAGE_TIMEOUT", "Page took over 20s to load"),
//     );
//     const res = await makeRequest({ url: "https://slow-site.example.com" });
//     expect(res.status).toBe(408);
//     expect(res.body.code).toBe("PAGE_TIMEOUT");
//   });

//   it("returns 422 when navigation fails", async () => {
//     const { ScraperError } = await import("../src/scraper.js");
//     mockScrapePage.mockRejectedValueOnce(
//       new ScraperError("NAVIGATION_FAILED", "net::ERR_NAME_NOT_RESOLVED"),
//     );
//     const res = await makeRequest({
//       url: "https://this-domain-does-not-exist-xyz.com",
//     });
//     expect(res.status).toBe(422);
//     expect(res.body.code).toBe("NAVIGATION_FAILED");
//   });

//   it("returns 422 when page returns HTTP 404", async () => {
//     const { ScraperError } = await import("../src/scraper.js");
//     mockScrapePage.mockRejectedValueOnce(
//       new ScraperError("HTTP_ERROR", "Page returned HTTP 404", { status: 404 }),
//     );
//     const res = await makeRequest({ url: "https://example.com/not-found" });
//     expect(res.status).toBe(422);
//   });

//   it("returns 500 for unexpected errors", async () => {
//     mockScrapePage.mockRejectedValueOnce(new Error("Unexpected crash"));
//     const res = await makeRequest({ url: TEST_URL });
//     expect(res.status).toBe(500);
//   });
// });

// describe("GET /api/health", () => {
//   it("returns 200 with status ok", async () => {
//     const res = await request(app).get("/api/health");
//     expect(res.status).toBe(200);
//     expect(res.body.status).toBe("ok");
//     expect(res.body.service).toBe("pageaudit-scraper");
//   });
// });

// describe("Unknown routes", () => {
//   it("returns 404 for unknown routes", async () => {
//     const res = await request(app).get("/api/unknown");
//     expect(res.status).toBe(404);
//   });
// });

// // ─── INTEGRATION TEST ─────────────────────────────────────────────────────────
// // Skipped by default — remove .skip to run against a real browser.
// // Requires: internet access + Puppeteer installed with Chromium.
// // Run with: INTEGRATION=true npm test

// describe.skip("Integration — real scrape (slow)", () => {
//   it("scrapes example.com and returns structured data", async () => {
//     // Restore the real implementation for this test
//     jest.restoreAllMocks();

//     const { scrapePage: realScrape } = await import("../src/scraper.js");
//     const data = await realScrape("https://example.com");

//     expect(data.title).toBeTruthy();
//     expect(data.headings.h1s.length).toBeGreaterThan(0);
//     expect(data.mobile).toBeDefined();
//     expect(data.scrapedAt).toBeDefined();
//   }, 30_000); // 30s timeout for real browser
// });
