import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'
import { validateBody } from './schemas'

const GITHUB_API = 'https://api.github.com'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// --- Schemas ---

const linkRepoSchema = z.object({
  owner: z.string().min(1, 'owner is required'),
  name: z.string().min(1, 'name is required'),
})

// --- Helpers ---

async function getGitHubToken(db: D1Database, userId: string): Promise<string | null> {
  const row = await db.prepare(
    "SELECT access_token FROM oauth_accounts WHERE user_id = ? AND provider = 'github'"
  ).bind(userId).first<{ access_token: string | null }>()
  return row?.access_token ?? null
}

async function githubFetch(path: string, token: string): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'brain-cloud',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
}

function handleGitHubError(res: Response): { error: string; status: number } | null {
  if (res.ok) return null
  if (res.status === 401) return { error: 'GitHub token expired or revoked. Please re-authenticate.', status: 401 }
  if (res.status === 403) return { error: 'GitHub API rate limit exceeded or access forbidden.', status: 403 }
  if (res.status === 404) return { error: 'Repository not found or not accessible.', status: 404 }
  return { error: `GitHub API error: ${res.status}`, status: 502 }
}

// --- Routes ---

// GET /api/github/repos — list user's linked repos
app.get('/repos', async (c) => {
  const user = c.get('user')

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM github_repos WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all()

  return c.json(results)
})

