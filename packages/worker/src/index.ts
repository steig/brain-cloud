import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import type { Env, Variables } from './types'
import { authRoutes } from './auth/routes'
import { apiRoutes } from './api/index'
import { mcpHandler } from './mcp/server'
import { authMiddleware } from './auth/middleware'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Global middleware
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL || 'https://brain-ai.dev'
    if (!origin || origin === frontendUrl) return origin
    return null
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
}))

// Auth routes (no auth middleware — these handle their own auth)
app.route('/auth', authRoutes)

// API routes (require auth)
app.use('/api/*', authMiddleware)
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
