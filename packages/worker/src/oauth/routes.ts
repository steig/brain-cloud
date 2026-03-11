/**
 * OAuth 2.1 Routes for MCP (RFC 7591 Dynamic Client Registration + PKCE)
 *
 * POST /oauth/register  — Dynamic Client Registration (RFC 7591)
 * GET  /oauth/authorize  — Authorization endpoint (show consent / redirect to login)
 * POST /oauth/authorize  — Process consent form
 * POST /oauth/token      — Token endpoint (code exchange + refresh)
 */

import { Hono, type Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { Env, Variables } from '../types'
import { hashToken, verifyAccessToken, generateRefreshToken } from '../auth/jwt'
import { verifyPkceS256 } from './pkce'
import { renderConsentPage } from './consent'
import {
  createOAuthClient,
  getOAuthClient,
  createAuthorizationCode,
  getAndConsumeAuthorizationCode,
  createOAuthTokens,
  findOAuthTokenByRefreshHash,
  revokeOAuthToken,
} from './queries'

type OAuthContext = Context<{ Bindings: Env; Variables: Variables }>

const oauth = new Hono<{ Bindings: Env; Variables: Variables }>()

const OAUTH_RETURN_COOKIE = 'brain_oauth_return'

// ─── Helpers ──────────────────────────────────────────────────────────

function generateRandomHex(bytes: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateAccessTokenValue(): string {
  return `bro_${generateRandomHex(32)}`
}

function generateRefreshTokenValue(): string {
  return `brr_${generateRandomHex(32)}`
}

// Get the authenticated user from session cookie (same as existing brain_access cookie)
async function getSessionUser(c: OAuthContext): Promise<{ id: string; name: string; email?: string } | null> {
  const accessToken = getCookie(c, 'brain_access')
  if (!accessToken) return null

  const payload = await verifyAccessToken(accessToken, c.env.JWT_SECRET, c.env.JWT_ISSUER)
  if (!payload) return null

  // Verify user is still active
  const user = await c.env.DB.prepare(
    'SELECT id, name, email FROM users WHERE id = ? AND is_active = 1'
  ).bind(payload.sub).first<{ id: string; name: string; email: string | null }>()

  return user ? { id: user.id, name: user.name, email: user.email ?? undefined } : null
}

// ─── POST /register — Dynamic Client Registration (RFC 7591) ─────────

oauth.post('/register', async (c) => {
  const body = await c.req.json<{
    client_name?: string
    redirect_uris?: string[]
    grant_types?: string[]
    token_endpoint_auth_method?: string
    scope?: string
  }>()

  // Validate redirect_uris
  if (!body.redirect_uris || !Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) {
    return c.json({ error: 'invalid_client_metadata', error_description: 'redirect_uris is required' }, 400)
  }

  for (const uri of body.redirect_uris) {
    try {
      const parsed = new URL(uri)
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        return c.json({ error: 'invalid_client_metadata', error_description: 'redirect_uris must use HTTPS' }, 400)
      }
    } catch {
      return c.json({ error: 'invalid_client_metadata', error_description: `Invalid redirect_uri: ${uri}` }, 400)
    }
  }

  // Validate grant_types
  const grantTypes = body.grant_types ?? ['authorization_code']
  const allowedGrants = ['authorization_code', 'refresh_token']
  for (const gt of grantTypes) {
    if (!allowedGrants.includes(gt)) {
      return c.json({ error: 'invalid_client_metadata', error_description: `Unsupported grant_type: ${gt}` }, 400)
    }
  }

  // Validate token_endpoint_auth_method
  const authMethod = body.token_endpoint_auth_method ?? 'client_secret_post'
  const allowedMethods = ['client_secret_post', 'client_secret_basic', 'none']
  if (!allowedMethods.includes(authMethod)) {
    return c.json({ error: 'invalid_client_metadata', error_description: `Unsupported auth method: ${authMethod}` }, 400)
  }

  const clientId = crypto.randomUUID()
  let clientSecret: string | null = null
  let clientSecretHash: string | null = null

  if (authMethod !== 'none') {
    clientSecret = `bcs_${generateRandomHex(32)}`
    clientSecretHash = await hashToken(clientSecret)
  }

  const client = await createOAuthClient(c.env.DB, {
    id: clientId,
    clientSecretHash,
    clientName: body.client_name ?? null,
    redirectUris: body.redirect_uris,
    grantTypes,
    tokenEndpointAuthMethod: authMethod,
    scope: body.scope ?? null,
  })

  const response: Record<string, unknown> = {
    client_id: clientId,
    client_name: client.client_name,
    redirect_uris: body.redirect_uris,
    grant_types: grantTypes,
    token_endpoint_auth_method: authMethod,
  }

  if (clientSecret) {
    response.client_secret = clientSecret
  }

  return c.json(response, 201)
})

// ─── GET /authorize — Authorization Endpoint ──────────────────────────

oauth.get('/authorize', async (c) => {
  const {
    response_type, client_id, redirect_uri, state,
    scope, code_challenge, code_challenge_method, resource,
  } = c.req.query()

  // Validate required params
  if (response_type !== 'code') {
    return c.json({ error: 'unsupported_response_type' }, 400)
  }
  if (!client_id) {
    return c.json({ error: 'invalid_request', error_description: 'client_id required' }, 400)
  }
  if (!code_challenge || code_challenge_method !== 'S256') {
    return c.json({ error: 'invalid_request', error_description: 'PKCE S256 code_challenge required' }, 400)
  }

  // Look up client
  const client = await getOAuthClient(c.env.DB, client_id)
  if (!client) {
    return c.json({ error: 'invalid_client', error_description: 'Unknown client_id' }, 400)
  }

  // Validate redirect_uri
  const registeredUris: string[] = JSON.parse(client.redirect_uris)
  if (!redirect_uri || !registeredUris.includes(redirect_uri)) {
    return c.json({ error: 'invalid_request', error_description: 'redirect_uri not registered' }, 400)
  }

  // Check session — if not logged in, redirect to login with return cookie
  const user = await getSessionUser(c)
  if (!user) {
    // Store full authorize URL so we can resume after login
    const returnUrl = c.req.url
    const secure = (c.env.FRONTEND_URL || '').startsWith('https')
    setCookie(c, OAUTH_RETURN_COOKIE, returnUrl, {
      httpOnly: true,
      secure,
      sameSite: 'Lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // Redirect to login — prefer GitHub, fall back to Google
    const origin = new URL(c.req.url).origin
    if (c.env.GITHUB_CLIENT_ID) {
      return c.redirect(`${origin}/auth/github`)
    } else if (c.env.GOOGLE_CLIENT_ID) {
      return c.redirect(`${origin}/auth/google`)
    }
    return c.json({ error: 'server_error', error_description: 'No login providers configured' }, 500)
  }

  // User is authenticated — show consent page
  const formAction = `${new URL(c.req.url).origin}/oauth/authorize`
  const csrfFields = [
    `<input type="hidden" name="client_id" value="${escapeAttr(client_id)}">`,
    `<input type="hidden" name="redirect_uri" value="${escapeAttr(redirect_uri)}">`,
    `<input type="hidden" name="state" value="${escapeAttr(state || '')}">`,
    `<input type="hidden" name="scope" value="${escapeAttr(scope || '')}">`,
    `<input type="hidden" name="code_challenge" value="${escapeAttr(code_challenge)}">`,
    `<input type="hidden" name="code_challenge_method" value="S256">`,
    resource ? `<input type="hidden" name="resource" value="${escapeAttr(resource)}">` : '',
  ].join('\n')

  const html = renderConsentPage({
    clientName: client.client_name,
    scope: scope || null,
    formAction,
    csrfFields,
  })

  return c.html(html)
})

// ─── POST /authorize — Process Consent ────────────────────────────────

oauth.post('/authorize', async (c) => {
  const body = await c.req.parseBody()
  const consent = body.consent as string
  const clientId = body.client_id as string
  const redirectUri = body.redirect_uri as string
  const state = body.state as string | undefined
  const scope = body.scope as string | undefined
  const codeChallenge = body.code_challenge as string
  const codeChallengeMethod = (body.code_challenge_method as string) || 'S256'
  const resource = body.resource as string | undefined

  // Verify session
  const user = await getSessionUser(c)
  if (!user) {
    return c.json({ error: 'access_denied', error_description: 'Not authenticated' }, 401)
  }

  // Denied
  if (consent !== 'approve') {
    const url = new URL(redirectUri)
    url.searchParams.set('error', 'access_denied')
    if (state) url.searchParams.set('state', state)
    return c.redirect(url.toString())
  }

  // Validate client + redirect_uri
  const client = await getOAuthClient(c.env.DB, clientId)
  if (!client) {
    return c.json({ error: 'invalid_client' }, 400)
  }
  const registeredUris: string[] = JSON.parse(client.redirect_uris)
  if (!registeredUris.includes(redirectUri)) {
    return c.json({ error: 'invalid_request', error_description: 'redirect_uri not registered' }, 400)
  }

  // Generate authorization code
  const code = generateRandomHex(32)
  await createAuthorizationCode(c.env.DB, {
    id: code,
    clientId,
    userId: user.id,
    redirectUri,
    scope: scope || null,
    codeChallenge,
    codeChallengeMethod,
    resource: resource || null,
  })

  // Redirect with code
  const url = new URL(redirectUri)
  url.searchParams.set('code', code)
  if (state) url.searchParams.set('state', state)
  return c.redirect(url.toString())
})

// ─── POST /token — Token Endpoint ─────────────────────────────────────

oauth.post('/token', async (c) => {
  // Parse body (application/x-www-form-urlencoded or JSON)
  let params: Record<string, string>
  const contentType = c.req.header('content-type') || ''
  if (contentType.includes('application/json')) {
    params = await c.req.json()
  } else {
    const formData = await c.req.parseBody()
    params = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, String(v)])
    )
  }

  const grantType = params.grant_type

  // Authenticate client (from body or Basic auth)
  let clientId = params.client_id
  let clientSecret = params.client_secret

  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Basic ')) {
    const decoded = atob(authHeader.slice(6))
    const colonIdx = decoded.indexOf(':')
    if (colonIdx > 0) {
      clientId = decodeURIComponent(decoded.slice(0, colonIdx))
      clientSecret = decodeURIComponent(decoded.slice(colonIdx + 1))
    }
  }

  if (!clientId) {
    return c.json({ error: 'invalid_client', error_description: 'client_id required' }, 401)
  }

  const client = await getOAuthClient(c.env.DB, clientId)
  if (!client) {
    return c.json({ error: 'invalid_client' }, 401)
  }

  // Verify client secret if required
  if (client.client_secret_hash && client.token_endpoint_auth_method !== 'none') {
    if (!clientSecret) {
      return c.json({ error: 'invalid_client', error_description: 'client_secret required' }, 401)
    }
    const secretHash = await hashToken(clientSecret)
    if (secretHash !== client.client_secret_hash) {
      return c.json({ error: 'invalid_client', error_description: 'Invalid client_secret' }, 401)
    }
  }

  if (grantType === 'authorization_code') {
    return handleAuthorizationCodeGrant(c, params, client)
  } else if (grantType === 'refresh_token') {
    return handleRefreshTokenGrant(c, params, client)
  } else {
    return c.json({ error: 'unsupported_grant_type' }, 400)
  }
})

