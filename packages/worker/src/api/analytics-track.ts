import { Hono } from 'hono'
import type { Env, Variables } from '../types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// POST /t/pageview — track a page view (no auth required for marketing pages)
app.post('/pageview', async (c) => {
  const body = await c.req.json<{ path: string; referrer?: string }>().catch(() => null)
  if (!body?.path) return c.json({ ok: true }) // silently ignore bad data

  const ip = c.req.header('cf-connecting-ip') ?? ''
  // Hash IP + date for daily unique counting (no PII stored)
  const dateKey = new Date().toISOString().slice(0, 10)
  const encoder = new TextEncoder()
  const data = encoder.encode(`${ip}:${dateKey}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const visitorHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)

  await c.env.DB.prepare(
    `INSERT INTO page_views (id, path, referrer, visitor_hash, country, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    crypto.randomUUID(),
    body.path.slice(0, 255),
    body.referrer?.slice(0, 500) ?? null,
    visitorHash,
    c.req.header('cf-ipcountry') ?? null,
  ).run()

  return c.json({ ok: true })
})

export { app as analyticsTrackRoutes }

// Admin-only pageview summary (mounted under /api/admin/pageviews)
const adminApp = new Hono<{ Bindings: Env; Variables: Variables }>()

adminApp.get('/', async (c) => {
  const days = Math.min(parseInt(c.req.query('days') || '30'), 365)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [dailyViews, topPages, topCountries] = await Promise.all([
    c.env.DB.prepare(
      `SELECT DATE(created_at) as date, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as unique_visitors
       FROM page_views WHERE created_at >= ? GROUP BY date ORDER BY date`
    ).bind(since).all(),
    c.env.DB.prepare(
      `SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as unique_visitors
       FROM page_views WHERE created_at >= ? GROUP BY path ORDER BY views DESC LIMIT 20`
    ).bind(since).all(),
    c.env.DB.prepare(
      `SELECT country, COUNT(*) as views FROM page_views WHERE created_at >= ? AND country IS NOT NULL
       GROUP BY country ORDER BY views DESC LIMIT 10`
    ).bind(since).all(),
  ])

  return c.json({
    daily: dailyViews.results,
    top_pages: topPages.results,
    top_countries: topCountries.results,
  })
})

export { adminApp as analyticsAdminRoutes }
