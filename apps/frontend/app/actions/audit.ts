"use server";

import type { AuditResult } from "@/app/pageaudit/types";

export type AuditActionResult =
  | { ok: true; auditId: string; audit: AuditResult }
  | { ok: false; error: string; code?: string };

/**
 * Forwards to `pageaudit-scraper` `/api/audit` using server env.
 * All scraping, OpenAI, and Zod validation run in the scraper service.
 */
export async function requestAudit(rawUrl: string): Promise<AuditActionResult> {
  const base = process.env.SCRAPER_SERVICE_URL?.replace(/\/$/, "");
  const key = process.env.SCRAPER_API_KEY;
  if (!base || !key) {
    return {
      ok: false,
      error: "Server misconfigured: SCRAPER_SERVICE_URL and SCRAPER_API_KEY are required.",
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
