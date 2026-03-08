// Auth middleware for Hono on Cloudflare Workers
import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import type { Env, Variables } from '../types'
import { verifyAccessToken, hashToken } from './jwt'
import { findUserByKeyHash } from '../db/queries'

// Cookie name
const ACCESS_TOKEN_COOKIE = 'brain_access'

export const authMiddleware = createMiddleware<{
  Bindings: Env
  Variables: Variables
}>(async (c, next) => {
  // 1. Try cookie JWT auth (no scope restrictions — full access)
  const cookie = getCookie(c, ACCESS_TOKEN_COOKIE)
  if (cookie) {
    const payload = await verifyAccessToken(cookie, c.env.JWT_SECRET, c.env.JWT_ISSUER)
    if (payload) {
      c.set('user', {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        avatar: payload.avatar,
        system_role: payload.system_role || 'user',
      })
      return next()
    }
  }

  // 2. Fall back to X-API-Key header
  const apiKey = c.req.header('X-API-Key')
  if (apiKey) {
    // Hashed key lookup only — no plaintext fallback
    const keyHash = await hashToken(apiKey)
    const user = await findUserByKeyHash(c.env.DB, keyHash)

    if (user) {
      // Check for expired key (returned with expired marker from findUserByKeyHash)
      if ('expired' in user && user.expired) {
        return c.json({ error: 'API key has expired', code: 'TOKEN_EXPIRED' }, 401)
      }

      const keyScope = user.key_scope as 'read' | 'write' | 'admin' | undefined
      c.set('user', {
        id: user.id,
        name: user.name,
        email: user.email ?? undefined,
        avatar: user.avatar_url ?? undefined,
        system_role: (user.system_role as 'user' | 'admin' | 'super_admin') || 'user',
        key_scope: keyScope ?? 'write',
      })
      return next()
    }
  }

  // 3. Neither auth method succeeded
  return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
})

// Scope enforcement middleware — use after authMiddleware
// read: GET/HEAD only
// write: GET/HEAD/POST/PATCH/DELETE on data routes, but NOT /auth/api-keys management
// admin: everything
export const scopeMiddleware = createMiddleware<{
  Bindings: Env
  Variables: Variables
}>(async (c, next) => {
  const user = c.get('user')

  // Cookie-based auth has no scope restriction
  if (!user.key_scope) return next()

  const method = c.req.method.toUpperCase()
  const scope = user.key_scope

  if (scope === 'admin') return next()

  if (scope === 'read') {
    if (method !== 'GET' && method !== 'HEAD') {
      return c.json({ error: 'API key scope "read" only allows GET requests', code: 'FORBIDDEN' }, 403)
    }
    return next()
  }

  // scope === 'write'
  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST' && method !== 'PATCH' && method !== 'DELETE') {
    return c.json({ error: 'Method not allowed for this API key scope', code: 'FORBIDDEN' }, 403)
  }
  return next()
})
