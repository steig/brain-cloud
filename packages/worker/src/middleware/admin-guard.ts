import type { Context, Next } from 'hono'
import type { Env, Variables } from '../types'

/** Middleware that restricts access to admin and super_admin users */
export async function adminGuard(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const user = c.get('user')
  if (user.system_role !== 'admin' && user.system_role !== 'super_admin') {
    return c.json({ error: 'Admin access required', code: 'FORBIDDEN' }, 403)
  }
  await next()
}
