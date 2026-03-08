import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Toucan } from 'toucan-js'
import type { Env, Variables } from '../types'

export const errorHandler: ErrorHandler<{
  Bindings: Env
  Variables: Variables
}> = (err, c) => {
  const requestId = c.get('requestId') ?? 'unknown'

  // Known HTTP errors — return as-is without reporting to Sentry
  if (err instanceof HTTPException) {
    return c.json(
      { error: err.message, requestId },
      err.status,
    )
  }

  // Unknown errors — report to Sentry
  const dsn = c.env.SENTRY_DSN
  if (dsn) {
    const sentry = new Toucan({
      dsn,
      request: c.req.raw,
      context: c.executionCtx,
    })
    sentry.setTag('requestId', requestId)
    sentry.captureException(err)
  }

  console.error(`[${requestId}] Unhandled error:`, err)

  return c.json(
    { error: 'Internal Server Error', requestId },
    500,
  )
}
