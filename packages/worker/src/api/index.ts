import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { thoughtRoutes } from './thoughts'
import { decisionRoutes } from './decisions'
import { sessionRoutes } from './sessions'
import { sentimentRoutes } from './sentiment'
import { analyticsRoutes } from './analytics'
import { projectRoutes } from './projects'
import { dxRoutes } from './dx'
import { handoffRoutes } from './handoffs'
import { teamRoutes } from './teams'
import { exportRoutes } from './export'
import { githubRoutes } from './github'

const api = new Hono<{ Bindings: Env; Variables: Variables }>()

api.route('/thoughts', thoughtRoutes)
api.route('/decisions', decisionRoutes)
api.route('/sessions', sessionRoutes)
api.route('/sentiment', sentimentRoutes)
api.route('/projects', projectRoutes)
api.route('/handoffs', handoffRoutes)
api.route('/dx_events', dxRoutes)
api.route('/dx_costs', dxRoutes)
api.route('/session_scores', sessionRoutes)
api.route('/teams', teamRoutes)
api.route('/rpc', analyticsRoutes)
api.route('/export', exportRoutes)
api.route('/github', githubRoutes)

export { api as apiRoutes }
