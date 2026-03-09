import type { Context, Next } from 'hono'
import type { Env, Variables } from '../types'

interface RequestLog {
  timestamp: string
  requestId: string
  method: string
  path: string
  status: number
  durationMs: number
  userId?: string
  userAgent?: string
  ip?: string
  contentLength?: number
}

/**
 * Structured request logger.
 * Outputs JSON logs for Cloudflare log analysis.
 */
export function requestLogger() {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const start = Date.now()

    await next()

    const duration = Date.now() - start
    const user = c.get('user')

    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      requestId: c.get('requestId') ?? '',
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: duration,
      userId: user?.id,
      userAgent: c.req.header('user-agent')?.slice(0, 100),
      ip: c.req.header('cf-connecting-ip') ?? undefined,
      contentLength: parseInt(c.res.headers.get('content-length') ?? '0') || undefined,
    }

    // Use structured JSON logging
    console.log(JSON.stringify(log))

    // Add server timing header
    c.res.headers.set('Server-Timing', `total;dur=${duration}`)
  }
}
