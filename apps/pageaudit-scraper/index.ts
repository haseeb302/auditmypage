import "dotenv/config";
import express from "express";
import { errorHandler } from "./error";
import { requestLogger } from "./logger";
import { healthRoute } from "./routes";
import { auditRoute } from "./service/audit";

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? "4000", 10);

app.use(express.json({ limit: "10kb" }));
app.use(requestLogger);

app.use("/api/health", healthRoute);
app.use("/api/audit", auditRoute);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[startup] PageAudit scraper running on port ${PORT}`);
  });
}

export default app;
