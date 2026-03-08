import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import type { Env, Variables } from './types'
import { authRoutes } from './auth/routes'
import { apiRoutes } from './api/index'
import { mcpHandler } from './mcp/server'
import { authMiddleware, scopeMiddleware } from './auth/middleware'
import { deleteUserAccount } from './db/queries'
import { requestId } from './middleware/request-id'
import { errorHandler } from './middleware/error-handler'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Error handler
app.onError(errorHandler)

// Global middleware
app.use('*', requestId)
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL || 'https://brain-ai.dev'
    const allowed = [frontendUrl, 'https://dash.brain-ai.dev']
    if (!origin || allowed.includes(origin)) return origin
    return null
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
}))

// Auth routes (no auth middleware — these handle their own auth)
app.route('/auth', authRoutes)

// API routes (require auth + scope enforcement)
app.use('/api/*', authMiddleware)
app.use('/api/*', scopeMiddleware)

// Account deletion (GDPR right-to-erasure) — registered before apiRoutes
app.delete('/api/account', async (c) => {
  const user = c.get('user')
  await deleteUserAccount(c.env.DB, user.id)
  return c.json({ success: true, message: 'Account and all associated data deleted' })
})

app.route('/api', apiRoutes)

// MCP endpoint (auth via X-API-Key header, handled inside mcpHandler)
app.all('/mcp', mcpHandler)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'brain-cloud' }))

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

export default app
