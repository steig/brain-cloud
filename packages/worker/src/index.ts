import * as Sentry from '@sentry/cloudflare'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { requestLogger } from './middleware/request-logger'
import { deleteCookie } from 'hono/cookie'
import type { Env, Variables } from './types'
import { authRoutes } from './auth/routes'
import { apiRoutes } from './api/index'
import { mcpHandler, SERVER_VERSION } from './mcp/server'
import { authMiddleware, scopeMiddleware } from './auth/middleware'
import { deleteUserAccount } from './db/queries'
import { requestId } from './middleware/request-id'
import { errorHandler } from './middleware/error-handler'
import { apiRateLimiter, aiRateLimiter, authRateLimiter } from './middleware/rate-limiter'
import { handleRetention } from './retention'
import { docsRoutes } from './api/docs'
import { analyticsTrackRoutes } from './api/analytics-track'
import { installAssetRoutes } from './api/install-assets'
import { metadataRoutes } from './oauth/metadata'
import { oauthRoutes } from './oauth/routes'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Error handler
app.onError(errorHandler)

// Global middleware
app.use('*', requestId)
app.use('*', requestLogger())
app.use('*', secureHeaders({
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
  },
}))
app.use('*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL || 'https://brain-ai.dev'
    // Allow the configured frontend URL, the request's own origin, and claude.ai for MCP OAuth
    const allowedOrigins = [frontendUrl, new URL(c.req.url).origin, 'https://claude.ai', 'https://claude.com']
    if (!origin || allowedOrigins.includes(origin)) return origin
    return null
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
}))

// OAuth 2.1 well-known metadata (public, no auth)
app.route('/.well-known', metadataRoutes)

// OAuth 2.1 endpoints (rate-limited, handle their own auth)
app.use('/oauth/*', authRateLimiter)
app.route('/oauth', oauthRoutes)

// Auth routes (no auth middleware — these handle their own auth)
app.use('/auth/*', authRateLimiter)
app.route('/auth', authRoutes)

// API docs (public, no auth) — served at /api-docs to avoid conflict with SPA /docs route
app.route('/api-docs', docsRoutes)

// Analytics tracking (public, no auth — before auth middleware)
app.route('/t', analyticsTrackRoutes)

// Install assets (public, no auth — hooks, commands, manifest for CLI installer)
app.route('/install', installAssetRoutes)

// API routes (require auth + scope enforcement)
app.use('/api/*', authMiddleware)
app.use('/api/*', scopeMiddleware)
app.use('/api/*', apiRateLimiter)
app.use('/api/ask/*', aiRateLimiter)

// Account deletion (GDPR right-to-erasure) — registered before apiRoutes
app.delete('/api/account', async (c) => {
  const body = await c.req.json<{ confirm?: string }>().catch(() => ({ confirm: undefined }))
  if (body.confirm !== 'DELETE MY ACCOUNT') {
    return c.json({ error: 'Confirmation required. Send {"confirm": "DELETE MY ACCOUNT"}' }, 400)
  }

  const user = c.get('user')
  await deleteUserAccount(c.env.DB, user.id)

  // Clear auth cookies
  const secure = (c.env.FRONTEND_URL || '').startsWith('https')
  const cookieOpts = { httpOnly: true, secure, sameSite: 'Lax' as const }
  deleteCookie(c, 'brain_access', { ...cookieOpts, path: '/' })
  deleteCookie(c, 'brain_refresh', { ...cookieOpts, path: '/auth' })

  return c.body(null, 204)
})

app.route('/api', apiRoutes)

// MCP endpoint (auth via X-API-Key header, handled inside mcpHandler)
app.all('/mcp', mcpHandler)

// Health check
app.get('/health', async (c) => {
  const detail = c.req.query('detail') === 'true'

  const base = { status: 'ok', service: 'brain-cloud', version: SERVER_VERSION, timestamp: new Date().toISOString() }

  if (!detail) return c.json(base)

  // Detailed health check — verify DB connectivity
  try {
    await c.env.DB.prepare('SELECT 1').first()
    return c.json({ ...base, db: 'ok', vectorize: c.env.VECTORIZE ? 'configured' : 'not_configured' })
  } catch {
    return c.json({ ...base, db: 'error' }, 503)
  }
})

// Version info
app.get('/version', (c) => {
  return c.json({
    version: SERVER_VERSION,
    name: 'brain-cloud',
    repository: 'https://github.com/steig/brain-cloud',
  })
})

// SPA fallback — Workers Static Assets handles static files automatically,
// this catches client-side routes and returns index.html
app.get('*', (c) => {
  // If it looks like a file request, let it 404
  if (c.req.path.includes('.')) {
    return c.notFound()
  }
  // For SPA routes, serve index.html from static assets
  return c.env.ASSETS?.fetch(new Request(new URL('/index.html', c.req.url)))
    ?? c.text('Not found', 404)
})

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    release: env.CF_VERSION_METADATA?.id,
    tracesSampleRate: env.CF_VERSION_METADATA?.tag === 'staging' ? 1.0 : 0.2,
  }),
  {
    fetch: app.fetch,
    async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
      ctx.waitUntil(
        handleRetention(env.DB, env).then((result) => {
          console.log('[scheduled] Retention complete:', result)
        }),
      )
    },
  } satisfies ExportedHandler<Env>,
)
