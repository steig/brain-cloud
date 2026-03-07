import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// POST /api/rpc/dx_summary
app.post('/dx_summary', async (c) => {
  const user = c.get('user')
  const { from_date, to_date } = await c.req.json()
  const result = await q.getDxSummary(c.env.DB, user.id, from_date, to_date)
  // Return as array to match PostgREST format
  return c.json([result])
})

// POST /api/rpc/brain_summary
app.post('/brain_summary', async (c) => {
  const user = c.get('user')
  const { p_from_date, p_to_date, p_project_id } = await c.req.json()
  const result = await q.getBrainSummary(c.env.DB, user.id, p_from_date, p_to_date, p_project_id)
  return c.json(result)
})

// POST /api/rpc/search_brain
app.post('/search_brain', async (c) => {
  const user = c.get('user')
  const { query, limit_rows } = await c.req.json()
  const results = await q.searchBrain(c.env.DB, user.id, query, limit_rows)
  return c.json(results)
})

// POST /api/rpc/timeline
app.post('/timeline', async (c) => {
  const user = c.get('user')
  const { from_date, to_date, limit_rows } = await c.req.json()
  const results = await q.getTimeline(c.env.DB, user.id, from_date, to_date, limit_rows)
  return c.json(results)
})

// POST /api/rpc/register_machine
app.post('/register_machine', async (c) => {
  const user = c.get('user')
  const { p_hostname, p_os, p_arch, p_metadata } = await c.req.json()
  const id = await q.upsertMachine(c.env.DB, user.id, p_hostname, p_os, p_arch, p_metadata)
  return c.json(id)
})

// POST /api/rpc/register_project
app.post('/register_project', async (c) => {
  const { p_name, p_repo_url, p_description, p_metadata } = await c.req.json()
  const id = await q.upsertProject(c.env.DB, p_name, p_repo_url, p_description, p_metadata)
  return c.json(id)
})

// POST /api/rpc/coaching_daily_data
app.post('/coaching_daily_data', async (c) => {
  const user = c.get('user')
  const { p_days } = await c.req.json()
  const result = await q.getCoachingDailyData(c.env.DB, user.id, p_days || 7)
  return c.json(result)
})

// POST /api/rpc/coaching_insights
app.post('/coaching_insights', async (c) => {
  const user = c.get('user')
  const { p_from_date, p_to_date } = await c.req.json()
  const result = await q.getCoachingDailyData(c.env.DB, user.id, 30)
  return c.json(result)
})

// POST /api/rpc/decision_accuracy
app.post('/decision_accuracy', async (c) => {
  const user = c.get('user')
  const { p_from_date, p_to_date, p_project_id } = await c.req.json()
  // Simplified: return review stats
  const { results } = await c.env.DB.prepare(
    `SELECT COUNT(*) as total_reviews,
     AVG(outcome_rating) as avg_rating,
     SUM(CASE WHEN would_decide_same THEN 1 ELSE 0 END) as would_repeat
     FROM decision_reviews WHERE user_id = ? AND created_at BETWEEN ? AND ?`
  ).bind(user.id, p_from_date, p_to_date).all()
  return c.json(results[0] || {})
})

// POST /api/rpc/cost_per_outcome
app.post('/cost_per_outcome', async (c) => {
  const user = c.get('user')
  const { p_from_date, p_to_date } = await c.req.json()
  const { results } = await c.env.DB.prepare(
    `SELECT model, SUM(cost_usd) as total_cost, SUM(request_count) as total_requests,
     SUM(tokens_in) as total_tokens_in, SUM(tokens_out) as total_tokens_out
     FROM dx_costs WHERE user_id = ? AND date BETWEEN date(?) AND date(?)
     GROUP BY model ORDER BY total_cost DESC`
  ).bind(user.id, p_from_date, p_to_date).all()
  return c.json(results)
})

// POST /api/rpc/prompt_quality_stats
app.post('/prompt_quality_stats', async (c) => {
  const user = c.get('user')
  const { p_from_date, p_to_date } = await c.req.json()
  const result = await c.env.DB.prepare(
    `SELECT COUNT(*) as total,
     AVG(quality_score) as avg_quality,
     AVG(CASE WHEN goal_achieved THEN 1.0 ELSE 0.0 END) as goal_rate,
     AVG(CASE WHEN context_sufficient THEN 1.0 ELSE 0.0 END) as context_rate,
     AVG(turns) as avg_turns
     FROM conversations WHERE user_id = ? AND created_at BETWEEN ? AND ?`
  ).bind(user.id, p_from_date, p_to_date).first()
  return c.json(result || {})
})

// POST /api/rpc/learning_curve
app.post('/learning_curve', async (c) => {
  const user = c.get('user')
  const { p_weeks } = await c.req.json()
  const weeks = p_weeks || 12

  const { results } = await c.env.DB.prepare(
    `SELECT strftime('%Y-W%W', created_at) as week,
     COUNT(*) as total_conversations,
     AVG(quality_score) as avg_quality,
     AVG(CASE WHEN goal_achieved THEN 1.0 ELSE 0.0 END) as goal_rate
     FROM conversations WHERE user_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
     GROUP BY week ORDER BY week`
  ).bind(user.id, weeks * 7).all()
  return c.json(results)
})

// Catch-all for decision_reviews and conversations POST
app.post('/decision_reviews', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const result = await q.createDecisionReview(c.env.DB, user.id, body)
  return c.json(result, 201)
})

app.post('/conversations', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const result = await q.createConversation(c.env.DB, user.id, body)
  return c.json(result, 201)
})

export { app as analyticsRoutes }
