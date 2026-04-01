"use server";

import { scraperServiceBaseUrl } from "@/app/lib/scraperBaseUrl";
import type { AuditResult } from "@/app/types";

export type AuditActionResult =
  | { ok: true; auditId: string; audit: AuditResult }
  | { ok: false; error: string; code?: string };

/**
 * Forwards to `pageaudit-scraper` `/api/audit` using server env.
 * All scraping, OpenAI, and Zod validation run in the scraper service.
 */
export async function requestAudit(rawUrl: string): Promise<AuditActionResult> {
  const base = scraperServiceBaseUrl();
  const key = process.env.SCRAPER_API_KEY;
  if (!base || !key) {
    return {
      ok: false,
      error:
        "Server misconfigured: SCRAPER_SERVICE_URL and SCRAPER_API_KEY are required.",
    };
  }

  const res = await fetch(`${base}/api/audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({ url: rawUrl }),
    signal: AbortSignal.timeout(120_000),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    return {
      ok: false,
      error:
        typeof json.error === "string" ? json.error : "Something went wrong",
      code: typeof json.code === "string" ? json.code : undefined,
    };
  }

  const auditId = typeof json.auditId === "string" ? json.auditId : null;
  if (json.success === true && json.audit && auditId) {
    return {
      ok: true,
      auditId,
      audit: json.audit as AuditResult,
    };
  }

  return { ok: false, error: "Unexpected response from audit service" };
}

/**
 * Resolves a sample audit by URL without triggering a new scrape/AI run.
 * Used for the “Samples” section on the landing page.
 */
export async function resolveSampleAuditId(
  url: string,
): Promise<{ ok: true; auditId: string } | { ok: false; error: string }> {
  const base = scraperServiceBaseUrl();
  if (!base) {
    return { ok: false, error: "Server misconfigured: SCRAPER_SERVICE_URL is required." };
  }

  const res = await fetch(
    `${base}/api/audit/by-url?url=${encodeURIComponent(url)}`,
    { cache: "no-store" },
  );

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    auditId?: string;
    error?: string;
  };

  if (!res.ok || json.success !== true || typeof json.auditId !== "string") {
    return {
      ok: false,
      error:
        typeof json.error === "string"
          ? json.error
          : "Sample audit not available yet.",
    };
  }

  return { ok: true, auditId: json.auditId };
}
