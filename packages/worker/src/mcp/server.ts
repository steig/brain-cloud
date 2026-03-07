/**
 * MCP Streamable HTTP endpoint.
 * Implements JSON-RPC 2.0 protocol for MCP tool calls over stateless HTTP.
 * All 28 tool handlers call db/queries.ts directly (no HTTP round-trip).
 */

import type { Context } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import { parsePeriod, formatDate } from './utils'
import { scoreSession } from './scoring'
import { getDecisionTemplate, listDecisionTemplates } from './templates'

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface JsonRpcRequest {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
  id?: string | number
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
  id: string | number | null
}

interface McpUser {
  id: string
  name: string
}

// ═══════════════════════════════════════════════════════════════════
// Workers AI helper
// ═══════════════════════════════════════════════════════════════════

async function generateWithAI(env: Env, prompt: string): Promise<string> {
  try {
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    })
    return (result as any)?.response || ''
  } catch {
    return ''
  }
}

// ═══════════════════════════════════════════════════════════════════
// Tool Definitions
// ═══════════════════════════════════════════════════════════════════

const TOOLS = [
  {
    name: 'brain_thought',
    description: 'Record a thought, idea, or note. Automatically captures user, machine, and project context.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The thought or note content' },
        type: { type: 'string', enum: ['note', 'idea', 'question', 'todo', 'insight'], description: 'Type of thought (default: note)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags' },
        context: { type: 'object', description: 'Optional context (file, line, function)' },
      },
      required: ['content'],
    },
  },
  {
    name: 'brain_decide',
    description: 'Record a decision with context, options considered, and rationale.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title for the decision' },
        context: { type: 'string', description: 'What led to needing this decision' },
        options: {
          type: 'array', items: {
            type: 'object', properties: {
              option: { type: 'string' },
              pros: { type: 'array', items: { type: 'string' } },
              cons: { type: 'array', items: { type: 'string' } },
            },
          },
          description: 'Options that were considered',
        },
        chosen: { type: 'string', description: 'Which option was chosen' },
        rationale: { type: 'string', description: 'Why this option was chosen' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags' },
        outcome: { type: 'string', description: "What happened as a result (e.g., 'Implemented in abc123, PR #45')" },
      },
      required: ['title', 'chosen', 'rationale'],
    },
  },
  {
    name: 'brain_update',
    description: "Update a decision's outcome or tags.",
    inputSchema: {
      type: 'object',
      properties: {
        decision_id: { type: 'string', description: 'The decision UUID to update' },
        outcome: { type: 'string', description: 'What happened as a result' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Additional tags to add (merged with existing)' },
      },
      required: ['decision_id'],
    },
  },
  {
    name: 'brain_search',
    description: 'Search through thoughts and decisions using full-text search.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'brain_timeline',
    description: 'Get a chronological view of recent brain entries.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'How many days back (default: 7)' },
        limit: { type: 'number', description: 'Max results (default: 50)' },
      },
    },
  },
  {
    name: 'brain_session_start',
    description: 'Start a Claude work session. Returns a session_id for brain_session_end.',
    inputSchema: {
      type: 'object',
      properties: {
        mood: { type: 'string', description: "How the session is starting (e.g., 'focused', 'exploratory', 'debugging')" },
        goals: { type: 'array', items: { type: 'string' }, description: 'What the user wants to accomplish' },
      },
    },
  },
  {
    name: 'brain_session_end',
    description: 'End the current Claude work session with a summary.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Session ID from brain_session_start' },
        mood: { type: 'string', description: "How the session ended (e.g., 'productive', 'blocked')" },
        accomplishments: { type: 'array', items: { type: 'string' }, description: 'List of things accomplished' },
        blockers: { type: 'array', items: { type: 'string' }, description: 'Any blockers encountered' },
        summary: { type: 'string', description: 'Brief summary of the session' },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'brain_sentiment',
    description: 'Record how you feel about a tool, library, pattern, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        target_type: { type: 'string', enum: ['tool', 'library', 'pattern', 'codebase', 'task', 'process'], description: 'What kind of thing' },
        target_name: { type: 'string', description: 'Name of the thing' },
        feeling: { type: 'string', enum: ['frustrated', 'confused', 'satisfied', 'excited', 'neutral', 'annoyed', 'impressed'], description: 'How you feel' },
        intensity: { type: 'number', minimum: 1, maximum: 5, description: 'Intensity (1-5)' },
        reason: { type: 'string', description: 'Why you feel this way' },
      },
      required: ['target_type', 'target_name', 'feeling'],
    },
  },
  {
    name: 'brain_dx_event',
    description: 'Log a DX event (command execution, tool use, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        event_type: { type: 'string', enum: ['command', 'tool_use', 'completion', 'error'], description: 'Type of event' },
        command: { type: 'string', description: 'Command or tool name' },
        duration_ms: { type: 'number', description: 'Duration in milliseconds' },
        tokens_in: { type: 'number', description: 'Input tokens used' },
        tokens_out: { type: 'number', description: 'Output tokens generated' },
        success: { type: 'boolean', description: 'Whether it succeeded' },
        error_message: { type: 'string', description: 'Error message if failed' },
      },
      required: ['event_type'],
    },
  },
  {
    name: 'brain_dx_summary',
    description: 'Get DX analytics summary for the past N days.',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'Number of days to summarize (default: 30)' } },
    },
  },
  {
    name: 'brain_delete',
    description: 'Delete a thought or decision by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['thought', 'decision'], description: 'Type of entry to delete' },
        id: { type: 'string', description: 'UUID of the entry to delete' },
      },
      required: ['type', 'id'],
    },
  },
  {
    name: 'brain_log_commit',
    description: 'Log a Git commit to the brain as a thought entry.',
    inputSchema: {
      type: 'object',
      properties: {
        hash: { type: 'string', description: 'The commit hash' },
        message: { type: 'string', description: 'The commit message' },
        files_changed: { type: 'array', items: { type: 'string' }, description: 'List of files changed' },
        project: { type: 'string', description: 'Project name' },
        additions: { type: 'number', description: 'Lines added' },
        deletions: { type: 'number', description: 'Lines deleted' },
        author: { type: 'string', description: 'Commit author' },
        branch: { type: 'string', description: 'Branch name' },
      },
      required: ['hash', 'message'],
    },
  },
  {
    name: 'brain_recall',
    description: "Recall past thoughts and decisions. Use for 'What did I decide about X?'",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language query' },
        limit: { type: 'number', description: 'Max results (default: 10)' },
        include_details: { type: 'boolean', description: 'Include full decision details (default: true)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'brain_suggest_decision',
    description: 'Analyze context to suggest if a decision should be recorded.',
    inputSchema: {
      type: 'object',
      properties: {
        context: { type: 'string', description: 'What the user is working on' },
        options_mentioned: { type: 'array', items: { type: 'string' }, description: 'Options being considered' },
        decision_type: { type: 'string', enum: ['architecture', 'library', 'pattern', 'tooling', 'process', 'other'] },
        urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['context'],
    },
  },
  {
    name: 'brain_summarize',
    description: "Generate a summary of brain activity for a time period (e.g., 'this week', '30').",
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', description: "Time period: 'this month', 'last week', '7', etc." },
        project: { type: 'string', description: 'Filter to a specific project name' },
      },
      required: ['period'],
    },
  },
  {
    name: 'brain_daily_digest',
    description: "Generate today's daily digest using AI.",
    inputSchema: {
      type: 'object',
      properties: { force: { type: 'boolean', description: 'Force regeneration (default: false)' } },
    },
  },
  {
    name: 'brain_daily_coaching',
    description: 'Generate daily AI coaching across 5 dimensions.',
    inputSchema: {
      type: 'object',
      properties: {
        force: { type: 'boolean', description: 'Force regeneration (default: false)' },
        days: { type: 'number', description: 'Days to analyze (default: 7)' },
      },
    },
  },
  {
    name: 'brain_handoff',
    description: 'Create a handoff to pass context to another project.',
    inputSchema: {
      type: 'object',
      properties: {
        to_project: { type: 'string', description: 'Target project name' },
        message: { type: 'string', description: 'The handoff message' },
        handoff_type: { type: 'string', enum: ['context', 'decision', 'blocker', 'task'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['to_project', 'message'],
    },
  },
  {
    name: 'brain_handoffs',
    description: 'List pending handoffs for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name to check' },
        include_claimed: { type: 'boolean', description: 'Include claimed handoffs (default: false)' },
      },
    },
  },
  {
    name: 'brain_handoff_claim',
    description: 'Claim a handoff to mark it as received.',
    inputSchema: {
      type: 'object',
      properties: {
        handoff_id: { type: 'string', description: 'The handoff ID to claim' },
        note: { type: 'string', description: 'Optional note' },
      },
      required: ['handoff_id'],
    },
  },
  {
    name: 'brain_conversation',
    description: 'Record an AI conversation/prompt interaction.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt_text: { type: 'string', description: 'The prompt text' },
        response_summary: { type: 'string', description: 'Summary of the AI response' },
        turns: { type: 'number', description: 'Number of turns (default: 1)' },
        prompt_tokens: { type: 'number' },
        response_tokens: { type: 'number' },
        goal_achieved: { type: 'boolean' },
        context_sufficient: { type: 'boolean' },
        quality_score: { type: 'number', description: 'Quality score (1-5)' },
        session_id: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        metadata: { type: 'object' },
      },
      required: ['prompt_text'],
    },
  },
  {
    name: 'brain_coaching_insights',
    description: 'Get AI-generated coaching insights from work patterns.',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'Days to analyze (default: 30)' } },
    },
  },
  {
    name: 'brain_decision_review',
    description: 'Record a follow-up review of a past decision.',
    inputSchema: {
      type: 'object',
      properties: {
        decision_id: { type: 'string', description: 'The decision UUID to review' },
        review_type: { type: 'string' },
        outcome_rating: { type: 'number', description: 'Rating (1-5)' },
        outcome_notes: { type: 'string' },
        lessons_learned: { type: 'string' },
        would_decide_same: { type: 'boolean' },
        follow_up_days: { type: 'number' },
      },
      required: ['decision_id'],
    },
  },
  {
    name: 'brain_decision_accuracy',
    description: 'Get decision accuracy analytics.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to analyze (default: 90)' },
        project_id: { type: 'string' },
      },
    },
  },
  {
    name: 'brain_cost_per_outcome',
    description: 'Get cost-effectiveness analytics.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to analyze (default: 30)' },
        project_id: { type: 'string' },
      },
    },
  },
  {
    name: 'brain_prompt_quality',
    description: 'Get prompt quality statistics.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to analyze (default: 30)' },
        project_id: { type: 'string' },
      },
    },
  },
  {
    name: 'brain_learning_curve',
    description: 'Get learning curve metrics over time.',
    inputSchema: {
      type: 'object',
      properties: {
        weeks: { type: 'number', description: 'Weeks to analyze (default: 12)' },
        project_id: { type: 'string' },
      },
    },
  },
  {
    name: 'brain_score_session',
    description: 'Score a session using transparent rubrics.',
    inputSchema: {
      type: 'object',
      properties: {
        goals: { type: 'array', items: { type: 'string' } },
        accomplishments: { type: 'array', items: { type: 'string' } },
        blockers: { type: 'array', items: { type: 'string' } },
        mood_start: { type: 'string' },
        mood_end: { type: 'string' },
        duration_minutes: { type: 'number' },
        thought_count: { type: 'number' },
        decision_count: { type: 'number' },
        insight_count: { type: 'number' },
        error_count: { type: 'number' },
        success_rate: { type: 'number' },
      },
    },
  },
  {
    name: 'brain_decision_templates',
    description: 'List or get decision templates.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: "Template type (e.g., 'architecture', 'library')" },
      },
    },
  },
]

