/**
 * MCP Streamable HTTP endpoint.
 * Uses @modelcontextprotocol/sdk Server class for protocol handling.
 * All tool handlers call db/queries.ts directly (no HTTP round-trip).
 */

import type { Context } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import { parsePeriod, formatDate } from './utils'
import { scoreSession } from './scoring'
import { getDecisionTemplate, listDecisionTemplates } from './templates'
import { vectorSearch } from '../db/vectorize'
import { trackAiUsage, type AiOperation } from '../ai-costs'
import { Server } from '@modelcontextprotocol/sdk/server'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import * as Sentry from '@sentry/cloudflare'

export const SERVER_VERSION = '1.8.0'

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface McpUser {
  id: string
  name: string
}

// ═══════════════════════════════════════════════════════════════════
// Workers AI helper
// ═══════════════════════════════════════════════════════════════════

async function generateWithAI(
  env: Env,
  prompt: string,
  tracking?: { db: D1Database; userId: string; operation: AiOperation },
): Promise<string> {
  if (!env.AI) return ''
  try {
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    })
    const response = (result as any)?.response || ''
    if (response && tracking) {
      trackAiUsage(tracking.db, {
        userId: tracking.userId,
        operation: tracking.operation,
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(response.length / 4),
        model: '@cf/meta/llama-3.1-8b-instruct',
      }).catch((err) => console.error('AI usage tracking failed:', err))
    }
    return response
  } catch (error) {
    console.error('AI generation failed:', error)
    return ''
  }
}

// ═══════════════════════════════════════════════════════════════════
// Project Resolution
// ═══════════════════════════════════════════════════════════════════

async function resolveProjectId(db: D1Database, projectName?: string, repoUrl?: string): Promise<string | null> {
  if (!projectName) return null
  return q.upsertProject(db, projectName, repoUrl)
}

// ═══════════════════════════════════════════════════════════════════
// Config Bundle (for brain_check_update)
// ═══════════════════════════════════════════════════════════════════

