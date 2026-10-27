const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function readPositiveNumber(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function createAuthRateLimiter({
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
  now = Date.now,
} = {}) {
  const buckets = new Map();

  return function authRateLimiter(req, res, next) {
    const key = String(req.ip || req.socket?.remoteAddress || "unknown");
    const currentTime = now();
    let bucket = buckets.get(key);

    if (!bucket || currentTime >= bucket.resetAt) {
      bucket = {
        count: 0,
        resetAt: currentTime + windowMs,
      };
      buckets.set(key, bucket);
    }

    if (bucket.count >= limit) {
      res.set("X-RateLimit-Limit", String(limit));
      res.set("X-RateLimit-Remaining", "0");
      const retryAfter = Math.max(
        1,
        Math.ceil((bucket.resetAt - currentTime) / 1000)
      );

      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        reason: "auth_rate_limited",
        message: "Too many sign-in attempts. Please wait and try again.",
      });
    }

    bucket.count += 1;
    res.set("X-RateLimit-Limit", String(limit));
    res.set(
      "X-RateLimit-Remaining",
      String(Math.max(0, limit - bucket.count))
    );

    if (buckets.size > 1000) {
      for (const [bucketKey, entry] of buckets) {
        if (currentTime >= entry.resetAt) {
          buckets.delete(bucketKey);
        }
      }
    }

    return next();
  };
}

export const authRateLimiter = createAuthRateLimiter({
  limit: readPositiveNumber(process.env.AUTH_RATE_LIMIT, DEFAULT_LIMIT),
  windowMs:
    readPositiveNumber(process.env.AUTH_RATE_WINDOW_MINUTES, 15) * 60 * 1000,
});
