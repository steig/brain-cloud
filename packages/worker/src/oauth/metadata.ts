/**
 * OAuth 2.1 Well-Known Metadata Endpoints
 * RFC 9728 (Protected Resource Metadata) + RFC 8414 (Authorization Server Metadata)
 */

import { Hono } from 'hono'
import type { Env, Variables } from '../types'

const metadata = new Hono<{ Bindings: Env; Variables: Variables }>()

// RFC 9728 — OAuth Protected Resource Metadata
// Handles both /.well-known/oauth-protected-resource and
// /.well-known/oauth-protected-resource/* (path suffix per RFC 9728 §3)
function protectedResourceHandler(c: { req: { url: string }; json: (data: unknown) => Response }) {
  const origin = new URL(c.req.url).origin
  return c.json({
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp:read', 'mcp:write'],
  })
}

metadata.get('/oauth-protected-resource', protectedResourceHandler)
metadata.get('/oauth-protected-resource/*', protectedResourceHandler)

// RFC 8414 — OAuth Authorization Server Metadata
metadata.get('/oauth-authorization-server', (c) => {
  const origin = new URL(c.req.url).origin
  return c.json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    scopes_supported: ['mcp:read', 'mcp:write'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    code_challenge_methods_supported: ['S256'],
  })
})

export { metadata as metadataRoutes }
