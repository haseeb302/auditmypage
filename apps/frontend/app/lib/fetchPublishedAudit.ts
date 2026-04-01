import { scraperServiceBaseUrl } from "@/app/lib/scraperBaseUrl";
import type { AuditResult } from "@/app/types";

/**
 * Loads a persisted audit from the scraper public GET (no API key).
 */
export async function fetchPublishedAudit(
  id: string,
): Promise<AuditResult | null> {
  const trimmed = id?.trim();
  if (!trimmed || !/^[a-z0-9_-]{8,128}$/i.test(trimmed)) {
    return null;
  }

  const base = scraperServiceBaseUrl();
  if (!base) {
    return null;
  }

  try {
    const res = await fetch(
      `${base}/api/audit/${encodeURIComponent(trimmed)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as {
      success?: boolean;
      audit?: AuditResult;
    };
    if (json.success === true && json.audit) {
      return json.audit;
    }
    return null;
  } catch {
    return null;
  }
}
