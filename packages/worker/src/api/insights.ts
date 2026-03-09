import { Hono } from 'hono'
import type { Env, Variables } from '../types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/cross-project', async (c) => {
  const user = c.get('user')
  const days = Math.min(parseInt(c.req.query('days') || '30'), 365)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // 1. Repeated decision patterns across projects
  const { results: decisionPatterns } = await c.env.DB.prepare(`
    SELECT d.title, COUNT(*) as count,
           GROUP_CONCAT(DISTINCT p.name) as projects,
           GROUP_CONCAT(DISTINCT d.chosen) as choices
    FROM decisions d
    LEFT JOIN projects p ON d.project_id = p.id
    WHERE d.user_id = ? AND d.created_at >= ?
    GROUP BY LOWER(SUBSTR(d.title, 1, 50))
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `).bind(user.id, since).all()

  // 2. Common blockers across projects
  const { results: commonBlockers } = await c.env.DB.prepare(`
    SELECT t.content, COUNT(*) as count,
           GROUP_CONCAT(DISTINCT p.name) as projects
    FROM thoughts t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.user_id = ? AND t.type = 'blocker' AND t.created_at >= ?
    GROUP BY LOWER(SUBSTR(t.content, 1, 100))
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `).bind(user.id, since).all()

  // 3. Sentiment trends by tool/library
  const { results: sentimentTrends } = await c.env.DB.prepare(`
    SELECT s.target_name, s.target_type, s.feeling,
           COUNT(*) as count,
           AVG(s.intensity) as avg_intensity,
           GROUP_CONCAT(DISTINCT p.name) as projects
    FROM sentiment s
    LEFT JOIN projects p ON s.project_id = p.id
    WHERE s.user_id = ? AND s.created_at >= ?
    GROUP BY s.target_name, s.feeling
    ORDER BY count DESC
    LIMIT 20
  `).bind(user.id, since).all()

  // 4. Project activity comparison
  const { results: projectActivity } = await c.env.DB.prepare(`
    SELECT p.name, p.id,
           (SELECT COUNT(*) FROM thoughts t WHERE t.project_id = p.id AND t.created_at >= ?) as thoughts,
           (SELECT COUNT(*) FROM decisions d WHERE d.project_id = p.id AND d.created_at >= ?) as decisions,
           (SELECT COUNT(*) FROM sessions s WHERE s.project_id = p.id AND s.created_at >= ?) as sessions
    FROM projects p
    WHERE p.user_id = ?
    ORDER BY thoughts + decisions + sessions DESC
  `).bind(since, since, since, user.id).all()

  return c.json({
    period_days: days,
    decision_patterns: decisionPatterns,
    common_blockers: commonBlockers,
    sentiment_trends: sentimentTrends,
    project_activity: projectActivity,
  })
})

export { app as insightsRoutes }
