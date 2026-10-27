import { getQuizSettings } from "../config/quiz.js";

export function createQuizRateLimiter({
  limit = 10,
  windowMs = 600000,
  now = Date.now,
} = {}) {
  const buckets = new Map();

  return function quizGenerationRateLimiter(req, res, next) {
    const key = String(req.user?.id || req.ip || "anonymous");
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
      const retryAfter = Math.max(
        1,
        Math.ceil((bucket.resetAt - currentTime) / 1000)
      );

      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        reason: "generation_rate_limited",
        message: "Too many quiz generation requests. Please wait and try again.",
      });
    }

    bucket.count += 1;

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

const settings = getQuizSettings();

export const quizGenerationRateLimiter = createQuizRateLimiter({
  limit: settings.generationRateLimit,
  windowMs: settings.generationRateWindowMs,
});