// ─── Grant Handlers ───────────────────────────────────────────────────

async function handleAuthorizationCodeGrant(
  c: OAuthContext,
  params: Record<string, string>,
  client: { id: string },
) {
  const { code, redirect_uri, code_verifier } = params

  if (!code || !code_verifier) {
    return c.json({ error: 'invalid_request', error_description: 'code and code_verifier required' }, 400)
  }

  // Look up and consume code
  const authCode = await getAndConsumeAuthorizationCode(c.env.DB, code)
  if (!authCode) {
    return c.json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' }, 400)
  }

  // Verify client matches
  if (authCode.client_id !== client.id) {
    return c.json({ error: 'invalid_grant', error_description: 'Code was issued to a different client' }, 400)
  }

  // Verify redirect_uri matches
  if (redirect_uri && redirect_uri !== authCode.redirect_uri) {
    return c.json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' }, 400)
  }

  // PKCE verify
  const pkceValid = await verifyPkceS256(code_verifier, authCode.code_challenge)
  if (!pkceValid) {
    return c.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, 400)
  }

  // Generate tokens
  const accessToken = generateAccessTokenValue()
  const refreshToken = generateRefreshTokenValue()

  const result = await createOAuthTokens(c.env.DB, {
    id: crypto.randomUUID(),
    clientId: client.id,
    userId: authCode.user_id,
    accessToken,
    refreshToken,
    scope: authCode.scope,
  })

  return c.json({
    access_token: result.accessToken,
    token_type: 'Bearer',
    expires_in: result.expiresIn,
    refresh_token: result.refreshToken,
    scope: authCode.scope || 'mcp:read mcp:write',
  })
}

