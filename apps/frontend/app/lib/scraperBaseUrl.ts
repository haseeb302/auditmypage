/** SCRAPER_SERVICE_URL must be a valid absolute URL for `fetch`. Railway/Vercel often omit `https://`. */
export function scraperServiceBaseUrl(): string | null {
  const raw = process.env.SCRAPER_SERVICE_URL?.trim();
  if (!raw) return null;
  const withScheme =
    raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `https://${raw}`;
  return withScheme.replace(/\/$/, "");
}
