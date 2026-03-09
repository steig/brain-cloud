// JWT token management using jose (Web Crypto compatible)
import * as jose from 'jose'

export type SystemRole = 'user' | 'admin' | 'super_admin'

export interface TokenPayload {
  sub: string
  name: string
  email?: string
  avatar?: string
  system_role?: SystemRole
}

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

function getSecret(jwtSecret: string) {
  return new TextEncoder().encode(jwtSecret)
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error(`Invalid duration: ${duration}`)

  const value = parseInt(match[1], 10)
  switch (match[2]) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 60 * 60
    case 'd': return value * 60 * 60 * 24
    default: throw new Error(`Invalid duration unit: ${match[2]}`)
  }
}

export async function generateAccessToken(
  payload: TokenPayload,
  jwtSecret: string,
  jwtIssuer: string,
): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(jwtIssuer)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSecret(jwtSecret))
}

export async function verifyAccessToken(
  token: string,
  jwtSecret: string,
  jwtIssuer: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecret(jwtSecret), {
      issuer: jwtIssuer,
    })
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function getTokenExpiries(): { accessExpiry: Date; refreshExpiry: Date } {
  const now = Date.now()
  return {
    accessExpiry: new Date(now + parseDuration(ACCESS_TOKEN_EXPIRY) * 1000),
    refreshExpiry: new Date(now + parseDuration(REFRESH_TOKEN_EXPIRY) * 1000),
  }
}