async function handleRefreshTokenGrant(
  c: OAuthContext,
  params: Record<string, string>,
  client: { id: string },
) {
  const { refresh_token } = params

  if (!refresh_token) {
    return c.json({ error: 'invalid_request', error_description: 'refresh_token required' }, 400)
  }

  const refreshHash = await hashToken(refresh_token)
  const existingToken = await findOAuthTokenByRefreshHash(c.env.DB, refreshHash)
  if (!existingToken) {
    return c.json({ error: 'invalid_grant', error_description: 'Invalid or expired refresh token' }, 400)
  }

  // Verify client matches
  if (existingToken.client_id !== client.id) {
    return c.json({ error: 'invalid_grant', error_description: 'Token was issued to a different client' }, 400)
  }

  // Revoke old token (rotation)
  await revokeOAuthToken(c.env.DB, existingToken.id)

  // Issue new pair
  const accessToken = generateAccessTokenValue()
  const refreshToken2 = generateRefreshTokenValue()

  const result = await createOAuthTokens(c.env.DB, {
    id: crypto.randomUUID(),
    clientId: client.id,
    userId: existingToken.user_id,
    accessToken,
    refreshToken: refreshToken2,
    scope: existingToken.scope,
  })

  return c.json({
    access_token: result.accessToken,
    token_type: 'Bearer',
    expires_in: result.expiresIn,
    refresh_token: result.refreshToken,
    scope: existingToken.scope || 'mcp:read mcp:write',
  })
}

// ─── Utility ──────────────────────────────────────────────────────────

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export { oauth as oauthRoutes, OAUTH_RETURN_COOKIE }
