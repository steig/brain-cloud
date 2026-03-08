// Auth routes for Hono on Cloudflare Workers
import { Hono, type Context } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import type { Env, Variables } from '../types'
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  getTokenExpiries,
} from './jwt'
import {
  getGitHubAuthUrl,
  exchangeGitHubCode,
  getGitHubUser,
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUser,
} from './oauth'
import { createApiKey, listApiKeys, revokeApiKey } from '../db/queries'

type AuthApp = Hono<{ Bindings: Env; Variables: Variables }>

const auth: AuthApp = new Hono()

// Cookie names
const ACCESS_TOKEN_COOKIE = 'brain_access'
const REFRESH_TOKEN_COOKIE = 'brain_refresh'
const STATE_COOKIE = 'oauth_state'

// Derive callback URL from request URL origin, validated against allowlist
function getCallbackUrl(c: AuthContext, provider: 'github' | 'google'): string {
  const frontendUrl = c.env.FRONTEND_URL || 'https://brain-ai.dev'
  const allowed = new Set([frontendUrl, 'https://dash.brain-ai.dev'])
  const origin = new URL(c.req.url).origin
  const safeOrigin = allowed.has(origin) ? origin : frontendUrl
  return `${safeOrigin}/auth/${provider}/callback`
}

// Derive cookie domain from FRONTEND_URL
function getCookieDomain(_frontendUrl: string): string | undefined {
  // Don't set Domain attribute — let the browser default to exact origin match.
  // Setting Domain explicitly can cause issues with apex domains on .dev TLD.
  return undefined
}

function isSecure(frontendUrl: string): boolean {
  return frontendUrl.startsWith('https')
}

type AuthContext = Context<{ Bindings: Env; Variables: Variables }>

// Helper: set auth cookies
function setAuthCookies(c: AuthContext, accessToken: string, refreshToken: string) {
  const { accessExpiry, refreshExpiry } = getTokenExpiries()
  const domain = getCookieDomain(c.env.FRONTEND_URL)
  const secure = isSecure(c.env.FRONTEND_URL)

  setCookie(c, ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    domain,
    expires: accessExpiry,
    path: '/',
  })

  setCookie(c, REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    domain,
    expires: refreshExpiry,
    path: '/auth',
  })
}

// Helper: clear auth cookies
function clearAuthCookies(c: AuthContext) {
  const domain = getCookieDomain(c.env.FRONTEND_URL)
  const secure = isSecure(c.env.FRONTEND_URL)
  const opts = { httpOnly: true, secure, sameSite: 'Lax' as const, domain }

  deleteCookie(c, ACCESS_TOKEN_COOKIE, { ...opts, path: '/' })
  deleteCookie(c, REFRESH_TOKEN_COOKIE, { ...opts, path: '/auth' })
}

