export interface DocSection {
  id: string;
  title: string;
  content: string;
}

export interface DocCategory {
  title: string;
  sections: DocSection[];
}

export const docs: DocCategory[] = [
  {
    title: "Getting Started",
    sections: [
      {
        id: "overview",
        title: "Overview",
        content: `Brain Cloud is a **persistent memory layer for AI coding assistants**. It captures your thoughts, decisions, and work patterns across Claude Code and Claude Desktop sessions — so your AI remembers what you've done, why you made decisions, and what you've learned.

## How It Works

Brain Cloud runs as an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server. Your AI assistant calls Brain Cloud tools during conversations to store and retrieve context.

\`\`\`mermaid
graph LR
    A[Claude Code / Desktop] -->|MCP Protocol| B[Brain Cloud API]
    B --> C[Cloudflare D1 Database]
    B --> D[AI Coaching Engine]
    D --> E[Insights & Digests]
\`\`\`

## What It Captures

- **Thoughts** — Ideas, notes, questions, insights, and TODOs
- **Decisions** — Choices you made, options you considered, and why
- **Sessions** — Work session lifecycle with goals, accomplishments, and blockers
- **DX Events** — Command execution, tool usage, errors, and performance
- **Conversations** — Prompt quality and context sufficiency tracking
- **Git Commits** — Commit metadata linked to your brain timeline
- **Handoffs** — Context passed between projects

## Key Features

- **Search & Recall** — Full-text search and natural language recall across all entries
- **AI Coaching** — Daily digests, coaching insights, and decision accuracy tracking
- **Cross-Project Handoffs** — Pass context between different repositories
- **Team Collaboration** — Share brains with teammates
- **Analytics** — DX metrics, learning curves, and cost-per-outcome analysis`,
      },
      {
        id: "installation",
        title: "Installation",
        content: `## Claude Code Setup

Add Brain Cloud to your Claude Code MCP configuration:

\`\`\`json
// ~/.claude/mcp.json
{
  "mcpServers": {
    "brain": {
      "type": "url",
      "url": "https://brain.steig.workers.dev/sse",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
\`\`\`

## Claude Desktop Setup

Add to your Claude Desktop configuration:

\`\`\`json
// ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
// %APPDATA%/Claude/claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "brain": {
      "type": "url",
      "url": "https://brain.steig.workers.dev/sse",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
\`\`\`

## CLAUDE.md Directives

Add these directives to your \`CLAUDE.md\` to guide Claude on when and how to use Brain Cloud:

\`\`\`markdown
## Brain MCP

### Session Lifecycle
- brain_session_start() - First message of conversation
- brain_session_end() + suggest "/clear" - When task complete or topic switch

### brain_thought - BE SELECTIVE
**LOG these (high value):**
- \\\`insight\\\` - Non-obvious codebase patterns or gotchas
- \\\`todo\\\` - Work identified but deferred (include WHY)
- \\\`blocker\\\` - Stuck, needs external input

**SKIP these (noise):**
- "Starting to look at X" - No value
- "Reading file Y" - No value
- Routine progress updates

### brain_decide - Log when choosing between approaches
Only when you actually considered alternatives.

### Tags
#todo #tech-debt #blocker #idea #learned + project/feature tags
\`\`\`

## Getting Your API Key

1. Sign up at [brain.steig.cloud](https://brain.steig.cloud)
2. Go to **Settings → API Keys**
3. Create a new key with appropriate permissions
4. Add it to your MCP configuration`,
      },
      {
        id: "quickstart",
        title: "Quickstart",
        content: `## Your First Session

Once configured, Brain Cloud tools are automatically available to Claude. Here's a typical first session:

### 1. Start a Session

Claude calls \`brain_session_start\` at the beginning of your conversation:

\`\`\`json
{
  "mood": "focused",
  "goals": ["Set up authentication for the API"],
  "project": "my-app"
}
\`\`\`

This returns a \`session_id\` and any recent context from previous sessions.

### 2. Record Decisions

When you make an architectural choice, Claude logs it:

\`\`\`json
{
  "title": "Auth strategy for API",
  "chosen": "JWT with refresh tokens",
  "rationale": "Stateless auth fits our serverless architecture. Refresh tokens handle expiry gracefully.",
  "options": [
    { "option": "JWT with refresh tokens", "pros": ["Stateless", "Scalable"], "cons": ["Token revocation complexity"] },
    { "option": "Session cookies", "pros": ["Simple"], "cons": ["Requires session store"] }
  ],
  "project": "my-app"
}
\`\`\`

### 3. Capture Insights

When Claude discovers something non-obvious about your codebase:

\`\`\`json
{
  "content": "Auth middleware at src/middleware/auth.ts:23 skips token validation for /health endpoints — intentional for load balancer checks",
  "type": "insight",
  "tags": ["auth", "middleware"],
  "project": "my-app"
}
\`\`\`

### 4. End the Session

\`\`\`json
{
  "session_id": "abc-123",
  "mood": "productive",
  "accomplishments": ["Implemented JWT auth with refresh tokens", "Added auth middleware"],
  "summary": "Set up full auth system with JWT + refresh tokens, middleware for route protection"
}
\`\`\`

### 5. Next Session — Context Restored

When you start your next session, \`brain_session_start\` returns your recent decisions, thoughts, and blockers — so Claude picks up where you left off.`,
      },
    ],
  },
  {
    title: "Tools Reference",
    sections: [
      {
        id: "capture-tools",
        title: "Capture",
        content: `Tools for recording thoughts, decisions, and session lifecycle.

### brain_thought

Record a thought, idea, or note. Automatically captures user, machine, and project context.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`content\` | string | Yes | The thought or note content |
| \`type\` | enum | No | \`note\`, \`idea\`, \`question\`, \`todo\`, \`insight\` (default: \`note\`) |
| \`tags\` | string[] | No | Tags for categorization |
| \`context\` | object | No | Additional context (file, line, function) |
| \`project\` | string | No | Project name (git repo or directory) |

\`\`\`json
{
  "content": "Rate limiter at src/middleware/rate-limit.ts uses sliding window — 100 req/min per API key",
  "type": "insight",
  "tags": ["rate-limiting", "api"],
  "project": "brain-cloud"
}
\`\`\`

---

### brain_decide

Record a decision with context, options considered, and rationale.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`title\` | string | Yes | Short title for the decision |
| \`chosen\` | string | Yes | Which option was chosen |
| \`rationale\` | string | Yes | Why this option was chosen |
| \`context\` | string | No | What led to needing this decision |
| \`options\` | object[] | No | Options considered (each with \`option\`, \`pros[]\`, \`cons[]\`) |
| \`tags\` | string[] | No | Tags for categorization |
| \`outcome\` | string | No | What happened as a result |
| \`project\` | string | No | Project name |

\`\`\`json
{
  "title": "Database for user preferences",
  "chosen": "Cloudflare D1",
  "rationale": "Already on Workers, zero network hop, SQLite dialect works for our schema",
  "options": [
    { "option": "D1", "pros": ["Zero latency", "Built-in"], "cons": ["Beta"] },
    { "option": "Turso", "pros": ["Mature"], "cons": ["Extra hop"] }
  ],
  "project": "brain-cloud"
}
\`\`\`

---

### brain_update

Update a decision's outcome or tags after the fact.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`decision_id\` | string | Yes | The decision UUID to update |
| \`outcome\` | string | No | What happened as a result |
| \`tags\` | string[] | No | Additional tags to merge |

\`\`\`json
{
  "decision_id": "abc-123",
  "outcome": "D1 worked great, no issues after 2 months in production"
}
\`\`\`

---

### brain_session_start

Start a work session. Returns a \`session_id\` and recent project context.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`mood\` | string | No | Starting mood (e.g., \`focused\`, \`exploratory\`, \`debugging\`) |
| \`goals\` | string[] | No | What you want to accomplish |
| \`project\` | string | No | Project name |
| \`repo_url\` | string | No | Git remote URL |

\`\`\`json
{
  "mood": "focused",
  "goals": ["Fix auth token refresh bug", "Add rate limiting"],
  "project": "brain-cloud",
  "repo_url": "https://github.com/user/brain-cloud"
}
\`\`\`

---

### brain_session_end

End the current work session with a summary.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`session_id\` | string | Yes | Session ID from \`brain_session_start\` |
| \`mood\` | string | No | Ending mood (e.g., \`productive\`, \`blocked\`) |
| \`accomplishments\` | string[] | No | What was accomplished |
| \`blockers\` | string[] | No | Any blockers encountered |
| \`summary\` | string | No | Brief session summary |

\`\`\`json
{
  "session_id": "abc-123",
  "mood": "productive",
  "accomplishments": ["Fixed token refresh race condition", "Added sliding window rate limiter"],
  "summary": "Resolved auth bug and added rate limiting. Rate limiter uses D1 for counter storage."
}
\`\`\``,
      },
      {
        id: "search-tools",
        title: "Search & Recall",
        content: `Tools for finding and retrieving past context.

### brain_search

Full-text search across thoughts and decisions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`query\` | string | Yes | Search query |
| \`limit\` | number | No | Max results (default: 20) |

\`\`\`json
{
  "query": "rate limiting middleware",
  "limit": 5
}
\`\`\`

---

### brain_recall

Natural language recall — "What did I decide about X?"

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`query\` | string | Yes | Natural language query |
| \`limit\` | number | No | Max results (default: 10) |
| \`include_details\` | boolean | No | Include full decision details (default: true) |

\`\`\`json
{
  "query": "What database did we choose for user preferences and why?",
  "include_details": true
}
\`\`\`

---

### brain_timeline

Chronological view of recent brain entries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | How many days back (default: 7) |
| \`limit\` | number | No | Max results (default: 50) |

\`\`\`json
{
  "days": 3,
  "limit": 20
}
\`\`\``,
      },
      {
        id: "analytics-tools",
        title: "Analytics",
        content: `Tools for tracking developer experience metrics.

### brain_dx_event

Log a DX event — command execution, tool use, errors, etc.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`event_type\` | enum | Yes | \`command\`, \`tool_use\`, \`completion\`, \`error\` |
| \`command\` | string | No | Command or tool name |
| \`duration_ms\` | number | No | Duration in milliseconds |
| \`tokens_in\` | number | No | Input tokens used |
| \`tokens_out\` | number | No | Output tokens generated |
| \`success\` | boolean | No | Whether it succeeded |
| \`error_message\` | string | No | Error message if failed |
| \`project\` | string | No | Project name |

\`\`\`json
{
  "event_type": "command",
  "command": "pnpm build",
  "duration_ms": 4523,
  "success": true,
  "project": "brain-cloud"
}
\`\`\`

---

### brain_dx_summary

Get DX analytics summary for a time period.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days to summarize (default: 30) |

\`\`\`json
{ "days": 7 }
\`\`\`

---

### brain_sentiment

Record how you feel about a tool, library, pattern, etc.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`target_type\` | enum | Yes | \`tool\`, \`library\`, \`pattern\`, \`codebase\`, \`task\`, \`process\` |
| \`target_name\` | string | Yes | Name of the thing |
| \`feeling\` | enum | Yes | \`frustrated\`, \`confused\`, \`satisfied\`, \`excited\`, \`neutral\`, \`annoyed\`, \`impressed\` |
| \`intensity\` | number | No | Intensity 1-5 |
| \`reason\` | string | No | Why you feel this way |
| \`project\` | string | No | Project name |

\`\`\`json
{
  "target_type": "library",
  "target_name": "react-hook-form",
  "feeling": "impressed",
  "intensity": 4,
  "reason": "Validation composability is excellent, zod integration just works"
}
\`\`\`

---

### brain_score_session

Score a session using transparent rubrics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`goals\` | string[] | No | Session goals |
| \`accomplishments\` | string[] | No | What was accomplished |
| \`blockers\` | string[] | No | Blockers encountered |
| \`mood_start\` | string | No | Starting mood |
| \`mood_end\` | string | No | Ending mood |
| \`duration_minutes\` | number | No | Session duration |
| \`thought_count\` | number | No | Thoughts recorded |
| \`decision_count\` | number | No | Decisions recorded |
| \`insight_count\` | number | No | Insights recorded |
| \`error_count\` | number | No | Errors encountered |
| \`success_rate\` | number | No | Success rate percentage |

\`\`\`json
{
  "goals": ["Fix auth bug", "Add rate limiting"],
  "accomplishments": ["Fixed auth bug", "Added rate limiter"],
  "mood_start": "focused",
  "mood_end": "productive",
  "duration_minutes": 45,
  "decision_count": 1,
  "insight_count": 2
}
\`\`\``,
      },
      {
        id: "coaching-tools",
        title: "AI Coaching",
        content: `AI-powered insights and coaching from your work patterns.

### brain_summarize

Generate a summary of brain activity for a time period.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`period\` | string | Yes | Time period: \`this week\`, \`last week\`, \`this month\`, or number of days |
| \`project\` | string | No | Filter to a specific project |

\`\`\`json
{
  "period": "this week",
  "project": "brain-cloud"
}
\`\`\`

---

### brain_daily_digest

Generate today's daily digest using AI. Summarizes your activity, key decisions, and patterns.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`force\` | boolean | No | Force regeneration (default: false) |

\`\`\`json
{ "force": false }
\`\`\`

---

### brain_daily_coaching

Generate daily AI coaching across 5 dimensions: productivity, decision quality, learning, collaboration, and well-being.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`force\` | boolean | No | Force regeneration (default: false) |
| \`days\` | number | No | Days to analyze (default: 7) |

\`\`\`json
{ "days": 7 }
\`\`\`

---

### brain_coaching_insights

Get AI-generated coaching insights from work patterns.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days to analyze (default: 30) |

\`\`\`json
{ "days": 14 }
\`\`\``,
      },
      {
        id: "decision-tools",
        title: "Decisions",
        content: `Tools for decision lifecycle management — templates, reviews, and accuracy tracking.

### brain_suggest_decision

Analyze context to suggest if a decision should be recorded.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`context\` | string | Yes | What you're working on |
| \`options_mentioned\` | string[] | No | Options being considered |
| \`decision_type\` | enum | No | \`architecture\`, \`library\`, \`pattern\`, \`tooling\`, \`process\`, \`other\` |
| \`urgency\` | enum | No | \`low\`, \`medium\`, \`high\` |

\`\`\`json
{
  "context": "Choosing between Zustand and Redux for state management",
  "options_mentioned": ["Zustand", "Redux", "Jotai"],
  "decision_type": "library",
  "urgency": "medium"
}
\`\`\`

---

### brain_decision_review

Record a follow-up review of a past decision.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`decision_id\` | string | Yes | The decision UUID |
| \`outcome_rating\` | number | No | Rating 1-5 |
| \`outcome_notes\` | string | No | Notes about the outcome |
| \`lessons_learned\` | string | No | What was learned |
| \`would_decide_same\` | boolean | No | Would you decide the same? |
| \`review_type\` | string | No | Type of review |
| \`follow_up_days\` | number | No | Days since original decision |

\`\`\`json
{
  "decision_id": "abc-123",
  "outcome_rating": 4,
  "outcome_notes": "D1 has been solid, no issues in 2 months",
  "lessons_learned": "Beta risk was acceptable for our scale",
  "would_decide_same": true
}
\`\`\`

---

### brain_decision_templates

List or get decision templates for common decision types.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`type\` | string | No | Template type (e.g., \`architecture\`, \`library\`) |

\`\`\`json
{ "type": "architecture" }
\`\`\`

---

### brain_decision_accuracy

Get decision accuracy analytics — how well your decisions have played out.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days to analyze (default: 90) |
| \`project_id\` | string | No | Filter by project |

\`\`\`json
{ "days": 90 }
\`\`\``,
      },
      {
        id: "collaboration-tools",
        title: "Collaboration",
        content: `Tools for cross-project context sharing.

### brain_handoff

Create a handoff to pass context to another project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`to_project\` | string | Yes | Target project name |
| \`message\` | string | Yes | The handoff message |
| \`handoff_type\` | enum | No | \`context\`, \`decision\`, \`blocker\`, \`task\` |
| \`priority\` | enum | No | \`low\`, \`medium\`, \`high\`, \`urgent\` |
| \`metadata\` | object | No | Additional metadata |

\`\`\`json
{
  "to_project": "frontend-app",
  "message": "API now requires Bearer token in Authorization header. See brain_decide 'Auth strategy' for details.",
  "handoff_type": "context",
  "priority": "high"
}
\`\`\`

---

### brain_handoffs

List pending handoffs for a project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`project\` | string | No | Project name to check |
| \`include_claimed\` | boolean | No | Include already-claimed handoffs (default: false) |

\`\`\`json
{ "project": "frontend-app" }
\`\`\`

---

### brain_handoff_claim

Claim a handoff to mark it as received.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`handoff_id\` | string | Yes | The handoff ID to claim |
| \`note\` | string | No | Optional note |

\`\`\`json
{
  "handoff_id": "handoff-456",
  "note": "Received, updating API client to include auth header"
}
\`\`\``,
      },
      {
        id: "integration-tools",
        title: "Integrations",
        content: `Tools for connecting Brain Cloud with external systems.

### brain_log_commit

Log a Git commit to the brain as a thought entry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`hash\` | string | Yes | The commit hash |
| \`message\` | string | Yes | The commit message |
| \`files_changed\` | string[] | No | List of files changed |
| \`additions\` | number | No | Lines added |
| \`deletions\` | number | No | Lines deleted |
| \`author\` | string | No | Commit author |
| \`branch\` | string | No | Branch name |
| \`project\` | string | No | Project name |

\`\`\`json
{
  "hash": "a2e146c",
  "message": "feat: add project tracking to Brain MCP write tools",
  "files_changed": ["src/tools/thought.ts", "src/tools/decide.ts"],
  "additions": 245,
  "deletions": 38,
  "author": "steig",
  "branch": "main",
  "project": "brain-cloud"
}
\`\`\`

---

### brain_conversation

Record an AI conversation/prompt interaction for quality tracking.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`prompt_text\` | string | Yes | The prompt text |
| \`response_summary\` | string | No | Summary of the AI response |
| \`turns\` | number | No | Number of turns (default: 1) |
| \`prompt_tokens\` | number | No | Input tokens used |
| \`response_tokens\` | number | No | Output tokens generated |
| \`goal_achieved\` | boolean | No | Whether the goal was achieved |
| \`context_sufficient\` | boolean | No | Whether context was sufficient |
| \`quality_score\` | number | No | Quality score 1-5 |
| \`session_id\` | string | No | Associated session ID |
| \`tags\` | string[] | No | Tags |
| \`metadata\` | object | No | Additional metadata |
| \`project\` | string | No | Project name |

\`\`\`json
{
  "prompt_text": "Fix the race condition in token refresh",
  "response_summary": "Identified race in concurrent refresh calls, added mutex lock",
  "goal_achieved": true,
  "quality_score": 5,
  "session_id": "abc-123",
  "project": "brain-cloud"
}
\`\`\``,
      },
      {
        id: "cost-tools",
        title: "Cost & Quality",
        content: `Tools for analyzing AI usage costs and prompt effectiveness.

### brain_cost_per_outcome

Get cost-effectiveness analytics — token spend vs. outcomes achieved.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days to analyze (default: 30) |
| \`project_id\` | string | No | Filter by project |

\`\`\`json
{ "days": 30 }
\`\`\`

---

### brain_prompt_quality

Get prompt quality statistics — how well your prompts perform.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days to analyze (default: 30) |
| \`project_id\` | string | No | Filter by project |

\`\`\`json
{ "days": 14 }
\`\`\`

---

### brain_learning_curve

Get learning curve metrics over time — track improvement in AI-assisted development.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`weeks\` | number | No | Weeks to analyze (default: 12) |
| \`project_id\` | string | No | Filter by project |

\`\`\`json
{ "weeks": 8 }
\`\`\``,
      },
      {
        id: "system-tools",
        title: "System",
        content: `Utility tools for managing brain entries and client updates.

### brain_delete

Delete a thought or decision by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`type\` | enum | Yes | \`thought\` or \`decision\` |
| \`id\` | string | Yes | UUID of the entry to delete |

\`\`\`json
{
  "type": "thought",
  "id": "abc-123-def-456"
}
\`\`\`

---

### brain_check_update

Check for client config updates. Returns the latest config if your version is outdated.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`client_version\` | string | Yes | Current client config version |

\`\`\`json
{ "client_version": "1.1.0" }
\`\`\``,
      },
    ],
  },
  {
    title: "Workflows",
    sections: [
      {
        id: "workflow-sessions",
        title: "Session Lifecycle",
        content: `Sessions are the core workflow unit in Brain Cloud. Each coding session has a clear lifecycle:

\`\`\`mermaid
graph TD
    A[brain_session_start] -->|Returns context| B[Active Session]
    B --> C[Record thoughts & decisions]
    C --> D[brain_session_end]
    D -->|Summary stored| E[Next session gets context]
    E --> A
\`\`\`

## Best Practices

1. **Start every conversation** with \`brain_session_start\` — it returns your recent context so Claude knows what you've been working on
2. **Set goals** so the session can be scored later
3. **Include project name** for project-scoped context
4. **End sessions** with accomplishments and a summary — this feeds into the next session's context
5. **Score sessions** with \`brain_score_session\` to track productivity over time

## CLAUDE.md Integration

Add these directives to ensure Claude follows the session lifecycle:

\`\`\`markdown
- FIRST MESSAGE: Call brain_session_start() before doing anything else
- SESSION END: Call brain_session_end() then suggest "clear session?"
\`\`\``,
      },
      {
        id: "workflow-decisions",
        title: "Decision Tracking",
        content: `Brain Cloud's decision tracking creates an audit trail of your technical choices.

## Decision Lifecycle

\`\`\`mermaid
graph LR
    A[brain_suggest_decision] -->|Should I record?| B[brain_decide]
    B -->|Time passes| C[brain_decision_review]
    C --> D[brain_decision_accuracy]
    D -->|Patterns| E[Better future decisions]
\`\`\`

## When to Record Decisions

Use \`brain_suggest_decision\` when you're weighing options. Record with \`brain_decide\` when:

- Choosing between **libraries or frameworks**
- Making **architectural decisions** (database, auth strategy, API design)
- Picking **patterns** (state management, error handling, testing approach)
- Deciding on **tooling** (CI/CD, deployment, monitoring)
- Making **process choices** (branching strategy, code review, release cadence)

## Reviewing Decisions

Come back after weeks or months with \`brain_decision_review\`:

- **Rate the outcome** (1-5) — did it work out?
- **Record lessons learned** — what would you do differently?
- **Track if you'd decide the same** — builds calibration over time

## Decision Templates

Use \`brain_decision_templates\` to get structured templates for common decision types. Templates include suggested fields and evaluation criteria.`,
      },
      {
        id: "workflow-handoffs",
        title: "Cross-Project Handoffs",
        content: `Handoffs let you pass context between projects — like leaving a note for yourself (or a teammate) in a different repo.

## Common Use Cases

- **API changes** — Tell the frontend project about new endpoints or auth requirements
- **Shared library updates** — Notify downstream projects about breaking changes
- **Blockers** — Flag that project B is blocked waiting on project A
- **Context transfer** — Moving from backend to frontend work, carry the context

## Workflow

\`\`\`mermaid
sequenceDiagram
    participant A as Project A
    participant B as Brain Cloud
    participant C as Project B
    A->>B: brain_handoff(to: "project-b", message: "API now requires auth")
    Note over B: Handoff stored
    C->>B: brain_session_start(project: "project-b")
    B-->>C: Returns pending handoffs
    C->>B: brain_handoff_claim(id, note: "Updating API client")
\`\`\`

## Priority Levels

- **low** — FYI, no action needed soon
- **medium** — Should address in next session
- **high** — Important, address soon
- **urgent** — Blocking work, needs immediate attention`,
      },
      {
        id: "workflow-analytics",
        title: "DX Analytics",
        content: `Track your developer experience metrics to understand and improve your AI-assisted workflow.

## What Gets Tracked

- **Commands** — Build times, test runs, deployments
- **Tool usage** — Which Brain tools you use most
- **Errors** — Failure rates and common error patterns
- **Token usage** — Input/output token consumption per session
- **Session quality** — Goal completion rates and mood tracking

## Analytics Tools

| Tool | What it shows |
|------|---------------|
| \`brain_dx_summary\` | Aggregate DX metrics for a time period |
| \`brain_cost_per_outcome\` | Token spend vs. goals achieved |
| \`brain_prompt_quality\` | How effective your prompts are |
| \`brain_learning_curve\` | Improvement over time |
| \`brain_score_session\` | Per-session productivity scoring |

## Getting Insights

Use \`brain_coaching_insights\` for AI-generated analysis of your patterns:

- When you're most productive
- Which types of tasks take longest
- Common blockers and how to avoid them
- Decision quality trends

Use \`brain_daily_digest\` for a daily summary and \`brain_daily_coaching\` for personalized coaching across five dimensions: productivity, decision quality, learning, collaboration, and well-being.`,
      },
    ],
  },
];
