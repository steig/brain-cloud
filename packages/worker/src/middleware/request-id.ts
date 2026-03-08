import type { MiddlewareHandler } from 'hono'
import type { Env, Variables } from '../types'

export const requestId: MiddlewareHandler<{
  Bindings: Env
  Variables: Variables
}> = async (c, next) => {
  const id = crypto.randomUUID()
  c.set('requestId', id)
  await next()
  c.header('X-Request-Id', id)
}
