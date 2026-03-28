import puppeteer, { Browser } from "puppeteer";

/**
 * Browser singleton for the scraper service.
 *
 * Launch options follow current Puppeteer / Chrome guidance:
 * - {@link https://pptr.dev/guides/docker Docker & troubleshooting}
 * - {@link https://developer.chrome.com/blog/chrome-headless-shell headless modes}
 *
 * `headless: true` uses Chrome’s **new headless** (not the legacy shell).
 * Use `headless: "shell"` only if you need the old headless binary for compatibility.
 */
class BrowserManager {
  browser: Browser | null = null;
  private isLaunching = false;
  private launchPromise: Promise<Browser> | null = null;

  async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) return this.browser;
    if (this.isLaunching && this.launchPromise) return this.launchPromise;

    this.isLaunching = true;
    this.launchPromise = this.launch();

    try {
      this.browser = await this.launchPromise;
      return this.browser;
    } finally {
      this.isLaunching = false;
      this.launchPromise = null;
    }
  }

  private async launch(): Promise<Browser> {
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;

    const browser = await puppeteer.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      timeout: 60_000,
    });

    browser.on("disconnected", () => {
      this.browser = null;
    });

    return browser;
  }

  async close(): Promise<void> {
    if (!this.browser) return;
    await this.browser.close();
    this.browser = null;
  }
}

export const browserManager = new BrowserManager();

function shutdownBrowser(signal: string): void {
  console.log(`[Browser] ${signal} — closing Chromium`);
  void browserManager.close().then(
    () => process.exit(0),
    () => process.exit(1),
  );
}

process.once("SIGTERM", () => shutdownBrowser("SIGTERM"));
process.once("SIGINT", () => shutdownBrowser("SIGINT"));
