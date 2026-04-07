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
import { backfillRoutes } from './backfill'
import { askRoutes } from './ask'
import { insightsRoutes } from './insights'
import { adminRoutes } from './admin'
import { notificationRoutes } from './notifications'
import { reminderRoutes } from './reminders'
import { orchestratorRoutes } from './orchestrator'

const api = new Hono<{ Bindings: Env; Variables: Variables }>()

api.route('/thoughts', thoughtRoutes)
api.route('/decisions', decisionRoutes)
api.route('/sessions', sessionRoutes)
api.route('/sentiment', sentimentRoutes)
api.route('/projects', projectRoutes)
api.route('/handoffs', handoffRoutes)
api.route('/dx_events', dxRoutes)
api.route('/dx_costs', dxRoutes)
api.route('/ai-costs', dxRoutes)
api.route('/session_scores', sessionRoutes)
api.route('/teams', teamRoutes)
api.route('/rpc', analyticsRoutes)
api.route('/export', exportRoutes)
api.route('/github', githubRoutes)
api.route('/backfill', backfillRoutes)
api.route('/ask', askRoutes)
api.route('/insights', insightsRoutes)
api.route('/admin', adminRoutes)
api.route('/notifications', notificationRoutes)
api.route('/reminders', reminderRoutes)
api.route('/orchestrator', orchestratorRoutes)

export { api as apiRoutes }
