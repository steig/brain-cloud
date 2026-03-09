// Cloudflare Worker environment bindings
export interface Env {
  // D1 database
  DB: D1Database

  // Workers AI
  AI?: Ai

  // Vectorize index for semantic search
  VECTORIZE?: VectorizeIndex

  // Workers Static Assets (auto-injected by [assets] config)
  ASSETS?: Fetcher

  // Secrets (set via `wrangler secret put`)
  JWT_SECRET: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  SENTRY_DSN?: string
  MAILCHANNELS_ENABLED?: string

  // Version metadata (for Sentry releases)
  CF_VERSION_METADATA?: { id: string; tag: string }

  // Vars (set in wrangler.toml)
  JWT_ISSUER: string
  FRONTEND_URL: string
  GITHUB_CALLBACK_URL?: string
  GOOGLE_CALLBACK_URL?: string
}

// Auth context attached to requests
export interface AuthUser {
  id: string
  name: string
  email?: string
  avatar?: string
  system_role: 'user' | 'admin' | 'super_admin'
  key_scope?: 'read' | 'write' | 'admin'
}

// Extended Hono variables
export type Variables = {
  user: AuthUser
  requestId: string
}
