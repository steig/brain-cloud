import { describe, it, expect, beforeAll } from 'vitest'
import { SELF } from 'cloudflare:test'
import { applyMigrations, seedTestUser, getTestDb, TEST_USER } from './helpers'

const API_KEY = TEST_USER.api_key

/** Send a JSON-RPC request to /mcp */
function mcpRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY, ...headers },
    body: JSON.stringify(body),
  })
}

/** Build a tools/call JSON-RPC payload */
function toolCall(name: string, args: Record<string, unknown>, id: number = 1) {
  return { jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }
}

/** Parse the text content from a tools/call response */
function parseToolResult(result: { content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse(result.content[0].text)
}

describe('MCP JSON-RPC endpoint', () => {
  beforeAll(async () => {
    const db = getTestDb()
    await applyMigrations(db)
    await seedTestUser(db)
  })

  // ── Protocol ──────────────────────────────────────────────────────

  describe('protocol', () => {
    it('rejects non-POST requests', async () => {
      const res = await SELF.fetch(new Request('http://localhost/mcp', {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY },
      }))
      expect(res.status).toBe(405)
    })

    it('tools/list returns all tool definitions', async () => {
      const res = await SELF.fetch(mcpRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))
      expect(res.status).toBe(200)
      const body = await res.json() as { jsonrpc: string; result: { tools: Array<{ name: string }> }; id: number }
      expect(body.jsonrpc).toBe('2.0')
      expect(body.id).toBe(1)
      expect(body.result.tools.length).toBeGreaterThanOrEqual(28)
      const names = body.result.tools.map(t => t.name)
      expect(names).toContain('brain_thought')
      expect(names).toContain('brain_decide')
      expect(names).toContain('brain_session_start')
      expect(names).toContain('brain_search')
      expect(names).toContain('brain_recall')
      expect(names).toContain('brain_sentiment')
      expect(names).toContain('brain_timeline')
    })

    it('initialize returns server info', async () => {
      const res = await SELF.fetch(mcpRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' }))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { serverInfo: { name: string }; capabilities: unknown } }
      expect(body.result.serverInfo.name).toBe('brain-mcp')
      expect(body.result.capabilities).toBeDefined()
    })

    it('returns method-not-found for unknown methods', async () => {
      const res = await SELF.fetch(mcpRequest({ jsonrpc: '2.0', id: 1, method: 'unknown/method' }))
      expect(res.status).toBe(200)
      const body = await res.json() as { error: { code: number; message: string } }
      expect(body.error.code).toBe(-32601)
    })

    it('handles batch requests', async () => {
      const res = await SELF.fetch(mcpRequest([
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { jsonrpc: '2.0', id: 2, method: 'ping' },
      ]))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: number }>
      expect(body).toHaveLength(2)
      expect(body[0].id).toBe(1)
      expect(body[1].id).toBe(2)
    })
  })

  // ── Auth ───────────────────────────────────────────────────────────

  describe('auth', () => {
    it('rejects requests without X-API-Key', async () => {
      const res = await SELF.fetch(new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }))
      expect(res.status).toBe(401)
      const body = await res.json() as { error: { message: string } }
      expect(body.error.message).toContain('Missing X-API-Key')
    })

    it('rejects requests with invalid API key', async () => {
      const res = await SELF.fetch(mcpRequest(
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        { 'X-API-Key': 'invalid-key-does-not-exist' },
      ))
      expect(res.status).toBe(401)
      const body = await res.json() as { error: { message: string } }
      expect(body.error.message).toContain('Invalid API key')
    })
  })

  // ── brain_thought ─────────────────────────────────────────────────

  describe('brain_thought', () => {
    it('creates a thought and returns it', async () => {
      const res = await SELF.fetch(mcpRequest(toolCall('brain_thought', {
        content: 'MCP test thought',
        type: 'note',
        tags: ['mcp-test'],
      })))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { success: boolean; thought: { id: string; content: string } }
      expect(result.success).toBe(true)
      expect(result.thought.id).toBeDefined()
      expect(result.thought.content).toBe('MCP test thought')
    })

    it('returns error for unknown tool', async () => {
      const res = await SELF.fetch(mcpRequest(toolCall('nonexistent_tool', {})))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }>; isError: boolean } }
      expect(body.result.isError).toBe(true)
      expect(body.result.content[0].text).toContain('Unknown tool')
    })
  })

  // ── brain_decide ──────────────────────────────────────────────────

  describe('brain_decide', () => {
    it('creates a decision with options', async () => {
      const res = await SELF.fetch(mcpRequest(toolCall('brain_decide', {
        title: 'MCP test decision',
        chosen: 'Option B',
        rationale: 'Better performance',
        context: 'Choosing between A and B',
        options: [
          { option: 'Option A', pros: ['simple'], cons: ['slow'] },
          { option: 'Option B', pros: ['fast'], cons: ['complex'] },
        ],
        tags: ['mcp-test'],
      })))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { success: boolean; decision: { id: string; title: string } }
      expect(result.success).toBe(true)
      expect(result.decision.title).toBe('MCP test decision')
    })
  })

  // ── brain_session_start / brain_session_end ────────────────────────

  describe('brain_session_start/end', () => {
    let sessionId: string

    it('starts a session', async () => {
      const res = await SELF.fetch(mcpRequest(toolCall('brain_session_start', {
        mood: 'focused',
        goals: ['test the MCP endpoint'],
      })))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { success: boolean; session_id: string; session: { id: string } }
      expect(result.success).toBe(true)
      expect(result.session_id).toBeDefined()
      sessionId = result.session_id
    })

    it('ends a session', async () => {
      const res = await SELF.fetch(mcpRequest(toolCall('brain_session_end', {
        session_id: sessionId,
        mood: 'productive',
        accomplishments: ['tested MCP'],
        summary: 'MCP tests passed',
      })))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { success: boolean; message: string }
      expect(result.success).toBe(true)
      expect(result.message).toContain('Session ended')
    })
  })

  // ── brain_search ──────────────────────────────────────────────────

  describe('brain_search', () => {
    it('creates entries then searches for them', async () => {
      // Create a thought with distinct content
      await SELF.fetch(mcpRequest(toolCall('brain_thought', {
        content: 'Searchable unicorn rainbow mcp test entry',
        type: 'note',
        tags: ['search-test'],
      })))

      const res = await SELF.fetch(mcpRequest(toolCall('brain_search', {
        query: 'unicorn rainbow',
        limit: 10,
      })))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { results: Array<{ content: string; type: string }> }
      expect(result.results.length).toBeGreaterThanOrEqual(1)
      const match = result.results.find(r => r.content.includes('unicorn rainbow'))
      expect(match).toBeDefined()
    })
  })

  // ── brain_recall ──────────────────────────────────────────────────

  describe('brain_recall', () => {
    it('recalls entries with formatted output', async () => {
      // Create a decision to recall
      await SELF.fetch(mcpRequest(toolCall('brain_decide', {
        title: 'Recall test framework choice',
        chosen: 'Vitest',
        rationale: 'Better DX for workers',
        tags: ['recall-test'],
      })))

      const res = await SELF.fetch(mcpRequest(toolCall('brain_recall', {
        query: 'framework choice',
        limit: 5,
      })))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { query: string; found: number; formatted: string; memories: unknown[] }
      expect(result.query).toBe('framework choice')
      expect(result.found).toBeGreaterThanOrEqual(1)
      expect(result.formatted).toBeDefined()
      expect(result.memories.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── brain_sentiment ───────────────────────────────────────────────

  describe('brain_sentiment', () => {
    it('creates a sentiment entry', async () => {
      const res = await SELF.fetch(mcpRequest(toolCall('brain_sentiment', {
        target_type: 'tool',
        target_name: 'vitest',
        feeling: 'impressed',
        intensity: 5,
        reason: 'MCP tests work great',
      })))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { success: boolean; sentiment: { id: string } }
      expect(result.success).toBe(true)
      expect(result.sentiment.id).toBeDefined()
    })
  })

  // ── brain_timeline ────────────────────────────────────────────────

  describe('brain_timeline', () => {
    it('returns timeline entries', async () => {
      // Create a thought to ensure there's data
      await SELF.fetch(mcpRequest(toolCall('brain_thought', {
        content: 'Timeline test entry',
        type: 'note',
      })))

      const res = await SELF.fetch(mcpRequest(toolCall('brain_timeline', {
        days: 30,
        limit: 50,
      })))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { entries: unknown[] }
      expect(result.entries.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── brain_log_commit ──────────────────────────────────────────────

  describe('brain_log_commit', () => {
    it('logs a commit as a thought', async () => {
      const res = await SELF.fetch(mcpRequest(toolCall('brain_log_commit', {
        hash: 'abc1234567890',
        message: 'Add MCP integration tests',
        files_changed: ['src/__tests__/mcp.test.ts'],
        branch: 'main',
        additions: 200,
        deletions: 0,
      })))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { success: boolean; thought: { content: string } }
      expect(result.success).toBe(true)
      expect(result.thought.content).toContain('abc1234')
    })
  })

  // ── brain_score_session ───────────────────────────────────────────

  describe('brain_score_session', () => {
    it('scores a session with rubrics', async () => {
      const res = await SELF.fetch(mcpRequest(toolCall('brain_score_session', {
        goals: ['write tests'],
        accomplishments: ['wrote tests'],
        blockers: [],
        mood_start: 'focused',
        mood_end: 'productive',
        duration_minutes: 60,
        thought_count: 5,
        decision_count: 2,
        insight_count: 1,
        error_count: 0,
        success_rate: 1.0,
      })))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { success: boolean; scores: unknown }
      expect(result.success).toBe(true)
      expect(result.scores).toBeDefined()
    })
  })

  // ── brain_decision_templates ──────────────────────────────────────

  describe('brain_decision_templates', () => {
    it('lists all templates', async () => {
      const res = await SELF.fetch(mcpRequest(toolCall('brain_decision_templates', {})))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseToolResult(body.result) as { success: boolean; templates: unknown }
      expect(result.success).toBe(true)
      expect(result.templates).toBeDefined()
    })
  })
})
