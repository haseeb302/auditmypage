import { Router } from "express";
import { UrlBodySchema } from "../lib/urlBodySchema";
import { scrapePage, ScraperError } from "./scraper";

export const scrapeRoute = Router();

scrapeRoute.post("/", async (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.SCRAPER_API_KEY) {
    res.status(401).json({ error: "Unauthorised. Valid x-api-key header required." });
    return;
  }

  const result = UrlBodySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "Invalid request",
      details: result.error.issues.map((issue) => issue.message),
    });
    return;
  }

  const { url } = result.data;
  const startTime = Date.now();

  try {
    const pageData = await scrapePage(url);
    const duration = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: pageData,
      meta: {
        url,
        duration,
        scrapedAt: pageData.scrapedAt,
      },
    });
    return;
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

    next(err);
  }
});