// Generate random state
function generateState(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Helper: handle OAuth callback (shared between GitHub and Google)
async function handleOAuthCallback(
  c: AuthContext,
  provider: 'github' | 'google',
  providerUserId: string,
  providerUsername: string,
  email: string | null,
  name: string,
  avatarUrl: string | null,
  oauthAccessToken: string,
  oauthRefreshToken?: string,
  tokenExpiresAt?: Date,
) {
  const db: D1Database = c.env.DB

  // Find existing user by OAuth
  let user = await db.prepare(
    'SELECT u.* FROM users u JOIN oauth_accounts oa ON u.id = oa.user_id WHERE oa.provider = ? AND oa.provider_user_id = ?'
  ).bind(provider, providerUserId).first<{
    id: string; name: string; email: string | null; avatar_url: string | null; system_role: string
  }>()

  if (user) {
    // Update OAuth tokens
    await db.prepare(
      'UPDATE oauth_accounts SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = datetime(\'now\') WHERE user_id = ? AND provider = ?'
    ).bind(oauthAccessToken, oauthRefreshToken ?? null, tokenExpiresAt?.toISOString() ?? null, user.id, provider).run()

    // Update last login
    await db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').bind(user.id).run()
  } else {
    // Create new user
    const id = crypto.randomUUID()
    await db.prepare(
      'INSERT INTO users (id, name, email, avatar_url, system_role, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, datetime(\'now\'))'
    ).bind(id, name, email, avatarUrl, 'user').run()

    // Create OAuth account link
    await db.prepare(
      'INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_username, access_token, refresh_token, token_expires_at, profile_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
    ).bind(
      crypto.randomUUID(), id, provider, providerUserId, providerUsername,
      oauthAccessToken, oauthRefreshToken ?? null, tokenExpiresAt?.toISOString() ?? null,
      JSON.stringify({ name, avatar: avatarUrl }),
    ).run()

    user = { id, name, email, avatar_url: avatarUrl, system_role: 'user' }
  }

  // Generate session tokens
  const accessToken = await generateAccessToken(
    {
      sub: user.id,
      name: user.name,
      email: user.email ?? undefined,
      avatar: user.avatar_url ?? undefined,
      system_role: (user.system_role as 'user' | 'admin' | 'super_admin') || 'user',
    },
    c.env.JWT_SECRET,
    c.env.JWT_ISSUER,
  )
  const refreshToken = generateRefreshToken()

  // Store session
  const { accessExpiry, refreshExpiry } = getTokenExpiries()
  const sessionId = crypto.randomUUID()
  const accessHash = await hashToken(accessToken)
  const refreshHash = await hashToken(refreshToken)

  await db.prepare(
    'INSERT INTO auth_sessions (id, user_id, token_hash, refresh_token_hash, expires_at, refresh_expires_at, user_agent, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
  ).bind(
    sessionId, user.id, accessHash, refreshHash,
    accessExpiry.toISOString(), refreshExpiry.toISOString(),
    c.req.header('User-Agent') ?? null, c.req.header('CF-Connecting-IP') ?? null,
  ).run()

  // Set cookies and redirect back to the origin that initiated login
  setAuthCookies(c, accessToken, refreshToken)
  const frontendUrl = c.env.FRONTEND_URL || 'https://brain-ai.dev'
  const allowed = new Set([frontendUrl, 'https://dash.brain-ai.dev'])
  const origin = new URL(c.req.url).origin
  return c.redirect(allowed.has(origin) ? origin : frontendUrl)
}

// ─── GitHub OAuth ─────────────────────────────────────────────────────

auth.get('/github', (c) => {
  if (!c.env.GITHUB_CLIENT_ID) {
    return c.json({ error: 'GitHub OAuth not configured' }, 503)
  }

  const state = generateState()
  const domain = getCookieDomain(c.env.FRONTEND_URL)
  const secure = isSecure(c.env.FRONTEND_URL)

  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const callbackUrl = getCallbackUrl(c, 'github')
  return c.redirect(getGitHubAuthUrl(c.env.GITHUB_CLIENT_ID, callbackUrl, state))
})

auth.get('/github/callback', async (c) => {
  try {
    const code = c.req.query('code')
    const state = c.req.query('state')

    // Handle multiple oauth_state cookies (from different path/domain settings during deploys)
    // getCookie returns the first match, but we need to check all of them
    const cookieHeader = c.req.header('cookie') ?? ''
    const allStates = cookieHeader.split(';')
      .map(s => s.trim())
      .filter(s => s.startsWith('oauth_state='))
      .map(s => s.split('=')[1])
    const savedState = allStates.includes(state ?? '') ? state : getCookie(c, STATE_COOKIE)

    // Clean up all oauth_state cookies
    deleteCookie(c, STATE_COOKIE, { path: '/' })
    deleteCookie(c, STATE_COOKIE, { path: '/auth' })

    if (!state || !savedState || state !== savedState) {
      return c.redirect(`${c.env.FRONTEND_URL}/login?error=invalid_state`)
    }

    if (!code) {
      return c.redirect(`${c.env.FRONTEND_URL}/login?error=no_code`)
    }

    const { accessToken: githubToken } = await exchangeGitHubCode(
      code, c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET, getCallbackUrl(c, 'github'),
    )
    const githubUser = await getGitHubUser(githubToken)

    return handleOAuthCallback(
      c, 'github', String(githubUser.id), githubUser.login,
      githubUser.email, githubUser.name || githubUser.login, githubUser.avatar_url,
      githubToken,
    )
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return c.redirect(`${c.env.FRONTEND_URL}/login?error=oauth_failed`)
  }
})

// ─── Google OAuth ─────────────────────────────────────────────────────

auth.get('/google', (c) => {
  if (!c.env.GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Google OAuth not configured' }, 503)
  }

  const state = generateState()
  const domain = getCookieDomain(c.env.FRONTEND_URL)
  const secure = isSecure(c.env.FRONTEND_URL)

  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    maxAge: 600,
    path: '/',
  })

  const callbackUrl = getCallbackUrl(c, 'google')
  return c.redirect(getGoogleAuthUrl(c.env.GOOGLE_CLIENT_ID, callbackUrl, state))
})

