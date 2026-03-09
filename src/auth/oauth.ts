// OAuth providers (GitHub + Google) for Cloudflare Workers

// ─── GitHub ───────────────────────────────────────────────────────────

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_API_URL = 'https://api.github.com'

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

export function getGitHubAuthUrl(
  clientId: string,
  callbackUrl: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'read:user user:email repo',
    state,
    allow_signup: 'true',
  })
  return `${GITHUB_AUTH_URL}?${params}`
}

export async function exchangeGitHubCode(
  code: string,
  clientId: string,
  clientSecret: string,
  callbackUrl: string,
): Promise<{ accessToken: string; tokenType: string; scope: string }> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.status}`)
  }

  const data = await response.json() as {
    access_token?: string
    token_type?: string
    scope?: string
    error?: string
    error_description?: string
  }

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
  }

  if (!data.access_token) {
    throw new Error('No access token in GitHub response')
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || 'bearer',
    scope: data.scope || '',
  }
}

export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'brain-cloud',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user: ${response.status}`)
  }

  const user = await response.json() as GitHubUser

  if (!user.email) {
    const emailsResponse = await fetch(`${GITHUB_API_URL}/user/emails`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'brain-cloud',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (emailsResponse.ok) {
      const emails = await emailsResponse.json() as Array<{
        email: string
        primary: boolean
        verified: boolean
      }>
      const primaryEmail = emails.find(e => e.primary && e.verified)
      if (primaryEmail) {
        user.email = primaryEmail.email
      }
    }
  }

  return user
}

// ─── Google ───────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

export interface GoogleUser {
  sub: string
  name: string
  email: string
  email_verified: boolean
  picture: string
}

export function getGoogleAuthUrl(
  clientId: string,
  callbackUrl: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'openid email profile',
    state,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${GOOGLE_AUTH_URL}?${params}`
}

export async function exchangeGoogleCode(
  code: string,
  clientId: string,
  clientSecret: string,
  callbackUrl: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number; tokenType: string }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google token exchange failed: ${error}`)
  }

  const data = await response.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
    token_type: string
    error?: string
    error_description?: string
  }

  if (data.error) {
    throw new Error(`Google OAuth error: ${data.error_description || data.error}`)
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  }
}

export async function getGoogleUser(accessToken: string): Promise<GoogleUser> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Google user: ${response.status}`)
  }

  return response.json() as Promise<GoogleUser>
}