// POST /api/github/repos — link a repo
app.post('/repos', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const v = validateBody(linkRepoSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  const { owner, name } = v.data

  // Check if already linked
  const existing = await c.env.DB.prepare(
    'SELECT id FROM github_repos WHERE user_id = ? AND owner = ? AND name = ?'
  ).bind(user.id, owner, name).first()
  if (existing) return c.json({ error: 'Repository already linked' }, 409)

  // Get GitHub token
  const token = await getGitHubToken(c.env.DB, user.id)
  if (!token) return c.json({ error: 'No GitHub account linked. Please authenticate with GitHub first.' }, 400)

  // Validate repo exists on GitHub
  const res = await githubFetch(`/repos/${owner}/${name}`, token)
  const ghErr = handleGitHubError(res)
  if (ghErr) return c.json({ error: ghErr.error }, ghErr.status as any)

  const repo = await res.json() as {
    full_name: string
    html_url: string
    default_branch: string
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO github_repos (id, user_id, owner, name, full_name, html_url, default_branch, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(id, user.id, owner, name, repo.full_name, repo.html_url, repo.default_branch).run()

  const created = await c.env.DB.prepare('SELECT * FROM github_repos WHERE id = ?').bind(id).first()
  return c.json(created, 201)
})

// DELETE /api/github/repos/:id — unlink repo (cascading deletes activity)
app.delete('/repos/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  // Verify ownership
  const repo = await c.env.DB.prepare(
    'SELECT id FROM github_repos WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).first()
  if (!repo) return c.json({ error: 'Repository not found' }, 404)

  // Delete activity first (FK cascade may not be enforced in D1), then the repo
  await c.env.DB.prepare('DELETE FROM github_activity WHERE repo_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM github_collaborators WHERE repo_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM github_repos WHERE id = ?').bind(id).run()

  return c.body(null, 204)
})

// POST /api/github/repos/:id/sync — sync recent activity from GitHub
app.post('/repos/:id/sync', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  // Verify ownership
  const repo = await c.env.DB.prepare(
    'SELECT * FROM github_repos WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).first<{
    id: string; owner: string; name: string; last_synced_at: string | null
  }>()
  if (!repo) return c.json({ error: 'Repository not found' }, 404)

  const token = await getGitHubToken(c.env.DB, user.id)
  if (!token) return c.json({ error: 'No GitHub account linked.' }, 400)

  const since = repo.last_synced_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const repoPath = `/repos/${repo.owner}/${repo.name}`

  let synced = { commits: 0, pull_requests: 0, issues: 0 }

  // Fetch commits
  try {
    const res = await githubFetch(`${repoPath}/commits?since=${since}&per_page=30`, token)
    if (res.ok) {
      const commits = await res.json() as Array<{
        sha: string
        commit: { message: string; author: { name: string; date: string } }
        html_url: string
        author: { login: string; avatar_url: string } | null
      }>
      for (const commit of commits) {
        await c.env.DB.prepare(
          `INSERT OR IGNORE INTO github_activity (id, repo_id, activity_type, github_id, title, body, author_login, author_avatar, html_url, created_at, imported_at)
           VALUES (?, ?, 'commit', ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
          crypto.randomUUID(), repo.id, commit.sha,
          commit.commit.message.split('\n')[0].slice(0, 255),
          commit.commit.message,
          commit.author?.login ?? commit.commit.author.name,
          commit.author?.avatar_url ?? null,
          commit.html_url,
          commit.commit.author.date,
        ).run()
        synced.commits++
      }
    }
  } catch (e) {
    console.error('Failed to sync commits:', e)
  }

  // Fetch pull requests
  try {
    const res = await githubFetch(`${repoPath}/pulls?state=all&sort=updated&direction=desc&per_page=30`, token)
    if (res.ok) {
      const prs = await res.json() as Array<{
        number: number
        title: string
        body: string | null
        state: string
        html_url: string
        user: { login: string; avatar_url: string }
        created_at: string
      }>
      for (const pr of prs) {
        await c.env.DB.prepare(
          `INSERT INTO github_activity (id, repo_id, activity_type, github_id, title, body, author_login, author_avatar, state, html_url, created_at, imported_at)
           VALUES (?, ?, 'pull_request', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(repo_id, activity_type, github_id) DO UPDATE SET
             title = excluded.title, body = excluded.body, state = excluded.state, imported_at = datetime('now')`
        ).bind(
          crypto.randomUUID(), repo.id, String(pr.number),
          pr.title, pr.body ?? '',
          pr.user.login, pr.user.avatar_url,
          pr.state, pr.html_url, pr.created_at,
        ).run()
        synced.pull_requests++
      }
    }
  } catch (e) {
    console.error('Failed to sync PRs:', e)
  }

  // Fetch issues (exclude PRs — GitHub API returns PRs as issues too)
  try {
    const res = await githubFetch(`${repoPath}/issues?state=all&sort=updated&direction=desc&per_page=30`, token)
    if (res.ok) {
      const issues = await res.json() as Array<{
        number: number
        title: string
        body: string | null
        state: string
        html_url: string
        user: { login: string; avatar_url: string }
        created_at: string
        pull_request?: unknown
      }>
      for (const issue of issues) {
        if (issue.pull_request) continue // skip PRs
        await c.env.DB.prepare(
          `INSERT INTO github_activity (id, repo_id, activity_type, github_id, title, body, author_login, author_avatar, state, html_url, created_at, imported_at)
           VALUES (?, ?, 'issue', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(repo_id, activity_type, github_id) DO UPDATE SET
             title = excluded.title, body = excluded.body, state = excluded.state, imported_at = datetime('now')`
        ).bind(
          crypto.randomUUID(), repo.id, String(issue.number),
          issue.title, issue.body ?? '',
          issue.user.login, issue.user.avatar_url,
          issue.state, issue.html_url, issue.created_at,
        ).run()
        synced.issues++
      }
    }
  } catch (e) {
    console.error('Failed to sync issues:', e)
  }

  // Update last_synced_at
  await c.env.DB.prepare(
    "UPDATE github_repos SET last_synced_at = datetime('now') WHERE id = ?"
  ).bind(repo.id).run()

  return c.json({ success: true, synced })
})

// GET /api/github/activity — list activity across all linked repos
app.get('/activity', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)

  const type = url.searchParams.get('type')
  const repoId = url.searchParams.get('repo_id')
  const sinceParam = url.searchParams.get('since')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)

  let sinceDate: string | null = null
  if (sinceParam) {
    // Support relative formats like "7d", "30d", "1d"
    const match = sinceParam.match(/^(\d+)d$/)
    if (match) {
      sinceDate = new Date(Date.now() - parseInt(match[1]) * 24 * 60 * 60 * 1000).toISOString()
    } else {
      sinceDate = sinceParam
    }
  }

  let sql = `
    SELECT ga.*, gr.full_name as repo_full_name, gr.owner as repo_owner, gr.name as repo_name
    FROM github_activity ga
    JOIN github_repos gr ON ga.repo_id = gr.id
    WHERE gr.user_id = ?`
  const params: unknown[] = [user.id]

  if (type) {
    sql += ' AND ga.activity_type = ?'
    params.push(type)
  }
  if (repoId) {
    sql += ' AND ga.repo_id = ?'
    params.push(repoId)
  }
  if (sinceDate) {
    sql += ' AND ga.created_at >= ?'
    params.push(sinceDate)
  }

  sql += ' ORDER BY ga.created_at DESC LIMIT ?'
  params.push(limit)

  const stmt = c.env.DB.prepare(sql)
  const { results } = await stmt.bind(...params).all()

  return c.json(results)
})

export { app as githubRoutes }
