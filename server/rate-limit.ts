import type { Request, Response, NextFunction } from 'express';

/**
 * Minimal in-memory fixed-window rate limiter.
 * Enough to protect the Gemini quota from a single abusive client; replace with
 * Upstash/Redis if the app ever runs on more than one instance.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map cannot grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref?.();

export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 20;
  const message = options.message ?? 'Trop de requêtes. Veuillez patienter quelques instants.';
  const keyGenerator = options.keyGenerator ?? ((req: Request) => req.ip || 'unknown');

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.path}:${keyGenerator(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: message });
      return;
    }

    bucket.count += 1;
    next();
  };
}