auth.get('/google/callback', async (c) => {
  try {
    const code = c.req.query('code')
    const state = c.req.query('state')

    const cookieHeader = c.req.header('cookie') ?? ''
    const allStates = cookieHeader.split(';')
      .map(s => s.trim())
      .filter(s => s.startsWith('oauth_state='))
      .map(s => s.split('=')[1])
    const savedState = allStates.includes(state ?? '') ? state : getCookie(c, STATE_COOKIE)

    deleteCookie(c, STATE_COOKIE, { path: '/' })
    deleteCookie(c, STATE_COOKIE, { path: '/auth' })

    if (!state || !savedState || state !== savedState) {
      return c.redirect(`${c.env.FRONTEND_URL}/login?error=invalid_state`)
    }

    if (!code) {
      return c.redirect(`${c.env.FRONTEND_URL}/login?error=no_code`)
    }

    const { accessToken: googleToken, refreshToken: googleRefresh, expiresIn } =
      await exchangeGoogleCode(code, c.env.GOOGLE_CLIENT_ID!, c.env.GOOGLE_CLIENT_SECRET!, getCallbackUrl(c, 'google'))
    const googleUser = await getGoogleUser(googleToken)

    return handleOAuthCallback(
      c, 'google', googleUser.sub, googleUser.email,
      googleUser.email, googleUser.name, googleUser.picture,
      googleToken, googleRefresh, new Date(Date.now() + expiresIn * 1000),
    )
  } catch (error) {
    console.error('Google OAuth error:', error)
    return c.redirect(`${c.env.FRONTEND_URL}/login?error=oauth_failed`)
  }
})

// ─── Session Management ──────────────────────────────────────────────

// POST /refresh
auth.post('/refresh', async (c) => {
  try {
    const refreshTokenValue = getCookie(c, REFRESH_TOKEN_COOKIE)

    if (!refreshTokenValue) {
      return c.json({ error: 'No refresh token' }, 401)
    }

    const refreshHash = await hashToken(refreshTokenValue)
    const session = await c.env.DB.prepare(
      'SELECT id, user_id FROM auth_sessions WHERE refresh_token_hash = ? AND refresh_expires_at > datetime(\'now\')'
    ).bind(refreshHash).first<{ id: string; user_id: string }>()

    if (!session) {
      clearAuthCookies(c)
      return c.json({ error: 'Invalid or expired refresh token' }, 401)
    }

    const user = await c.env.DB.prepare(
      'SELECT id, name, email, avatar_url, system_role FROM users WHERE id = ? AND is_active = 1'
    ).bind(session.user_id).first<{
      id: string; name: string; email: string | null; avatar_url: string | null; system_role: string
    }>()

    if (!user) {
      clearAuthCookies(c)
      return c.json({ error: 'User not found' }, 401)
    }

    const newAccessToken = await generateAccessToken(
      {
        sub: user.id,
        name: user.name,
        email: user.email ?? undefined,
        avatar: user.avatar_url ?? undefined,
        system_role: (user.system_role as 'user' | 'admin' | 'super_admin') || 'user',
      },
      c.env.JWT_SECRET,
      c.env.JWT_ISSUER,
    )
    const newRefreshToken = generateRefreshToken()

    const { accessExpiry, refreshExpiry } = getTokenExpiries()
    const newAccessHash = await hashToken(newAccessToken)
    const newRefreshHash = await hashToken(newRefreshToken)

    await c.env.DB.prepare(
      'UPDATE auth_sessions SET token_hash = ?, refresh_token_hash = ?, expires_at = ?, refresh_expires_at = ? WHERE id = ?'
    ).bind(newAccessHash, newRefreshHash, accessExpiry.toISOString(), refreshExpiry.toISOString(), session.id).run()

    setAuthCookies(c, newAccessToken, newRefreshToken)
    return c.json({ success: true })
  } catch (error) {
    console.error('Token refresh error:', error)
    return c.json({ error: 'Failed to refresh token' }, 500)
  }
})