// ═══════════════════════════════════════════════════════════════════
// Tool Handler
// ═══════════════════════════════════════════════════════════════════

async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  env: Env,
  user: McpUser
): Promise<unknown> {
  const db = env.DB
  const userId = user.id

  switch (name) {
    // ── Thoughts ──
    case 'brain_thought': {
      const thought = await q.createThought(db, userId, {
        type: (args.type as string) || 'note',
        content: args.content as string,
        tags: (args.tags as string[]) || [],
        context: (args.context as Record<string, unknown>) || {},
      })
      return { success: true, thought }
    }

    // ── Decisions ──
    case 'brain_decide': {
      const decision = await q.createDecision(db, userId, {
        title: args.title as string,
        context: (args.context as string) || undefined,
        options: args.options as any,
        chosen: args.chosen as string,
        rationale: (args.rationale as string) || undefined,
        outcome: args.outcome as string | undefined,
        tags: (args.tags as string[]) || [],
      })
      return { success: true, decision }
    }

    case 'brain_update': {
      const decisionId = args.decision_id as string
      const updates: { outcome?: string; tags?: string[] } = {}

      if (args.outcome) updates.outcome = args.outcome as string

      if (args.tags && Array.isArray(args.tags)) {
        const existing = await q.listDecisions(db, userId, { ids: [decisionId], withJoins: false })
        if (existing.length > 0) {
          const existingTags = q.parseTags(existing[0].tags)
          updates.tags = [...new Set([...existingTags, ...(args.tags as string[])])]
        }
      }

      if (Object.keys(updates).length === 0) {
        return { success: false, error: 'No updates provided' }
      }

      await q.updateDecision(db, userId, decisionId, updates)
      return { success: true }
    }

    // ── Search ──
    case 'brain_search': {
      const results = await q.searchBrain(db, userId, args.query as string, (args.limit as number) || 20)
      return { results, search_type: 'keyword' }
    }

    case 'brain_recall': {
      const query = args.query as string
      const limit = (args.limit as number) || 10
      const includeDetails = args.include_details !== false

      const searchResults = await q.searchBrain(db, userId, query, limit)

      if (!searchResults.length) {
        return { query, found: 0, message: `No memories found for "${query}".`, memories: [] }
      }

      const thoughtIds = searchResults.filter(r => r.type === 'thought').map(r => r.id)
      const decisionIds = searchResults.filter(r => r.type === 'decision').map(r => r.id)

      let thoughts: q.ThoughtRow[] = []
      let decisions: q.DecisionRow[] = []

      if (includeDetails) {
        if (thoughtIds.length) thoughts = await q.listThoughts(db, userId, { withJoins: false }) // TODO: filter by ids
        if (decisionIds.length) decisions = await q.listDecisions(db, userId, { ids: decisionIds, withJoins: false })
      }

      const memories = searchResults.map(result => {
        if (result.type === 'decision') {
          const full = decisions.find(d => d.id === result.id)
          return full ? {
            type: 'decision', date: formatDate(full.created_at),
            summary: `DECISION: ${full.title}`,
            details: { context: full.context, chosen: full.chosen, rationale: full.rationale, tags: q.parseTags(full.tags) },
          } : {
            type: 'decision', date: formatDate(result.created_at), summary: `DECISION: ${result.content}`,
          }
        }
        return { type: 'thought', date: formatDate(result.created_at), summary: result.content }
      })

      const formatted = memories.map((m, i) => {
        const lines = [`${i + 1}. [${m.type.toUpperCase()}] ${m.date}`, `   ${m.summary}`]
        if ('details' in m && m.details) {
          const d = m.details as any
          if (d.chosen) lines.push(`   -> Chose: ${d.chosen}`)
          if (d.rationale) lines.push(`   -> Why: ${d.rationale}`)
          if (d.tags?.length) lines.push(`   Tags: ${d.tags.join(', ')}`)
        }
        return lines.join('\n')
      }).join('\n\n')

      return { query, found: memories.length, search_type: 'keyword', formatted, memories }
    }

    // ── Timeline ──
    case 'brain_timeline': {
      const days = (args.days as number) || 7
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - days)
      const results = await q.getTimeline(db, userId, fromDate.toISOString(), new Date().toISOString(), (args.limit as number) || 50)
      return { entries: results }
    }

    // ── Sessions ──
    case 'brain_session_start': {
      const session = await q.createSession(db, userId, {
        mood_start: args.mood as string,
        goals: (args.goals as string[]) || [],
        metadata: { started_by: 'claude-session' },
      })

      // Best-effort context injection
      let relatedContext: Record<string, unknown> = {}
      try {
        const [recentDecisions, recentBlockers] = await Promise.all([
          q.listDecisions(db, userId, { limit: 5, withJoins: false }),
          q.listThoughts(db, userId, { type: 'todo', tagsContain: ['blocker'], limit: 3, withJoins: false }),
        ])
        if (recentDecisions.length) {
          relatedContext.recent_decisions = recentDecisions.map(d => ({
            title: d.title, chosen: d.chosen, created_at: d.created_at,
          }))
        }
        if (recentBlockers.length) {
          relatedContext.recent_blockers = recentBlockers.map(b => ({
            content: b.content, created_at: b.created_at,
          }))
        }
      } catch { /* best-effort */ }

      return {
        success: true,
        message: 'Session started. Remember to call brain_session_end with this session_id when done.',
        session_id: session.id,
        session,
        ...(Object.keys(relatedContext).length > 0 && { context: relatedContext }),
      }
    }

    case 'brain_session_end': {
      const sessionId = args.session_id as string
      let durationMinutes: number | undefined

      try {
        const existing = await q.getSession(db, userId, sessionId)
        if (existing?.started_at) {
          durationMinutes = Math.round((Date.now() - new Date(existing.started_at).getTime()) / 60000)
        }
      } catch { /* continue without duration */ }

      const session = await q.updateSession(db, userId, sessionId, {
        ended_at: new Date().toISOString(),
        mood_end: args.mood as string,
        accomplishments: (args.accomplishments as string[]) || [],
        blockers: (args.blockers as string[]) || [],
        summary: args.summary as string,
        metadata: { duration_minutes: durationMinutes, ended_by: 'claude-session' },
      })

      return {
        success: true,
        message: `Session ended. Duration: ${durationMinutes ?? 'unknown'} minutes.`,
        session, duration_minutes: durationMinutes,
      }
    }

    // ── Sentiment ──
    case 'brain_sentiment': {
      const sentiment = await q.createSentiment(db, userId, {
        target_type: args.target_type as string,
        target_name: args.target_name as string,
        feeling: args.feeling as string,
        intensity: (args.intensity as number) || 3,
        reason: args.reason as string,
      })
      return { success: true, sentiment }
    }

    // ── DX ──
    case 'brain_dx_event': {
      const event = await q.createDxEvent(db, userId, {
        event_type: args.event_type as string,
        command: args.command as string,
        duration_ms: args.duration_ms as number,
        tokens_in: args.tokens_in as number,
        tokens_out: args.tokens_out as number,
        success: args.success as boolean,
        error_message: args.error_message as string,
      })
      return { success: true, event }
    }

    case 'brain_dx_summary': {
      const days = (args.days as number) || 30
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - days)
      const summary = await q.getDxSummary(db, userId, fromDate.toISOString().split('T')[0], new Date().toISOString().split('T')[0])
      return { summary }
    }

    // ── Delete ──
    case 'brain_delete': {
      const entryType = args.type as string
      const id = args.id as string
      if (entryType === 'thought') await q.deleteThought(db, userId, id)
      else await q.deleteDecision(db, userId, id)
      return { success: true, deleted: { type: entryType, id } }
    }

    // ── Log Commit ──
    case 'brain_log_commit': {
      const hash = args.hash as string
      const message = args.message as string
      const filesChanged = (args.files_changed as string[]) || []
      const lines = [`## Git Commit \`${hash.substring(0, 7)}\``, '', `**${message}**`, '']
      if (args.author) lines.push(`**Author:** ${args.author}`)
      if (args.branch) lines.push(`**Branch:** \`${args.branch}\``)
      const additions = args.additions as number | undefined
      const deletions = args.deletions as number | undefined
      if (additions !== undefined || deletions !== undefined) {
        const stats: string[] = []
        if (additions !== undefined) stats.push(`+${additions}`)
        if (deletions !== undefined) stats.push(`-${deletions}`)
        lines.push(`**Changes:** ${stats.join(' / ')}`)
      }
      if (filesChanged.length) {
        lines.push('', '**Files changed:**')
        filesChanged.forEach(f => lines.push(`- \`${f}\``))
      }
      const tags = ['git', 'commit']
      if (args.project) tags.push(args.project as string)

      const thought = await q.createThought(db, userId, {
        type: 'note', content: lines.join('\n'), tags,
        context: { commit_hash: hash, files_changed: filesChanged, additions, deletions, author: args.author, branch: args.branch },
      })
      return { success: true, thought }
    }

    // ── Suggest Decision ──
    case 'brain_suggest_decision': {
      const context = args.context as string
      const optionsMentioned = (args.options_mentioned as string[]) || []
      const decisionType = (args.decision_type as string) || 'other'
      const urgency = (args.urgency as string) || 'medium'

      let relatedDecisions: Array<{ title: string; chosen: string }> = []
      try {
        const searchResults = await q.searchBrain(db, userId, context, 3)
        const decIds = searchResults.filter(r => r.type === 'decision').map(r => r.id)
        if (decIds.length) {
          const decs = await q.listDecisions(db, userId, { ids: decIds, withJoins: false })
          relatedDecisions = decs.map(d => ({ title: d.title, chosen: d.chosen || '' }))
        }
      } catch { /* search failed */ }

      const hasMultipleOptions = optionsMentioned.length >= 2
      const isSignificant = ['architecture', 'library', 'pattern'].includes(decisionType)
      const shouldRecord = hasMultipleOptions || isSignificant || urgency === 'high'
      const typeLabel = decisionType.charAt(0).toUpperCase() + decisionType.slice(1)

      let prompt: string
      if (shouldRecord) {
        const optionsStr = optionsMentioned.length > 0 ? `You're considering: ${optionsMentioned.join(', ')}.` : ''
        prompt = `This looks like an important ${typeLabel.toLowerCase()} decision. ${optionsStr}\n\nWould you like me to record this decision in your brain?`
        if (relatedDecisions.length) {
          prompt += `\n\nRelated past decisions:`
          relatedDecisions.forEach(d => { prompt += `\n- "${d.title}" -> chose ${d.chosen}` })
        }
      } else {
        prompt = `I noticed you're working on: ${context}. If this involves choosing between options, let me know and I can help record the decision.`
      }

      return {
        should_prompt: shouldRecord, urgency, decision_type: decisionType,
        options_detected: optionsMentioned, related_decisions: relatedDecisions, prompt,
        suggested_title: hasMultipleOptions ? `Choose ${decisionType}: ${optionsMentioned.slice(0, 2).join(' vs ')}` : null,
      }
    }

    // ── Summarize ──
    case 'brain_summarize': {
      const period = args.period as string
      const { fromDate, toDate, periodLabel } = parsePeriod(period)

      let projectId: string | null = null
      if (args.project) {
        const projects = await q.listProjects(db)
        const found = projects.find(p => p.name === args.project)
        if (found) projectId = found.id
      }

      const result = await q.getBrainSummary(db, userId, fromDate.toISOString(), toDate.toISOString(), projectId)

      const lines = [`## Brain Summary: ${periodLabel}`, '', '### Activity Overview']
      lines.push(`- **${result.stats.total_thoughts}** thoughts recorded`)
      lines.push(`- **${result.stats.total_decisions}** decisions made`)
      lines.push(`- **${result.stats.total_sessions}** work sessions`)
      lines.push(`- **${result.stats.active_days}** active days`)
      if (result.stats.total_session_minutes > 0) {
        const hours = Math.floor(result.stats.total_session_minutes / 60)
        const mins = result.stats.total_session_minutes % 60
        lines.push(`- **${hours}h ${mins}m** total session time`)
      }
      lines.push('')

      if (result.themes.length) {
        lines.push('### Key Themes')
        result.themes.slice(0, 5).forEach(t => lines.push(`- **#${t.tag}** (${t.cnt} mentions)`))
        lines.push('')
      }
      if (result.decisions.length) {
        lines.push('### Major Decisions')
        result.decisions.slice(0, 5).forEach(d => {
          lines.push(`- **${d.title}** (${d.date})`)
          lines.push(`  - Chose: ${d.chosen}`)
          if (d.rationale) lines.push(`  - Why: ${d.rationale}`)
        })
        lines.push('')
      }
      if (result.insights.length) {
        lines.push('### Insights')
        result.insights.slice(0, 5).forEach(i => lines.push(`- ${i.content} (${i.date})`))
        lines.push('')
      }
      if (result.accomplishments.length) {
        lines.push('### Accomplishments')
        result.accomplishments.slice(0, 5).forEach(a => lines.push(`- ${a.content} (${a.date})`))
        lines.push('')
      }
      if (result.blockers.length) {
        lines.push('### Blockers')
        result.blockers.slice(0, 3).forEach(b => lines.push(`- ${b.content} (${b.date})`))
      }

      return {
        period: periodLabel,
        date_range: { from: fromDate.toISOString(), to: toDate.toISOString() },
        ...result,
        formatted_summary: lines.join('\n'),
      }
    }

    // ── Daily Digest ──
    case 'brain_daily_digest': {
      const force = (args.force as boolean) || false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()
      const dateTag = today.toISOString().split('T')[0]

      if (!force) {
        const existing = await q.listThoughts(db, userId, {
          type: 'insight', tagsContain: ['daily-digest', dateTag], limit: 1, withJoins: false,
        })
        if (existing.length > 0) {
          const ctx = q.parseJson<Record<string, unknown>>(existing[0].context)
          const lastUpdate = ctx?.last_updated || ctx?.generated_at
          if (lastUpdate && new Date(lastUpdate as string) > new Date(Date.now() - 3600000)) {
            return { success: true, message: 'Digest is recent (< 1 hour old). Use force=true to regenerate.', digest: existing[0] }
          }
        }
      }

      const [thoughts, decisions, sessions] = await Promise.all([
        q.listThoughts(db, userId, { createdAfter: todayISO, orderDir: 'asc', withJoins: false }),
        q.listDecisions(db, userId, { createdAfter: todayISO, withJoins: false }),
        q.listSessions(db, userId, { startedAfter: todayISO }),
      ])

      const stats = { thoughts: thoughts.length, decisions: decisions.length, sessions: sessions.length }
      let summary: string

      if (stats.thoughts + stats.decisions + stats.sessions === 0) {
        summary = 'No activity recorded today yet.'
      } else {
        const thoughtsText = thoughts.map(t => `- [${t.type}] ${t.content}`).join('\n')
        const decisionsText = decisions.map(d => `- ${d.title}: chose "${d.chosen}"`).join('\n')
        const prompt = `You are summarizing a developer's daily activity. Write a brief, friendly daily digest (2-3 paragraphs max).\n\nToday's Activity:\nTHOUGHTS (${stats.thoughts}): ${thoughtsText || 'None'}\nDECISIONS (${stats.decisions}): ${decisionsText || 'None'}\nSESSIONS (${stats.sessions})\n\nWrite a concise summary. Start with "Here's what you worked on today:"`
        summary = await generateWithAI(env, prompt) || `Today: ${stats.thoughts} thoughts, ${stats.decisions} decisions, ${stats.sessions} sessions.`
      }

      const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      const content = `## Daily Digest - ${formattedDate}\n\n${summary.trim()}\n\n---\n*${stats.thoughts} thoughts, ${stats.decisions} decisions, ${stats.sessions} sessions*`

      // Upsert
      const existing = await q.listThoughts(db, userId, { type: 'insight', tagsContain: ['daily-digest', dateTag], limit: 1, withJoins: false })
      if (existing.length > 0) {
        await q.updateThought(db, userId, existing[0].id, { content, context: { stats, last_updated: new Date().toISOString() } })
        return { success: true, message: `Digest updated for ${dateTag}`, digest_id: existing[0].id, stats }
      }

      const created = await q.createThought(db, userId, {
        type: 'insight', content, tags: ['daily-digest', dateTag, 'auto-generated'],
        context: { stats, generated_at: new Date().toISOString() },
      })
      return { success: true, message: `Digest created for ${dateTag}`, digest_id: created.id, stats }
    }

    // ── Daily Coaching ──
    case 'brain_daily_coaching': {
      const force = (args.force as boolean) || false
      const days = (args.days as number) || 7
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dateTag = today.toISOString().split('T')[0]

      if (!force) {
        const existing = await q.listThoughts(db, userId, {
          type: 'insight', tagsContain: ['daily-coaching', dateTag], limit: 1, withJoins: false,
        })
        if (existing.length > 0) {
          const ctx = q.parseJson<Record<string, unknown>>(existing[0].context)
          const lastUpdate = ctx?.last_updated || ctx?.generated_at
          if (lastUpdate && new Date(lastUpdate as string) > new Date(Date.now() - 3600000)) {
            return { success: true, message: 'Coaching is recent (< 1 hour old). Use force=true to regenerate.', coaching: existing[0] }
          }
        }
      }

      const coachingData = await q.getCoachingDailyData(db, userId, days)

      const prompt = `You are a personal AI development coach. Based on the data below, provide specific, actionable coaching across 5 dimensions. Be direct and reference actual numbers.\n\nDATA FROM LAST ${days} DAYS:\n${JSON.stringify(coachingData, null, 2)}\n\nProvide coaching in this format:\n## Productivity & Goals\n[2-3 sentences]\n## Decision Making\n[2-3 sentences]\n## AI Collaboration\n[2-3 sentences]\n## Wellbeing & Flow\n[2-3 sentences]\n## Growth Trajectory\n[2-3 sentences]\n\nEnd with one sentence of encouragement.`

      let coaching = await generateWithAI(env, prompt)
      if (!coaching) {
        const s = coachingData.sessions as any
        const t = coachingData.thoughts as any
        coaching = `## Coaching Data\nSessions: ${s?.total ?? 0}, Thoughts: ${t?.total ?? 0}. AI generation unavailable.`
      }

      const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      const content = `## Daily Coaching - ${formattedDate}\n\n${coaching.trim()}\n\n---\n*Analyzed ${days} days*`

      const stats = {
        sessions: (coachingData.sessions as any)?.total ?? 0,
        thoughts: (coachingData.thoughts as any)?.total ?? 0,
        decisions: (coachingData.decisions as any)?.total ?? 0,
        period_days: days,
      }

      const existing = await q.listThoughts(db, userId, { type: 'insight', tagsContain: ['daily-coaching', dateTag], limit: 1, withJoins: false })
      if (existing.length > 0) {
        await q.updateThought(db, userId, existing[0].id, {
          content, context: { stats, coaching_data: coachingData, last_updated: new Date().toISOString() },
        })
        return { success: true, message: `Coaching updated for ${dateTag}`, coaching_id: existing[0].id, stats }
      }

      const created = await q.createThought(db, userId, {
        type: 'insight', content, tags: ['daily-coaching', dateTag, 'auto-generated'],
        context: { stats, coaching_data: coachingData, generated_at: new Date().toISOString() },
      })
      return { success: true, message: `Coaching created for ${dateTag}`, coaching_id: created.id, stats }
    }

    // ── Handoffs ──
    case 'brain_handoff': {
      const toProject = args.to_project as string
      const message = args.message as string
      const handoffType = (args.handoff_type as string) || 'context'
      const priority = (args.priority as string) || 'medium'
      const metadata = (args.metadata as Record<string, unknown>) || {}
      const handoffId = Date.now().toString(36) + Math.random().toString(36).substr(2, 4)

      const content = `HANDOFF [${handoffId}] to ${toProject}\n\n${message}\n\n---\nType: ${handoffType}\nPriority: ${priority}`
      const tags = ['handoff', `handoff-to:${toProject}`, `handoff-id:${handoffId}`, `handoff-type:${handoffType}`, `handoff-priority:${priority}`, 'pending']

      const thought = await q.createThought(db, userId, {
        type: 'todo', content, tags,
        context: { handoff_id: handoffId, to_project: toProject, handoff_type: handoffType, priority, ...metadata },
      })
      return { success: true, handoff_id: handoffId, to_project: toProject, thought }
    }

    case 'brain_handoffs': {
      const targetProject = args.project as string | undefined
      const includeClaimed = (args.include_claimed as boolean) || false

      const tagsContain = ['handoff']
      if (targetProject) tagsContain.push(`handoff-to:${targetProject}`)
      if (!includeClaimed) tagsContain.push('pending')

      const handoffs = await q.listThoughts(db, userId, { type: 'todo', tagsContain, limit: 50, withJoins: false })

      const parsed = handoffs.map(h => {
        const ctx = q.parseJson<Record<string, unknown>>(h.context) || {}
        const tags = q.parseTags(h.tags)
        return {
          id: h.id,
          handoff_id: ctx.handoff_id || tags.find(t => t.startsWith('handoff-id:'))?.split(':')[1],
          to_project: ctx.to_project || tags.find(t => t.startsWith('handoff-to:'))?.split(':')[1],
          type: ctx.handoff_type || tags.find(t => t.startsWith('handoff-type:'))?.split(':')[1],
          priority: ctx.priority || tags.find(t => t.startsWith('handoff-priority:'))?.split(':')[1],
          message: h.content,
          claimed: !tags.includes('pending'),
          created_at: h.created_at,
        }
      })
      return { success: true, count: parsed.length, handoffs: parsed }
    }

    case 'brain_handoff_claim': {
      const handoffId = args.handoff_id as string
      const note = args.note as string | undefined

      const handoffs = await q.listThoughts(db, userId, {
        type: 'todo', tagsContain: ['handoff', `handoff-id:${handoffId}`], limit: 1, withJoins: false,
      })
      if (!handoffs.length) return { success: false, error: `Handoff not found: ${handoffId}` }

      const handoff = handoffs[0]
      const existingTags = q.parseTags(handoff.tags)
      const newTags = existingTags.filter(t => t !== 'pending').concat(['claimed', `claimed-at:${new Date().toISOString().split('T')[0]}`])
      const existingCtx = q.parseJson<Record<string, unknown>>(handoff.context) || {}

      await q.updateThought(db, userId, handoff.id, {
        tags: newTags,
        context: { ...existingCtx, claimed_at: new Date().toISOString(), claim_note: note },
      })
      return { success: true, message: `Handoff ${handoffId} claimed`, handoff_id: handoffId }
    }

    // ── Conversation ──
    case 'brain_conversation': {
      const result = await q.createConversation(db, userId, {
        session_id: args.session_id as string,
        prompt_text: args.prompt_text as string,
        response_summary: args.response_summary as string,
        turns: (args.turns as number) || 1,
        prompt_tokens: args.prompt_tokens as number,
        response_tokens: args.response_tokens as number,
        goal_achieved: args.goal_achieved as boolean,
        context_sufficient: args.context_sufficient as boolean,
        quality_score: args.quality_score as number,
        tags: (args.tags as string[]) || [],
        metadata: (args.metadata as Record<string, unknown>) || {},
      })
      return { success: true, conversation: result }
    }

    // ── Coaching Insights ──
    case 'brain_coaching_insights': {
      const days = (args.days as number) || 30
      const fromDate = new Date(Date.now() - days * 86400000).toISOString()
      const toDate = new Date().toISOString()

      const dbInsights = await q.getCoachingDailyData(db, userId, days)

      let coachingAdvice: string | null = null
      try {
        const prompt = `You are an AI coaching assistant. Based on this data, provide 3-5 specific, actionable coaching tips.\n\nData:\n${JSON.stringify(dbInsights, null, 2)}\n\nFormat: 1. [Observation] -> [Suggestion]`
        coachingAdvice = await generateWithAI(env, prompt)
      } catch { /* AI unavailable */ }

      return { success: true, insights: dbInsights, coaching_advice: coachingAdvice, period_days: days }
    }

    // ── Decision Review ──
    case 'brain_decision_review': {
      const review = await q.createDecisionReview(db, userId, {
        decision_id: args.decision_id as string,
        review_type: (args.review_type as string) || 'follow_up',
        outcome_rating: args.outcome_rating as number,
        outcome_notes: args.outcome_notes as string,
        lessons_learned: args.lessons_learned as string,
        would_decide_same: args.would_decide_same as boolean,
        follow_up_days: args.follow_up_days as number,
      })
      return { success: true, review }
    }

    // ── Analytics RPCs ──
    case 'brain_decision_accuracy': {
      const days = (args.days as number) || 90
      const fromDate = new Date(Date.now() - days * 86400000).toISOString()
      const toDate = new Date().toISOString()
      const { results } = await db.prepare(
        `SELECT COUNT(*) as total_reviews, AVG(outcome_rating) as avg_rating,
         SUM(CASE WHEN would_decide_same THEN 1 ELSE 0 END) as would_repeat
         FROM decision_reviews WHERE user_id = ? AND created_at BETWEEN ? AND ?`
      ).bind(userId, fromDate, toDate).all()
      return { success: true, accuracy: results[0] || {}, period_days: days }
    }

    case 'brain_cost_per_outcome': {
      const days = (args.days as number) || 30
      const fromDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
      const toDate = new Date().toISOString().split('T')[0]
      const { results } = await db.prepare(
        `SELECT model, SUM(cost_usd) as total_cost, SUM(request_count) as total_requests,
         SUM(tokens_in) as total_tokens_in, SUM(tokens_out) as total_tokens_out
         FROM dx_costs WHERE user_id = ? AND date BETWEEN date(?) AND date(?)
         GROUP BY model ORDER BY total_cost DESC`
      ).bind(userId, fromDate, toDate).all()
      return { success: true, costs: results, period_days: days }
    }

    case 'brain_prompt_quality': {
      const days = (args.days as number) || 30
      const fromDate = new Date(Date.now() - days * 86400000).toISOString()
      const toDate = new Date().toISOString()
      const result = await db.prepare(
        `SELECT COUNT(*) as total, AVG(quality_score) as avg_quality,
         AVG(CASE WHEN goal_achieved THEN 1.0 ELSE 0.0 END) as goal_rate,
         AVG(CASE WHEN context_sufficient THEN 1.0 ELSE 0.0 END) as context_rate,
         AVG(turns) as avg_turns
         FROM conversations WHERE user_id = ? AND created_at BETWEEN ? AND ?`
      ).bind(userId, fromDate, toDate).first()
      return { success: true, quality: result || {}, period_days: days }
    }

    case 'brain_learning_curve': {
      const weeks = (args.weeks as number) || 12
      const { results } = await db.prepare(
        `SELECT strftime('%Y-W%W', created_at) as week,
         COUNT(*) as total_conversations, AVG(quality_score) as avg_quality,
         AVG(CASE WHEN goal_achieved THEN 1.0 ELSE 0.0 END) as goal_rate
         FROM conversations WHERE user_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY week ORDER BY week`
      ).bind(userId, weeks * 7).all()
      return { success: true, learning_curve: results, weeks }
    }

    // ── Score Session ──
    case 'brain_score_session': {
      const result = scoreSession({
        goals: args.goals as string[],
        accomplishments: args.accomplishments as string[],
        blockers: args.blockers as string[],
        moodStart: args.mood_start as string,
        moodEnd: args.mood_end as string,
        durationMinutes: args.duration_minutes as number,
        thoughtCount: args.thought_count as number,
        decisionCount: args.decision_count as number,
        insightCount: args.insight_count as number,
        errorCount: args.error_count as number,
        successRate: args.success_rate as number,
      })
      return { success: true, scores: result }
    }

    // ── Decision Templates ──
    case 'brain_decision_templates': {
      const type = args.type as string
      if (type) {
        const template = getDecisionTemplate(type)
        return { success: true, template, message: template ? `Template for ${type}` : `No template for: ${type}` }
      }
      return { success: true, templates: listDecisionTemplates() }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ═══════════════════════════════════════════════════════════════════
// JSON-RPC Protocol Handler
// ═══════════════════════════════════════════════════════════════════

async function handleJsonRpc(
  req: JsonRpcRequest,
  env: Env,
  user: McpUser
): Promise<JsonRpcResponse | null> {
  const isNotification = req.id === undefined

  switch (req.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'brain-mcp', version: '1.0.0' },
        },
        id: req.id!,
      }

    case 'notifications/initialized':
      return null

    case 'tools/list':
      return { jsonrpc: '2.0', result: { tools: TOOLS }, id: req.id! }

    case 'tools/call': {
      const params = req.params as { name: string; arguments?: Record<string, unknown> }
      try {
        const result = await handleToolCall(params.name, params.arguments || {}, env, user)
        return {
          jsonrpc: '2.0',
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
          id: req.id!,
        }
      } catch (error) {
        return {
          jsonrpc: '2.0',
          result: {
            content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          },
          id: req.id!,
        }
      }
    }

    case 'ping':
      return { jsonrpc: '2.0', result: {}, id: req.id! }

    default:
      if (isNotification) return null
      return {
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${req.method}` },
        id: req.id ?? null,
      }
  }
}

// ═══════════════════════════════════════════════════════════════════
// Hono Handler Export
// ═══════════════════════════════════════════════════════════════════

export async function mcpHandler(c: Context<{ Bindings: Env; Variables: Variables }>) {
  // Only POST for stateless MCP
  if (c.req.method !== 'POST') {
    return c.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'Use POST for MCP requests' }, id: null },
      405,
      { Allow: 'POST' }
    )
  }

  // Auth via X-API-Key (hash-based lookup with legacy fallback)
  const apiKey = c.req.header('X-API-Key')
  if (!apiKey) {
    return c.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'Missing X-API-Key header' }, id: null },
      401
    )
  }

  const { hashToken } = await import('../auth/jwt')
  const keyHash = await hashToken(apiKey)
  let user = await q.findUserByKeyHash(c.env.DB, keyHash)
  if (!user) {
    // Legacy plaintext fallback
    user = await q.findUserByApiKey(c.env.DB, apiKey)
  }
  if (!user) {
    return c.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'Invalid API key' }, id: null },
      401
    )
  }

  const body = await c.req.json()

  // Handle batch requests
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map(req => handleJsonRpc(req as JsonRpcRequest, c.env, { id: user.id, name: user.name }))
    )
    const filtered = responses.filter((r): r is JsonRpcResponse => r !== null)
    if (filtered.length === 0) return c.body(null, 204)
    return c.json(filtered)
  }

  const response = await handleJsonRpc(body as JsonRpcRequest, c.env, { id: user.id, name: user.name })
  if (response === null) return c.body(null, 204)
  return c.json(response)
}
