const buckets = new Map<string, { count: number; resetAt: number }>();

/** Simple fixed-window limiter (per IP). */
export function checkAuditRateLimit(
  ip: string,
  limit = 5,
  windowMs = 60 * 60 * 1000,
): boolean {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(ip, b);
  }
  b.count += 1;
  return b.count <= limit;
}
