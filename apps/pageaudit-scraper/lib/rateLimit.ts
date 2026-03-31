import Redis from "ioredis";

const WINDOW_SECONDS = 12 * 60 * 60; // 12 hours
const LIMIT = 2; // 2 audits per window

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

export async function checkAuditRateLimit(ip: string): Promise<boolean> {
  if (!ip) ip = "unknown";

  // Local / no-Redis fallback: simple in-memory fixed window
  if (!redis) {
    const now = Date.now();
    const existing = memoryBuckets.get(ip);
    if (!existing || now > existing.resetAt) {
      memoryBuckets.set(ip, {
        count: 1,
        resetAt: now + WINDOW_SECONDS * 1000,
      });
      return true;
    }
    existing.count += 1;
    return existing.count <= LIMIT;
  }

  const key = `ratelimit:audit:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  return count <= LIMIT;
}

