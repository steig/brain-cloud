import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Toucan } from 'toucan-js'
import type { Env, Variables } from '../types'
import { AppError } from '../errors'

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

  // AppError — structured error with code
  if (err instanceof AppError) {
    // Only report server errors (5xx) to Sentry
    if (err.status >= 500) {
      const dsn = c.env.SENTRY_DSN
      if (dsn) {
        const sentry = new Toucan({
          dsn,
          request: c.req.raw,
          context: c.executionCtx,
        })
        sentry.setTag('requestId', requestId)
        sentry.setTag('errorCode', err.code)
        sentry.setExtra('details', err.details)
        try {
          const user = c.get('user')
          if (user?.id) sentry.setUser({ id: user.id })
        } catch {
          // user may not be set on context
        }
        sentry.captureException(err)
      }
      console.error(`[${requestId}] AppError ${err.code}:`, err.message, err.details)
    }

    return c.json(
      { error: err.message, code: err.code, requestId, ...(err.details != null && { details: err.details }) },
      err.status as Parameters<typeof c.json>[1],
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
    try {
      const user = c.get('user')
      if (user?.id) sentry.setUser({ id: user.id })
    } catch {
      // user may not be set on context
    }
    sentry.captureException(err)
  }

  console.error(`[${requestId}] Unhandled error:`, err)

  return c.json(
    { error: 'Internal Server Error', requestId },
    500,
  )
}
