import { Router } from "express";
import { browserManager } from "./lib/puppeteer";

export const healthRoute = Router();

healthRoute.get("/", async (_req, res) => {
  const browserAlive = browserManager.browser?.connected ?? false;

  res.status(200).json({
    status: "ok",
    service: "pageaudit-scraper",
    browser: browserAlive ? "connected" : "not started",
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage().heapUsed,
    timestamp: new Date().toISOString(),
  });
});
