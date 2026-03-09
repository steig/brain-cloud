import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import * as Sentry from '@sentry/cloudflare'
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
      Sentry.withScope((scope) => {
        scope.setTag('requestId', requestId)
        scope.setTag('errorCode', err.code)
        scope.setExtra('details', err.details)
        try {
          const user = c.get('user')
          if (user?.id) scope.setUser({ id: user.id })
        } catch {
          // user may not be set on context
        }
        Sentry.captureException(err)
      })
      console.error(`[${requestId}] AppError ${err.code}:`, err.message, err.details)
    }

    // Strip internal details from 5xx responses to avoid leaking sensitive info
    const includeDetails = err.status < 500 && err.details != null
    return c.json(
      { error: err.status >= 500 ? 'Internal Server Error' : err.message, code: err.code, requestId, ...(includeDetails && { details: err.details }) },
      err.status as Parameters<typeof c.json>[1],
    )
  }

  // Unknown errors — report to Sentry
  Sentry.withScope((scope) => {
    scope.setTag('requestId', requestId)
    try {
      const user = c.get('user')
      if (user?.id) scope.setUser({ id: user.id })
    } catch {
      // user may not be set on context
    }
    Sentry.captureException(err)
  })

  console.error(`[${requestId}] Unhandled error:`, err)

  return c.json(
    { error: 'Internal Server Error', requestId },
    500,
  )
}