// POST /logout
auth.post('/logout', async (c) => {
  try {
    const refreshTokenValue = getCookie(c, REFRESH_TOKEN_COOKIE)

    if (refreshTokenValue) {
      const refreshHash = await hashToken(refreshTokenValue)
      const session = await c.env.DB.prepare(
        'SELECT id FROM auth_sessions WHERE refresh_token_hash = ?'
      ).bind(refreshHash).first<{ id: string }>()

      if (session) {
        await c.env.DB.prepare('DELETE FROM auth_sessions WHERE id = ?').bind(session.id).run()
      }
    }

    clearAuthCookies(c)
    return c.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    clearAuthCookies(c)
    return c.json({ success: true })
  }
})

// GET /me
auth.get('/me', async (c) => {
  try {
    const accessToken = getCookie(c, ACCESS_TOKEN_COOKIE)

    if (!accessToken) {
      return c.json({ error: 'Not authenticated' }, 401)
    }

    const payload = await verifyAccessToken(accessToken, c.env.JWT_SECRET, c.env.JWT_ISSUER)
    if (!payload) {
      return c.json({ error: 'Invalid token' }, 401)
    }

    const user = await c.env.DB.prepare(
      'SELECT id, name, email, avatar_url, system_role, is_active, api_key IS NOT NULL as has_api_key FROM users WHERE id = ? AND is_active = 1'
    ).bind(payload.sub).first()

    if (!user) {
      return c.json({ error: 'User not found' }, 401)
    }

    // Fetch teams
    const { results: teams } = await c.env.DB.prepare(
      'SELECT t.id, t.name, t.slug, tm.role FROM teams t JOIN team_members tm ON t.id = tm.team_id WHERE tm.user_id = ?'
    ).bind(payload.sub).all<{ id: string; name: string; slug: string; role: string }>()

    return c.json({ ...user, teams: teams || [] })
  } catch (error) {
    console.error('Get user error:', error)
    return c.json({ error: 'Failed to get user' }, 500)
  }
})

// ─── API Key Management ──────────────────────────────────────────────

// POST /api-key
auth.post('/api-key', async (c) => {
  try {
    const accessToken = getCookie(c, ACCESS_TOKEN_COOKIE)
    if (!accessToken) return c.json({ error: 'Not authenticated' }, 401)

    const payload = await verifyAccessToken(accessToken, c.env.JWT_SECRET, c.env.JWT_ISSUER)
    if (!payload) return c.json({ error: 'Invalid token' }, 401)

    // Generate a new API key
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const apiKey = 'brain_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

    await c.env.DB.prepare(
      'UPDATE users SET api_key = ? WHERE id = ?'
    ).bind(apiKey, payload.sub).run()

    return c.json({ api_key: apiKey })
  } catch (error) {
    console.error('Generate API key error:', error)
    return c.json({ error: 'Failed to generate API key' }, 500)
  }
})