function getConfigBundle(frontendUrl: string) {
  const base = frontendUrl.replace(/\/+$/, '')
  return {
  mcp_json: {
    mcpServers: {
      brain: {
        type: 'streamable-http',
        url: `${base}/mcp`,
        headers: {
          'X-API-Key': '{{BRAIN_API_KEY}}',
        },
      },
    },
  },
  claude_md_directives: `## Brain MCP
<brain_version>${SERVER_VERSION}</brain_version>

### Project Detection
Every brain MCP call MUST include \`project\` parameter.
Detect once at session start: \`basename $(git rev-parse --show-toplevel 2>/dev/null)\` or directory name.
For brain_session_start, also pass \`repo_url\` from \`git remote get-url origin 2>/dev/null\`.

### Auto-Update
On brain_session_start, call brain_check_update with client_version from <brain_version> tag.
If update_available, apply the config changes automatically (write .mcp.json, update CLAUDE.md directives).`,
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
        project: { type: 'string', description: 'Project name (git repo name or directory)' },
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
        project: { type: 'string', description: 'Project name (git repo name or directory)' },
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
        project: { type: 'string', description: 'Project name (git repo name or directory)' },
        repo_url: { type: 'string', description: 'Git remote URL' },
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
        project: { type: 'string', description: 'Project name (git repo name or directory)' },
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
        project: { type: 'string', description: 'Project name (git repo name or directory)' },
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
        project: { type: 'string', description: 'Project name (git repo name or directory)' },
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
  {
    name: 'brain_check_update',
    description: 'Check for config updates. Returns latest client config if outdated.',
    inputSchema: {
      type: 'object',
      properties: {
        client_version: { type: 'string', description: 'Current client config version' },
      },
      required: ['client_version'],
    },
  },
  {
    name: 'brain_stale_decisions',
    description: 'Find decisions that have never been accessed and may need review.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Minimum age in days to consider stale (default: 90)' },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
    },
  },
  {
    name: 'brain_remind',
    description: 'Create a reminder for a future date.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'What to be reminded about' },
        due_in: { type: 'string', description: "Relative time: '2d' (2 days), '1w' (1 week), '3h' (3 hours)" },
        due_at: { type: 'string', description: 'Absolute ISO 8601 date/time' },
        project: { type: 'string', description: 'Project name' },
      },
      required: ['content'],
    },
  },
  {
    name: 'brain_reminders',
    description: 'List reminders, optionally filtered by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'completed', 'dismissed'], description: 'Filter by status (default: pending)' },
        limit: { type: 'number', description: 'Max results (default: 50)' },
      },
    },
  },
  {
    name: 'brain_complete_reminder',
    description: 'Mark a reminder as completed.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Reminder ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'brain_delete_reminder',
    description: 'Permanently delete a reminder.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Reminder ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'brain_digest',
    description: 'Generate a weekly digest summarizing brain activity.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days to cover (default: 7)' },
      },
    },
  },
  {
    name: 'brain_memory_health',
    description: 'Show memory strength distribution and fading memories. Memories decay naturally over time — frequently accessed ones are stronger. Distribution buckets are fixed (strong >0.7, moderate 0.3-0.7, fading 0.1-0.3, dormant <=0.1). The threshold parameter controls which memories appear in the fading_memories detail list.',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: 'Show memories below this strength in fading_memories list (default: 0.3). Does not affect distribution buckets.' },
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
      const projectId = await resolveProjectId(db, args.project as string)
      const thought = await q.createThought(db, userId, {
        type: (args.type as string) || 'note',
        content: args.content as string,
        tags: (args.tags as string[]) || [],
        context: (args.context as Record<string, unknown>) || {},
        project_id: projectId,
      })
      return { success: true, thought }
    }

    // ── Decisions ──
    case 'brain_decide': {
      const projectId = await resolveProjectId(db, args.project as string)
      const decision = await q.createDecision(db, userId, {
        title: args.title as string,
        context: (args.context as string) || undefined,
        options: args.options as any,
        chosen: args.chosen as string,
        rationale: (args.rationale as string) || undefined,
        outcome: args.outcome as string | undefined,
        tags: (args.tags as string[]) || [],
        project_id: projectId,
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
      const query = args.query as string
      const limit = (args.limit as number) || 20

      // FTS (keyword) search
      const ftsResults = await q.searchBrain(db, userId, query, limit)
      const ftsIds = new Set(ftsResults.map(r => r.id))

      // Vector (semantic) search
      const vectorResults = await vectorSearch(env, query, userId, { limit })
      const vectorMap = new Map(vectorResults.map(r => [r.id, r.score]))

      // Annotate FTS results with match_type
      const annotatedFts = ftsResults.map(r => ({
        ...r,
        match_type: vectorMap.has(r.id) ? 'both' as const : 'keyword' as const,
      }))

      // Fetch full records for vector-only results
      const vectorOnlyIds = vectorResults.filter(r => !ftsIds.has(r.id)).map(r => r.id)
      let semanticResults: Array<{ id: string; type: string; content: string; created_at: string; match_type: 'semantic' }> = []

      if (vectorOnlyIds.length) {
        // Query D1 for vector-only IDs (thoughts + decisions)
        const placeholders = vectorOnlyIds.map(() => '?').join(',')
        const [thoughts, decisions] = await Promise.all([
          db.prepare(
            `SELECT id, 'thought' as type, content, created_at FROM thoughts
             WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL`
          ).bind(...vectorOnlyIds, userId).all(),
          db.prepare(
            `SELECT id, 'decision' as type, title as content, created_at FROM decisions
             WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL`
          ).bind(...vectorOnlyIds, userId).all(),
        ])
        const combined = [...thoughts.results, ...decisions.results] as Array<{ id: string; type: string; content: string; created_at: string }>
        // Sort by vector score (higher first)
        combined.sort((a, b) => (vectorMap.get(b.id) ?? 0) - (vectorMap.get(a.id) ?? 0))
        semanticResults = combined.map(r => ({ ...r, match_type: 'semantic' as const }))
      }

      let results = [...annotatedFts, ...semanticResults].slice(0, limit)

      // Strength-weighted re-ranking (#136)
      const allIds = results.map(r => r.id)
      const strengthMap = await q.getStrengthMap(db, allIds, {
        thoughtIds: results.filter(r => r.type === 'thought').map(r => r.id),
        decisionIds: results.filter(r => r.type === 'decision').map(r => r.id),
      })
      results = results.map(r => ({
        ...r,
        strength: Math.round((strengthMap.get(r.id) ?? 1.0) * 100) / 100,
      }))
      // FTS-only results get base score 0.5 (no vector score available)
      results.sort((a, b) => {
        const scoreA = (vectorMap.get(a.id) ?? 0.5) * (strengthMap.get(a.id) ?? 1.0)
        const scoreB = (vectorMap.get(b.id) ?? 0.5) * (strengthMap.get(b.id) ?? 1.0)
        return scoreB - scoreA
      })

      // Fire-and-forget access tracking (#134)
      const thoughtAccessIds = results.filter(r => r.type === 'thought').map(r => r.id)
      const decisionAccessIds = results.filter(r => r.type === 'decision').map(r => r.id)
      if (thoughtAccessIds.length) q.incrementAccessCount(db, 'thought', thoughtAccessIds).catch(() => {})
      if (decisionAccessIds.length) q.incrementAccessCount(db, 'decision', decisionAccessIds).catch(() => {})

      return { results, search_type: vectorResults.length ? 'hybrid' : 'keyword' }
    }

    case 'brain_recall': {
      const query = args.query as string
      const limit = (args.limit as number) || 10
      const includeDetails = args.include_details !== false

      // Hybrid search: FTS + vector
      const ftsResults = await q.searchBrain(db, userId, query, limit)
      const ftsIds = new Set(ftsResults.map(r => r.id))

      const vectorResults = await vectorSearch(env, query, userId, { limit })
      const vectorMap = new Map(vectorResults.map(r => [r.id, r.score]))

      // Fetch vector-only results from D1
      const vectorOnlyIds = vectorResults.filter(r => !ftsIds.has(r.id)).map(r => r.id)
      let vectorOnlyRecords: Array<{ id: string; type: string; content: string; created_at: string }> = []

      if (vectorOnlyIds.length) {
        const placeholders = vectorOnlyIds.map(() => '?').join(',')
        const [thoughts, decisions] = await Promise.all([
          db.prepare(
            `SELECT id, 'thought' as type, content, created_at FROM thoughts
             WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL`
          ).bind(...vectorOnlyIds, userId).all(),
          db.prepare(
            `SELECT id, 'decision' as type, title as content, created_at FROM decisions
             WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL`
          ).bind(...vectorOnlyIds, userId).all(),
        ])
        vectorOnlyRecords = [...thoughts.results, ...decisions.results] as typeof vectorOnlyRecords
        vectorOnlyRecords.sort((a, b) => (vectorMap.get(b.id) ?? 0) - (vectorMap.get(a.id) ?? 0))
      }

      let searchResults = [...ftsResults, ...vectorOnlyRecords].slice(0, limit)

      if (!searchResults.length) {
        return { query, found: 0, message: `No memories found for "${query}".`, memories: [] }
      }

      // Strength-weighted re-ranking (#136)
      const recallStrengthMap = await q.getStrengthMap(db, searchResults.map(r => r.id), {
        thoughtIds: searchResults.filter(r => r.type === 'thought').map(r => r.id),
        decisionIds: searchResults.filter(r => r.type === 'decision').map(r => r.id),
      })
      searchResults.sort((a, b) => {
        const scoreA = (vectorMap.get(a.id) ?? 0.5) * (recallStrengthMap.get(a.id) ?? 1.0)
        const scoreB = (vectorMap.get(b.id) ?? 0.5) * (recallStrengthMap.get(b.id) ?? 1.0)
        return scoreB - scoreA
      })

      const thoughtIds = searchResults.filter(r => r.type === 'thought').map(r => r.id)
      const decisionIds = searchResults.filter(r => r.type === 'decision').map(r => r.id)

      let thoughts: q.ThoughtRow[] = []
      let decisions: q.DecisionRow[] = []

      if (includeDetails) {
        if (thoughtIds.length) thoughts = await q.listThoughts(db, userId, { withJoins: false }) // TODO: filter by ids
        if (decisionIds.length) decisions = await q.listDecisions(db, userId, { ids: decisionIds, withJoins: false })
      }

      const memories = searchResults.map(result => {
        const matchType = ftsIds.has(result.id)
          ? (vectorMap.has(result.id) ? 'both' : 'keyword')
          : 'semantic'

        const strength = Math.round((recallStrengthMap.get(result.id) ?? 1.0) * 100) / 100

        if (result.type === 'decision') {
          const full = decisions.find(d => d.id === result.id)
          return full ? {
            type: 'decision', date: formatDate(full.created_at),
            summary: `DECISION: ${full.title}`, match_type: matchType, strength,
            details: { context: full.context, chosen: full.chosen, rationale: full.rationale, tags: q.parseTags(full.tags) },
          } : {
            type: 'decision', date: formatDate(result.created_at), summary: `DECISION: ${result.content}`, match_type: matchType, strength,
          }
        }
        return { type: 'thought', date: formatDate(result.created_at), summary: result.content, match_type: matchType, strength }
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

      // Fire-and-forget access tracking (#134)
      const recallThoughtIds = searchResults.filter(r => r.type === 'thought').map(r => r.id)
      const recallDecisionIds = searchResults.filter(r => r.type === 'decision').map(r => r.id)
      if (recallThoughtIds.length) q.incrementAccessCount(db, 'thought', recallThoughtIds).catch(() => {})
      if (recallDecisionIds.length) q.incrementAccessCount(db, 'decision', recallDecisionIds).catch(() => {})

      const searchType = vectorResults.length ? 'hybrid' : 'keyword'
      return { query, found: memories.length, search_type: searchType, formatted, memories }
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
      const projectId = await resolveProjectId(db, args.project as string, args.repo_url as string)
      const session = await q.createSession(db, userId, {
        mood_start: args.mood as string,
        goals: (args.goals as string[]) || [],
        metadata: { started_by: 'claude-session' },
        project_id: projectId,
      })

      // Best-effort context injection — project-scoped when available
      let relatedContext: Record<string, unknown> = {}
      try {
        const scopeOpts = projectId ? { projectId } : {}
        const [recentDecisions, recentThoughts, recentBlockers, lastSession] = await Promise.all([
          q.listDecisions(db, userId, { ...scopeOpts, limit: 5, withJoins: false }),
          q.listThoughts(db, userId, { ...scopeOpts, limit: 5, withJoins: false }),
          q.listThoughts(db, userId, { ...scopeOpts, type: 'todo', tagsContain: ['blocker'], limit: 3, withJoins: false }),
          q.listSessions(db, userId, { ...scopeOpts, limit: 1 }),
        ])
        if (recentDecisions.length) {
          relatedContext.recent_decisions = recentDecisions.map(d => ({
            title: d.title, chosen: d.chosen, rationale: d.rationale, created_at: d.created_at,
          }))
        }
        if (recentThoughts.length) {
          relatedContext.recent_thoughts = recentThoughts.map(t => ({
            type: t.type, content: t.content, created_at: t.created_at,
          }))
        }
        if (recentBlockers.length) {
          relatedContext.recent_blockers = recentBlockers.map(b => ({
            content: b.content, created_at: b.created_at,
          }))
        }
        if (lastSession.length && lastSession[0].id !== session.id) {
          const ls = lastSession[0]
          relatedContext.last_session = {
            summary: ls.summary, accomplishments: ls.accomplishments,
            mood_end: ls.mood_end, ended_at: ls.ended_at,
          }
        }
        // Due reminders (#133/#135)
        const dueReminders = await q.getDueReminders(db, userId)
        if (dueReminders.length) {
          relatedContext.due_reminders = dueReminders.map(r => ({
            id: r.id, content: r.content, due_at: r.due_at,
          }))
        }

        // Stale decisions count (#133/#134)
        const staleDecisions = await q.getStaleDecisions(db, userId, 90, 1)
        if (staleDecisions.length) {
          const staleCount = await q.getStaleDecisions(db, userId, 90, 100)
          relatedContext.stale_decisions_count = staleCount.length
          relatedContext.stale_decisions_message = `You have ${staleCount.length} decision(s) that haven't been reviewed in 90+ days. Use brain_stale_decisions to see them.`
        }

        // Fading memories alert (#136)
        const fadingCount = await q.countFadingMemories(db, userId)
        if (fadingCount > 0) {
          relatedContext.fading_memories_count = fadingCount
          relatedContext.fading_memories_message = `${fadingCount} memories are fading. Use brain_memory_health to review.`
        }

        // Pending handoffs to this project
        if (args.project) {
          const handoffs = await q.listHandoffs(db, userId, {
            toProject: args.project as string, status: 'pending', limit: 5,
          })
          if (handoffs.length) {
            relatedContext.pending_handoffs = handoffs.map(h => ({
              id: h.id, from_project: h.from_project, message: h.message,
              type: h.handoff_type, priority: h.priority, created_at: h.created_at,
            }))
          }
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
      const projectId = await resolveProjectId(db, args.project as string)
      const sentiment = await q.createSentiment(db, userId, {
        target_type: args.target_type as string,
        target_name: args.target_name as string,
        feeling: args.feeling as string,
        intensity: (args.intensity as number) || 3,
        reason: args.reason as string,
        project_id: projectId,
      })
      return { success: true, sentiment }
    }

    // ── DX ──
    case 'brain_dx_event': {
      const projectId = await resolveProjectId(db, args.project as string)
      const event = await q.createDxEvent(db, userId, {
        event_type: args.event_type as string,
        command: args.command as string,
        duration_ms: args.duration_ms as number,
        tokens_in: args.tokens_in as number,
        tokens_out: args.tokens_out as number,
        success: args.success as boolean,
        error_message: args.error_message as string,
        project_id: projectId,
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
      const projectId = await resolveProjectId(db, args.project as string)
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
        project_id: projectId,
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
        summary = await generateWithAI(env, prompt, { db, userId, operation: 'digest' }) || `Today: ${stats.thoughts} thoughts, ${stats.decisions} decisions, ${stats.sessions} sessions.`
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

      let coaching = await generateWithAI(env, prompt, { db, userId, operation: 'coaching' })
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

    // ── Handoffs (dedicated table) ──
    case 'brain_handoff': {
      const metadata = (args.metadata as Record<string, unknown>) || {}
      const handoff = await q.createHandoff(db, userId, {
        to_project: args.to_project as string,
        message: args.message as string,
        handoff_type: (args.handoff_type as string) || 'context',
        priority: (args.priority as string) || 'medium',
        from_project: (metadata.from_project as string) || undefined,
        metadata,
      })
      return { success: true, handoff_id: handoff.id, to_project: handoff.to_project, from_project: handoff.from_project }
    }

    case 'brain_handoffs': {
      const targetProject = args.project as string | undefined
      const includeClaimed = (args.include_claimed as boolean) || false

      const handoffs = await q.listHandoffs(db, userId, {
        toProject: targetProject,
        status: includeClaimed ? undefined : 'pending',
        limit: 50,
      })

      return {
        success: true,
        count: handoffs.length,
        handoffs: handoffs.map(h => ({
          id: h.id,
          handoff_id: h.id,
          to_project: h.to_project,
          from_project: h.from_project,
          type: h.handoff_type,
          priority: h.priority,
          message: h.message,
          claimed: h.status !== 'pending',
          created_at: h.created_at,
        })),
      }
    }

    case 'brain_handoff_claim': {
      const handoffId = args.handoff_id as string
      const note = args.note as string | undefined

      const claimed = await q.claimHandoff(db, userId, handoffId, note)
      if (!claimed) return { success: false, error: `Handoff not found or already claimed: ${handoffId}` }
      return { success: true, message: `Handoff ${handoffId} claimed`, handoff_id: handoffId }
    }

    // ── Conversation ──
    case 'brain_conversation': {
      const projectId = await resolveProjectId(db, args.project as string)
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
        project_id: projectId,
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
        coachingAdvice = await generateWithAI(env, prompt, { db, userId, operation: 'coaching' })
      } catch (error) { console.error('AI generation failed (coaching insights):', error) }

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

    // ── Check Update ──
    case 'brain_check_update': {
      const clientVersion = args.client_version as string
      if (clientVersion === SERVER_VERSION) {
        return { server_version: SERVER_VERSION, update_available: false }
      }
      // NOTE: Update CHANGELOG entries when bumping SERVER_VERSION
      return {
        server_version: SERVER_VERSION,
        update_available: true,
        changelog: [
          'Added project tracking to all write tools',
          'Richer project-scoped session context',
          'Auto-update system for client config',
        ],
        config: getConfigBundle(env.FRONTEND_URL || 'https://brain-ai.dev'),
        instructions: 'Update ~/.claude/.mcp.json (preserve your existing X-API-Key value) and add directives to project or global CLAUDE.md',
      }
    }

    // ── Stale Decisions (#134) ──
    case 'brain_stale_decisions': {
      const days = (args.days as number) || 90
      const limit = (args.limit as number) || 20
      const stale = await q.getStaleDecisions(db, userId, days, limit)
      return {
        count: stale.length,
        message: stale.length ? `You have ${stale.length} decision(s) that haven't been reviewed in ${days}+ days.` : 'No stale decisions found.',
        decisions: stale.map(d => ({
          id: d.id, title: d.title, chosen: d.chosen,
          created_at: d.created_at, age_days: Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000),
        })),
      }
    }

    // ── Reminders (#135) ──
    case 'brain_remind': {
      const content = args.content as string
      let dueAt: string

      if (args.due_at) {
        dueAt = new Date(args.due_at as string).toISOString()
      } else if (args.due_in) {
        const dueIn = args.due_in as string
        const match = dueIn.match(/^(\d+)([hdwm])$/)
        if (!match) throw new Error(`Invalid due_in format: "${dueIn}". Use e.g. "2d", "1w", "3h"`)
        const [, numStr, unit] = match
        const num = parseInt(numStr)
        const ms = { h: 3600000, d: 86400000, w: 604800000, m: 2592000000 }[unit]!
        dueAt = new Date(Date.now() + num * ms).toISOString()
      } else {
        // Default: 1 day from now
        dueAt = new Date(Date.now() + 86400000).toISOString()
      }

      const projectId = await resolveProjectId(db, args.project as string)
      const reminder = await q.createReminder(db, userId, { content, due_at: dueAt, project_id: projectId })
      return { success: true, reminder, message: `Reminder set for ${formatDate(dueAt)}` }
    }

    case 'brain_reminders': {
      const status = (args.status as 'pending' | 'completed' | 'dismissed') || 'pending'
      const limit = (args.limit as number) || 50
      const reminders = await q.listReminders(db, userId, { status, limit })
      return {
        count: reminders.length,
        reminders: reminders.map(r => ({
          ...r,
          is_overdue: r.completed_at === null && r.dismissed_at === null && new Date(r.due_at) < new Date(),
        })),
      }
    }

    case 'brain_complete_reminder': {
      const id = args.id as string
      const success = await q.completeReminder(db, userId, id)
      if (!success) return { success: false, error: 'Reminder not found or already completed' }
      return { success: true, message: `Reminder ${id} marked complete` }
    }

    case 'brain_delete_reminder': {
      const id = args.id as string
      const success = await q.deleteReminder(db, userId, id)
      if (!success) return { success: false, error: 'Reminder not found' }
      return { success: true, message: `Reminder ${id} deleted` }
    }

    // ── Weekly Digest (#138) ──
    case 'brain_digest': {
      const days = (args.days as number) || 7
      const toDate = new Date()
      const fromDate = new Date(toDate.getTime() - days * 86400000)
      const toISO = toDate.toISOString()
      const fromISO = fromDate.toISOString()
      const data = await q.getDigestData(db, userId, fromISO, toISO)

      let formatted = q.formatDigestText(data, fromISO, toISO)

      let aiSummary: string | null = null
      try {
        if (data.thought_count + data.decision_count > 0) {
          const prompt = `Summarize this developer's week in 2-3 sentences. Be specific and encouraging.\n\nActivity: ${data.thought_count} thoughts, ${data.decision_count} decisions, ${data.session_count} sessions over ${days} days.\nProjects: ${data.top_projects.map(p => p.name).join(', ') || 'none'}\nBlockers: ${data.unresolved_blockers.length}\nOpen TODOs: ${data.open_todos.length}`
          aiSummary = await generateWithAI(env, prompt, { db, userId, operation: 'digest' })
        }
      } catch { /* AI optional */ }

      if (aiSummary) {
        formatted += '\n\n### Summary\n' + aiSummary.trim()
      }

      return { ...data, formatted, ai_summary: aiSummary }
    }

    case 'brain_memory_health': {
      const threshold = (args.threshold as number) ?? 0.3
      const health = await q.getMemoryHealth(db, userId, threshold)
      return {
        total_memories: health.total,
        strength_distribution: health.distribution,
        fading_memories: health.fading.map(m => ({
          id: m.id, type: m.type,
          summary: m.content.slice(0, 120),
          strength: Math.round(m.strength * 100) / 100,
          created_at: m.created_at,
        })),
        potentiated_count: health.potentiated_count,
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ═══════════════════════════════════════════════════════════════════
// JSON-RPC Protocol Handler
// ═══════════════════════════════════════════════════════════════════

// Tools that only read data — safe for read-scoped API keys
const READ_ONLY_TOOLS = new Set([
  'brain_search', 'brain_recall', 'brain_timeline', 'brain_summarize',
  'brain_dx_summary', 'brain_handoffs', 'brain_coaching_insights',
  'brain_decision_accuracy', 'brain_cost_per_outcome', 'brain_prompt_quality',
  'brain_learning_curve', 'brain_score_session', 'brain_decision_templates',
  'brain_check_update', 'brain_stale_decisions', 'brain_reminders', 'brain_digest',
  'brain_memory_health',
])

/** Format a tool call result for the SDK */
function toolResult(text: string, isError?: boolean) {
  return {
    content: [{ type: 'text' as const, text }],
    ...(isError && { isError: true }),
  }
}

// ═══════════════════════════════════════════════════════════════════
// SDK Server Factory
// ═══════════════════════════════════════════════════════════════════

function createMcpServer(env: Env, user: McpUser, keyScope: 'read' | 'write' | 'admin'): Server {
  const server = new Server(
    { name: 'brain-mcp', version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  )

  // tools/list — filter tools by scope for read-only keys
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = keyScope === 'read'
      ? TOOLS.filter(t => READ_ONLY_TOOLS.has(t.name))
      : TOOLS
    return { tools }
  })

  // tools/call — scope check + Sentry tracing
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name
    const args = (request.params.arguments ?? {}) as Record<string, unknown>

    // Scope enforcement
    if (keyScope === 'read' && !READ_ONLY_TOOLS.has(toolName)) {
      return toolResult(`API key scope "read" does not allow tool "${toolName}"`, true)
    }

    return Sentry.startSpan(
      { name: `mcp.tool.${toolName}`, op: 'mcp.tool', attributes: { 'mcp.tool': toolName } },
      async () => {
        try {
          const result = await handleToolCall(toolName, args, env, user)
          return toolResult(JSON.stringify(result, null, 2))
        } catch (error) {
          Sentry.captureException(error)
          return toolResult(`Error: ${error instanceof Error ? error.message : String(error)}`, true)
        }
      },
    )
  })

  return server
}

// ═══════════════════════════════════════════════════════════════════
// Hono Handler Export
// ═══════════════════════════════════════════════════════════════════

export async function mcpHandler(c: Context<{ Bindings: Env; Variables: Variables }>) {
  // Stateless server — only POST is supported (no SSE push, no sessions)
  if (c.req.method !== 'POST') {
    return c.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'Use POST for MCP requests' }, id: null },
      405,
      { Allow: 'POST' }
    )
  }

  // Auth via X-API-Key (hashed lookup only — no plaintext fallback)
  const apiKey = c.req.header('X-API-Key')
  if (!apiKey) {
    return c.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'Missing X-API-Key header' }, id: null },
      401
    )
  }

  const { hashToken } = await import('../auth/jwt')
  const keyHash = await hashToken(apiKey)
  const user = await q.findUserByKeyHash(c.env.DB, keyHash)
  if (!user) {
    return c.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'Invalid API key' }, id: null },
      401
    )
  }

  // Check for expired key
  if ('expired' in user && user.expired) {
    return c.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'API key has expired' }, id: null },
      401
    )
  }

  const keyScope = (user.key_scope || 'read') as 'read' | 'write' | 'admin'
  const mcpUser: McpUser = { id: user.id, name: user.name }

  // Create per-request SDK server + stateless transport
  const server = createMcpServer(c.env, mcpUser, keyScope)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  })

  await server.connect(transport)

  try {
    return await transport.handleRequest(c.req.raw)
  } finally {
    // Clean up per-request server
    await server.close()
  }
}
