// Auth middleware for Hono on Cloudflare Workers
import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import type { Env, Variables } from '../types'
import { verifyAccessToken, hashToken } from './jwt'
import { findUserByKeyHash, findUserByApiKey } from '../db/queries'

// Cookie name
const ACCESS_TOKEN_COOKIE = 'brain_access'

export const authMiddleware = createMiddleware<{
  Bindings: Env
  Variables: Variables
}>(async (c, next) => {
  // 1. Try cookie JWT auth
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
    // Try hashed key lookup first (new multi-key system)
    const keyHash = await hashToken(apiKey)
    let user = await findUserByKeyHash(c.env.DB, keyHash)

    // Fallback to legacy plaintext match
    if (!user) {
      user = await findUserByApiKey(c.env.DB, apiKey)
    }

    if (user) {
      c.set('user', {
        id: user.id,
        name: user.name,
        email: user.email ?? undefined,
        avatar: user.avatar_url ?? undefined,
        system_role: (user.system_role as 'user' | 'admin' | 'super_admin') || 'user',
      })
      return next()
    }
  }

  // 3. Neither auth method succeeded
  return c.json({ error: 'Unauthorized' }, 401)
})
