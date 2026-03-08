import type { Context, Next } from 'hono'
import type { Env, Variables } from '../types'

interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
  /** Key function — returns the rate limit key (e.g., user ID, IP) */
  keyFn: (c: Context<{ Bindings: Env; Variables: Variables }>) => string
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 100,
  windowSeconds: 60,
  keyFn: (c) => {
    const user = c.get('user')
    return user?.id ?? c.req.header('cf-connecting-ip') ?? 'anonymous'
  },
}

/**
 * Rate limiting middleware using D1 sliding window.
 *
 * Uses a simple fixed-window approach stored in D1.
 * Each window is a time bucket (e.g., "2024-01-15T10:05" for 5-min window).
 */
export function rateLimiter(config: Partial<RateLimitConfig> = {}) {
  const { limit, windowSeconds, keyFn } = { ...DEFAULT_CONFIG, ...config }

  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const key = keyFn(c)
    const windowStart = Math.floor(Date.now() / (windowSeconds * 1000))
    const window = `${windowStart}`
    const fullKey = `${key}:${c.req.path}`

    try {
      // Increment counter
      await c.env.DB.prepare(
        `INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1)
         ON CONFLICT(key, window) DO UPDATE SET count = count + 1`,
      )
        .bind(fullKey, window)
        .run()

      // Check count
      const row = await c.env.DB.prepare(
        'SELECT count FROM rate_limits WHERE key = ? AND window = ?',
      )
        .bind(fullKey, window)
        .first<{ count: number }>()

      const current = row?.count ?? 0
      const remaining = Math.max(0, limit - current)

      // Set rate limit headers
      c.header('X-RateLimit-Limit', String(limit))
      c.header('X-RateLimit-Remaining', String(remaining))
      c.header('X-RateLimit-Reset', String((windowStart + 1) * windowSeconds))

      if (current > limit) {
        c.header('Retry-After', String(windowSeconds))
        return c.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, 429)
      }
    } catch (e) {
      // If rate limiting fails, let the request through (fail open)
      console.error('[rate-limiter] error:', e)
    }

    await next()
  }
}

/** Stricter rate limit for AI/expensive endpoints */
export const aiRateLimiter = rateLimiter({ limit: 20, windowSeconds: 60 })

/** Standard API rate limit */
export const apiRateLimiter = rateLimiter({ limit: 100, windowSeconds: 60 })

/** Auth endpoint rate limit (prevent brute force) */
export const authRateLimiter = rateLimiter({
  limit: 10,
  windowSeconds: 300,
  keyFn: (c) => c.req.header('cf-connecting-ip') ?? 'anonymous',
})
