import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "test") {
    next();
    return;
  }

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const color =
      res.statusCode >= 500
        ? "\x1b[31m"
        : res.statusCode >= 400
          ? "\x1b[33m"
          : "\x1b[32m";

    const reset = "\x1b[0m";
    console.log(
      `${color}${res.statusCode}${reset} ${req.method} ${req.path} — ${duration}ms`,
    );
  });

  next();
}
