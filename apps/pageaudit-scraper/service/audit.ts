import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { checkAuditRateLimit } from "../lib/rateLimit";
import { UrlBodySchema } from "../lib/urlBodySchema";
import { analyseWithAI } from "./aiAnalyser";
import { scrapePage, ScraperError } from "./scraper";

export const auditRoute = Router();

function clientIp(req: Request): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string") {
    return xf.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress ?? "unknown";
}

function requireApiKey(req: Request, res: Response): boolean {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.SCRAPER_API_KEY) {
    res
      .status(401)
      .json({ error: "Unauthorised. Valid x-api-key header required." });
    return false;
  }
  return true;
}

/** Public read for share links — no API key. */
auditRoute.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id || id.length > 128) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const row = await prisma.pageAudit.findUnique({
      where: { id },
    });
    if (!row) {
      res.status(404).json({ error: "Audit not found" });
      return;
    }
    res.status(200).json({
      success: true,
      audit: row.result,
    });
  } catch {
    res.status(500).json({ error: "Failed to load audit" });
  }
});

auditRoute.post("/", async (req, res) => {
  if (!requireApiKey(req, res)) return;

  const parsed = UrlBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request",
      details: parsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const url = parsed.data.url;

  try {
    const existing = await prisma.pageAudit.findFirst({
      where: { sourceUrl: url },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      res.status(200).json({
        success: true,
        auditId: existing.id,
        fromDatabase: true,
        audit: existing.result,
      });
      return;
    }
  } catch (dbErr) {
    console.error("[audit] lookup failed", dbErr);
    res.status(500).json({ error: "Failed to check existing audits" });
    return;
  }

  if (!checkAuditRateLimit(clientIp(req))) {
    res.status(429).json({
      error: "Rate limit exceeded. You can audit 5 pages per hour.",
    });
    return;
  }

  try {
    const pageData = await scrapePage(url);
    const audit = await analyseWithAI(pageData, url);

    let auditId: string;
    try {
      const row = await prisma.pageAudit.create({
        data: {
          sourceUrl: url,
          result: audit as object,
          pageData: pageData as object,
        },
      });
      auditId = row.id;
    } catch (dbErr) {
      console.error("[audit] persist failed", dbErr);
      res.status(500).json({ error: "Failed to save audit" });
      return;
    }

    res.status(200).json({
      success: true,
      auditId,
      fromDatabase: false,
      audit,
    });
  } catch (err) {
    if (err instanceof ScraperError) {
      const statusMap: Record<string, number> = {
        PAGE_TIMEOUT: 408,
        NAVIGATION_FAILED: 422,
        HTTP_ERROR: 422,
        BLOCKED: 422,
      };
      const status = statusMap[err.code] ?? 422;
      res.status(status).json({
        error: err.message,
        code: err.code,
        meta: err.meta,
      });
      return;
    }

    const message = err instanceof Error ? err.message : "AI analysis failed";
    const status =
      message.includes("OPENAI_API_KEY") || message.includes("not set")
        ? 503
        : 502;
    res.status(status).json({ error: message });
  }
});
