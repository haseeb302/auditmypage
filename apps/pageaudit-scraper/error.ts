import type { Request, Response } from "express";

type ErrorWithStack = Error & { status?: number };

export function errorHandler(
  err: ErrorWithStack,
  req: Request,
  res: Response,
): void {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);

  const isDev = process.env.NODE_ENV !== "production";
  const statusCode = err.status ?? 500;

  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal server error" : "Request failed",
    message: isDev ? err.message : "Something went wrong",
    stack: isDev ? err.stack : undefined,
  });
}
