import rateLimit from 'express-rate-limit';

// Global rate limiter for public endpoints
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    ok: false,
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // don't count successful requests
  message: {
    ok: false,
    error: 'Too many login attempts, please try again later',
    code: 'AUTH_RATE_LIMIT',
  },
});

// API rate limiter (tier-aware)
export function createApiLimiter() {
  const store = new Map(); // Simple in-memory store

  return (req, res, next) => {
    if (!req.auth) {
      return publicLimiter(req, res, next);
    }

    const accountId = req.auth.accountId;
    const tier = req.auth.tier || 'free';

    const hourAgo = Date.now() - 60 * 60 * 1000;

    // Get or create entry
    if (!store.has(accountId)) {
      store.set(accountId, []);
    }

    // Clean old entries
    const timestamps = store.get(accountId).filter(t => t > hourAgo);
    store.set(accountId, timestamps);

    // Determine limit based on tier
    const tierLimits = {
      free: 100,
      starter: 5000,
      pro: 50000,
      enterprise: null, // unlimited
    };

    const limit = tierLimits[tier] || 100;

    if (limit !== null && timestamps.length >= limit) {
      return res.status(429).json({
        ok: false,
        error: `Rate limit exceeded for ${tier} tier (${limit} requests/hour)`,
        code: 'API_RATE_LIMIT',
        tier,
        limit,
        remaining: 0,
      });
    }

    // Add current request
    timestamps.push(Date.now());
    store.set(accountId, timestamps);

    // Add headers
    const remaining = limit !== null ? limit - timestamps.length : null;
    if (remaining !== null) {
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Reset', new Date(hourAgo + 60 * 60 * 1000).toISOString());
    }

    next();
  };
}

export const apiLimiter = createApiLimiter();