// DELETE /api-key
auth.delete('/api-key', async (c) => {
  try {
    const accessToken = getCookie(c, ACCESS_TOKEN_COOKIE)
    if (!accessToken) return c.json({ error: 'Not authenticated' }, 401)

    const payload = await verifyAccessToken(accessToken, c.env.JWT_SECRET, c.env.JWT_ISSUER)
    if (!payload) return c.json({ error: 'Invalid token' }, 401)

    await c.env.DB.prepare(
      'UPDATE users SET api_key = NULL WHERE id = ?'
    ).bind(payload.sub).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Revoke API key error:', error)
    return c.json({ error: 'Failed to revoke API key' }, 500)
  }
})

// ─── Multi-Key API Key Management ─────────────────────────────────

// POST /api-keys — create a named key
auth.post('/api-keys', async (c) => {
  try {
    const accessToken = getCookie(c, ACCESS_TOKEN_COOKIE)
    if (!accessToken) return c.json({ error: 'Not authenticated' }, 401)

    const payload = await verifyAccessToken(accessToken, c.env.JWT_SECRET, c.env.JWT_ISSUER)
    if (!payload) return c.json({ error: 'Invalid token' }, 401)

    const body = await c.req.json<{ name?: string; scope?: string; expires_at?: string }>()
    const name = body.name?.trim()
    if (!name) return c.json({ error: 'Name is required' }, 400)

    const scope = body.scope ?? 'write'
    if (!['read', 'write', 'admin'].includes(scope)) {
      return c.json({ error: 'Invalid scope. Must be: read, write, or admin' }, 400)
    }

    // Validate expires_at if provided
    let expiresAt: string | undefined
    if (body.expires_at) {
      const d = new Date(body.expires_at)
      if (isNaN(d.getTime())) return c.json({ error: 'Invalid expires_at date' }, 400)
      if (d <= new Date()) return c.json({ error: 'expires_at must be in the future' }, 400)
      expiresAt = d.toISOString()
    }

    // Generate key
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const rawKey = 'brain_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const keyHash = await hashToken(rawKey)
    const keyPrefix = rawKey.slice(0, 12) + '...'

    const apiKey = await createApiKey(c.env.DB, payload.sub, name, keyHash, keyPrefix, scope, expiresAt)
    return c.json({ ...apiKey, key: rawKey })
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'A key with that name already exists' }, 409)
    }
    console.error('Create API key error:', error)
    return c.json({ error: 'Failed to create API key' }, 500)
  }
})

// GET /api-keys — list keys for authenticated user
auth.get('/api-keys', async (c) => {
  try {
    const accessToken = getCookie(c, ACCESS_TOKEN_COOKIE)
    if (!accessToken) return c.json({ error: 'Not authenticated' }, 401)

    const payload = await verifyAccessToken(accessToken, c.env.JWT_SECRET, c.env.JWT_ISSUER)
    if (!payload) return c.json({ error: 'Invalid token' }, 401)

    const keys = await listApiKeys(c.env.DB, payload.sub)
    return c.json(keys)
  } catch (error) {
    console.error('List API keys error:', error)
    return c.json({ error: 'Failed to list API keys' }, 500)
  }
})

// DELETE /api-keys/:id — revoke a key
auth.delete('/api-keys/:id', async (c) => {
  try {
    const accessToken = getCookie(c, ACCESS_TOKEN_COOKIE)
    if (!accessToken) return c.json({ error: 'Not authenticated' }, 401)

    const payload = await verifyAccessToken(accessToken, c.env.JWT_SECRET, c.env.JWT_ISSUER)
    if (!payload) return c.json({ error: 'Invalid token' }, 401)

    await revokeApiKey(c.env.DB, payload.sub, c.req.param('id'))
    return c.json({ success: true })
  } catch (error) {
    console.error('Revoke API key error:', error)
    return c.json({ error: 'Failed to revoke API key' }, 500)
  }
})

// GET /providers
auth.get('/providers', (c) => {
  return c.json({
    providers: [
      ...(c.env.GITHUB_CLIENT_ID ? ['github'] : []),
      ...(c.env.GOOGLE_CLIENT_ID ? ['google'] : []),
    ],
  })
})

export { auth as authRoutes }
