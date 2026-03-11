/**
 * D1 CRUD for OAuth 2.1 tables (oauth_clients, oauth_authorization_codes, oauth_tokens)
 */

import { hashToken } from '../auth/jwt'

// ─── Types ────────────────────────────────────────────────────────────

export interface OAuthClient {
  id: string
  client_secret_hash: string | null
  client_name: string | null
  redirect_uris: string // JSON array
  grant_types: string
  token_endpoint_auth_method: string
  scope: string | null
  created_at: string
}

export interface OAuthAuthorizationCode {
  id: string
  client_id: string
  user_id: string
  redirect_uri: string
  scope: string | null
  code_challenge: string
  code_challenge_method: string
  resource: string | null
  expires_at: string
  used_at: string | null
  created_at: string
}

export interface OAuthToken {
  id: string
  client_id: string
  user_id: string
  token_hash: string
  refresh_token_hash: string | null
  scope: string | null
  expires_at: string
  refresh_expires_at: string | null
  created_at: string
  last_used_at: string | null
}

// ─── Clients ──────────────────────────────────────────────────────────

export async function createOAuthClient(
  db: D1Database,
  client: {
    id: string
    clientSecretHash: string | null
    clientName: string | null
    redirectUris: string[]
    grantTypes?: string[]
    tokenEndpointAuthMethod?: string
    scope?: string | null
  },
): Promise<OAuthClient> {
  const row: OAuthClient = {
    id: client.id,
    client_secret_hash: client.clientSecretHash,
    client_name: client.clientName,
    redirect_uris: JSON.stringify(client.redirectUris),
    grant_types: JSON.stringify(client.grantTypes ?? ['authorization_code']),
    token_endpoint_auth_method: client.tokenEndpointAuthMethod ?? 'client_secret_post',
    scope: client.scope ?? null,
    created_at: new Date().toISOString(),
  }

  await db.prepare(
    `INSERT INTO oauth_clients (id, client_secret_hash, client_name, redirect_uris, grant_types, token_endpoint_auth_method, scope, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    row.id, row.client_secret_hash, row.client_name,
    row.redirect_uris, row.grant_types, row.token_endpoint_auth_method,
    row.scope, row.created_at,
  ).run()

  return row
}

export async function getOAuthClient(db: D1Database, clientId: string): Promise<OAuthClient | null> {
  return db.prepare('SELECT * FROM oauth_clients WHERE id = ?').bind(clientId).first<OAuthClient>()
}

// ─── Authorization Codes ──────────────────────────────────────────────

export async function createAuthorizationCode(
  db: D1Database,
  code: {
    id: string
    clientId: string
    userId: string
    redirectUri: string
    scope: string | null
    codeChallenge: string
    codeChallengeMethod: string
    resource: string | null
  },
): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min TTL

  await db.prepare(
    `INSERT INTO oauth_authorization_codes (id, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method, resource, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    code.id, code.clientId, code.userId, code.redirectUri,
    code.scope, code.codeChallenge, code.codeChallengeMethod,
    code.resource, expiresAt,
  ).run()
}

export async function getAndConsumeAuthorizationCode(
  db: D1Database,
  codeId: string,
): Promise<OAuthAuthorizationCode | null> {
  const code = await db.prepare(
    `SELECT * FROM oauth_authorization_codes WHERE id = ? AND used_at IS NULL AND expires_at > datetime('now')`
  ).bind(codeId).first<OAuthAuthorizationCode>()

  if (!code) return null

  // Mark as used (single-use)
  await db.prepare(
    `UPDATE oauth_authorization_codes SET used_at = datetime('now') WHERE id = ?`
  ).bind(codeId).run()

  return code
}

// ─── Tokens ───────────────────────────────────────────────────────────

export async function createOAuthTokens(
  db: D1Database,
  token: {
    id: string
    clientId: string
    userId: string
    accessToken: string
    refreshToken: string
    scope: string | null
  },
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const accessTokenHash = await hashToken(token.accessToken)
  const refreshTokenHash = await hashToken(token.refreshToken)
  const expiresIn = 3600 // 1 hour
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

  await db.prepare(
    `INSERT INTO oauth_tokens (id, client_id, user_id, token_hash, refresh_token_hash, scope, expires_at, refresh_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    token.id, token.clientId, token.userId,
    accessTokenHash, refreshTokenHash,
    token.scope, expiresAt, refreshExpiresAt,
  ).run()

  return { accessToken: token.accessToken, refreshToken: token.refreshToken, expiresIn }
}

export async function findOAuthTokenByHash(
  db: D1Database,
  tokenHash: string,
): Promise<(OAuthToken & { user_name: string; user_email: string | null; user_system_role: string }) | null> {
  const row = await db.prepare(
    `SELECT t.*, u.name as user_name, u.email as user_email, u.system_role as user_system_role
     FROM oauth_tokens t
     JOIN users u ON t.user_id = u.id
     WHERE t.token_hash = ? AND t.expires_at > datetime('now') AND u.is_active = 1`
  ).bind(tokenHash).first<OAuthToken & { user_name: string; user_email: string | null; user_system_role: string }>()

  if (row) {
    // Update last_used_at
    await db.prepare(
      `UPDATE oauth_tokens SET last_used_at = datetime('now') WHERE id = ?`
    ).bind(row.id).run()
  }

  return row
}

export async function findOAuthTokenByRefreshHash(
  db: D1Database,
  refreshTokenHash: string,
): Promise<OAuthToken | null> {
  return db.prepare(
    `SELECT * FROM oauth_tokens WHERE refresh_token_hash = ? AND refresh_expires_at > datetime('now')`
  ).bind(refreshTokenHash).first<OAuthToken>()
}

export async function revokeOAuthToken(db: D1Database, tokenId: string): Promise<void> {
  await db.prepare('DELETE FROM oauth_tokens WHERE id = ?').bind(tokenId).run()
}

// ─── Cleanup ──────────────────────────────────────────────────────────

export async function cleanupExpiredOAuth(db: D1Database): Promise<{ codes: number; tokens: number }> {
  const codesResult = await db.prepare(
    `DELETE FROM oauth_authorization_codes WHERE expires_at < datetime('now')`
  ).run()

  const tokensResult = await db.prepare(
    `DELETE FROM oauth_tokens WHERE expires_at < datetime('now') AND (refresh_expires_at IS NULL OR refresh_expires_at < datetime('now'))`
  ).run()

  return {
    codes: codesResult.meta.changes ?? 0,
    tokens: tokensResult.meta.changes ?? 0,
  }
}
