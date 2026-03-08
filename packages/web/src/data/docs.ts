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
    title: "Guide",
    sections: [
      {
        id: "why",
        title: "Why Brain Cloud",
        content: `Every time you start a new Claude session, your AI starts from zero. It doesn't know what you decided yesterday, what you tried and abandoned, or why the codebase looks the way it does.

Brain Cloud fixes this. It gives your AI a persistent memory — so when you start a session on Monday morning, Claude already knows:

- You chose JWT over session cookies last week (and why)
- There's an open TODO about the rate limiter you deferred on Friday
- The frontend team is waiting on your API auth changes

## Before & After

**Without Brain Cloud**, every session starts cold:

> *"I need to continue working on the auth system"*
>
> Claude: "Can you tell me about the auth system? What approach are you using? Where are the relevant files?"

**With Brain Cloud**, context is restored automatically:

> *"I need to continue working on the auth system"*
>
> Claude: "I see from your last session you implemented JWT with refresh tokens. You had a TODO about adding token revocation for compromised keys. The frontend team sent a handoff saying they need the auth header format documented. Want to start with the revocation logic or the handoff?"

## How It Works

Brain Cloud runs as an [MCP server](https://modelcontextprotocol.io) — a standard protocol that lets AI assistants use external tools. You add it to Claude Code or Claude Desktop, and Claude automatically calls Brain Cloud to store and retrieve context during conversations.

\`\`\`mermaid
flowchart LR
    A["🤖 Claude"] -- "MCP" --> B["☁️ Brain Cloud"]
    B -- "Store" --> C[("💾 Memory")]
    B -- "Analyze" --> D["📊 Insights"]
    C -- "Recall" --> A
\`\`\`

There's nothing for you to do manually — Claude handles the logging. You just work normally, and your AI gets smarter over time.`,
      },
      {
        id: "setup",
        title: "Setup",
        content: `Setup takes about 2 minutes. You need an API key and one config file.

## 1. Get Your API Key

1. Sign up at [brain.steig.cloud](https://brain.steig.cloud)
2. Go to **Settings → API Keys**
3. Create a key — copy it somewhere safe

## 2. Add to Claude Code

Create or edit \`~/.claude/mcp.json\`:

\`\`\`json
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

For **Claude Desktop**, the config file lives at:
- macOS: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
- Windows: \`%APPDATA%/Claude/claude_desktop_config.json\`

Same format — just add the \`mcpServers\` block.

## 3. Tell Claude How to Use It

Add these directives to your project's \`CLAUDE.md\` (or global \`~/.claude/CLAUDE.md\`):

\`\`\`markdown
## Brain MCP
- FIRST MESSAGE: Call brain_session_start() before doing anything else
- SESSION END: Call brain_session_end() then suggest "clear session?"
- Log decisions when choosing between approaches (brain_decide)
- Log insights when discovering non-obvious codebase patterns (brain_thought with type: insight)
- Skip routine progress updates — only log high-value context
\`\`\`

That's it. Start a new Claude conversation and you'll see it call \`brain_session_start\` automatically.`,
      },
      {
        id: "first-session",
        title: "Your First Session",
        content: `Here's what a typical session looks like once Brain Cloud is configured.

## Starting Up

You open Claude Code and say: *"Let's work on the user settings API."*

Claude calls \`brain_session_start\` behind the scenes. If you've worked on this project before, it gets back your recent context — last session's summary, open TODOs, pending handoffs from other projects. If it's your first time, it just creates a fresh session.

## During Work

As you work, Claude captures context at key moments — not every line of code, just the decisions and insights that matter.

**When you make a choice between approaches:**

> You: "Should we use Zod or Joi for validation?"
>
> *After discussing trade-offs, you pick Zod. Claude logs the decision with the options you considered and why.*

**When Claude discovers something non-obvious:**

> Claude finds that your auth middleware silently skips validation for \`/internal/*\` routes. It logs this as an insight so it's available in future sessions.

**When work gets deferred:**

> You fix the main bug but notice the error messages could be better. Claude logs a TODO with context about *why* it was deferred — "deprioritized to ship the settings API today."

## Wrapping Up

When you're done (or switching tasks), Claude calls \`brain_session_end\` with what you accomplished, any blockers, and a brief summary. This becomes the "previously on..." for your next session.

## The Compound Effect

Each session adds to your brain. After a week, Claude knows your project's architecture, your past decisions, and your preferred patterns. After a month, it can recall why you chose D1 over Turso, what the rate limiter does, and that the frontend team needs the API docs updated.

The AI stops asking you to re-explain things. It starts *anticipating* what you need.`,
      },
    ],
  },
  {
    title: "Core Concepts",
    sections: [
      {
        id: "sessions",
        title: "Sessions",
        content: `Sessions are the heartbeat of Brain Cloud. Each conversation with Claude is a session — it has a start, a body of work, and an end.

## Why Sessions Matter

Sessions give your AI a sense of *continuity*. Without them, every conversation is isolated. With them, Claude can say "last time you were debugging the webhook handler" instead of "what are you working on?"

## The Lifecycle

\`\`\`mermaid
flowchart TD
    A["▶️ Session Start"] -->|"Context restored"| B["💻 You Work"]
    B --> C["🧠 Claude Captures"]
    C --> D["⏹️ Session End"]
    D -->|"Summary saved"| E["📋 Next Session"]
    E -->|"Feeds into"| A
\`\`\`

**Start** → Claude calls \`brain_session_start\` with your project name and goals. It gets back your recent thoughts, decisions, blockers, and last session's summary.

**Work** → You code normally. Claude logs decisions and insights as they happen — you don't have to ask.

**End** → Claude calls \`brain_session_end\` with what you accomplished and a summary. This feeds into the next session.

## Tips

- **Set goals** at session start — they let you score sessions later and track what you actually get done vs. what you planned
- **Include a project name** so context is scoped — your brain-cloud sessions don't pollute your frontend-app context
- **End sessions cleanly** — the summary is the most valuable part, because it's what Claude reads first next time`,
      },
      {
        id: "decisions",
        title: "Decisions",
        content: `Every project is shaped by hundreds of small decisions — which library, which pattern, which trade-off. Most of these live in your head and evaporate within days.

Brain Cloud captures them so you can recall *why* you made a choice months later.

## What to Record

Not every choice needs recording. Focus on decisions where:

- You **considered multiple options** (Zustand vs Redux, REST vs GraphQL)
- The choice **shapes the project's architecture** (database, auth strategy, deployment)
- Future-you might ask **"why did we do it this way?"**

## The Decision Lifecycle

\`\`\`mermaid
flowchart LR
    A["⚖️ Choose"] -->|"Record"| B["📝 Decision"]
    B -->|"Review later"| C["🔍 Review"]
    C -->|"Rate outcome"| D["📈 Accuracy"]
\`\`\`

**Record** → When you choose between approaches, Claude logs the options, your choice, and your reasoning.

**Review** → Come back weeks later with \`brain_decision_review\`. Rate the outcome (1-5), note lessons learned, and whether you'd decide the same way.

**Learn** → \`brain_decision_accuracy\` shows you how your decisions play out over time. Are you good at picking databases but bad at choosing state management libraries? The data tells you.

## Example

> "We chose Cloudflare D1 over Turso because we're already on Workers and want zero network hop. The SQLite dialect works for our schema. Turso is more mature but adds an extra hop."

Six months later, you review: "D1 has been solid, no issues at our scale. The beta risk was acceptable. Would decide the same." That calibration data helps you (and Claude) make better choices next time.`,
      },
      {
        id: "handoffs",
        title: "Cross-Project Handoffs",
        content: `When you switch between projects, context gets lost. You finish the backend API, switch to the frontend, and forget that you changed the auth header format.

Handoffs are like leaving a sticky note for yourself (or a teammate) in the other project.

## How It Works

\`\`\`mermaid
sequenceDiagram
    participant BE as 🔧 Backend
    participant BC as ☁️ Brain Cloud
    participant FE as 🎨 Frontend
    BE->>BC: Handoff: "API requires Bearer token"
    Note over BC: Stored with priority
    FE->>BC: Start session
    BC-->>FE: Pending handoff from Backend
    FE->>BC: Claim handoff
\`\`\`

When you start a session in the target project, Brain Cloud surfaces any pending handoffs. No Slack message to forget, no TODO that gets lost — it's right there when Claude picks up the context.

## Common Use Cases

- **API changes** — Tell the frontend about new endpoints or auth requirements
- **Shared library updates** — Notify downstream projects about breaking changes
- **Blockers** — Flag that project B is blocked on project A
- **Context transfer** — Carry architectural decisions across repos

## Priority Levels

Handoffs have priority (\`low\`, \`medium\`, \`high\`, \`urgent\`) so Claude knows what needs attention now vs. what's just an FYI.`,
      },
      {
        id: "coaching",
        title: "AI Coaching & Analytics",
        content: `Brain Cloud doesn't just store your data — it analyzes it to help you work better.

## Daily Digest

\`brain_daily_digest\` generates a summary of your day: what you worked on, key decisions you made, and patterns it noticed. Think of it as a personal standup report written by an AI that was watching everything you did.

## Coaching Insights

\`brain_coaching_insights\` looks at your work patterns over time and provides personalized advice across five dimensions:

- **Productivity** — When are you most effective? What types of tasks take longest?
- **Decision Quality** — How well do your decisions play out? Where do you tend to overcommit?
- **Learning** — Are you getting faster at recurring tasks? What technologies are you improving in?
- **Collaboration** — How effectively do you use handoffs? Are you creating blockers for others?
- **Well-being** — Session mood trends. Are your sessions ending frustrated more often?

## DX Analytics

Track developer experience metrics to spot friction:

- **Build times, test runs, error rates** — logged via \`brain_dx_event\`
- **Token usage** — how much AI context you're consuming per session
- **Cost per outcome** — are you spending more tokens but achieving less?
- **Learning curve** — are you getting better over time?

The analytics aren't just numbers — \`brain_coaching_insights\` turns them into actionable suggestions like "Your sessions after 4pm have 40% more blockers — consider tackling complex tasks in the morning."`,
      },
    ],
  },
  {
    title: "Tools Reference",
    sections: [
      {
        id: "ref-capture",
        title: "Capture Tools",
        content: `### brain_thought
Record a thought, idea, or note with automatic context capture.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`content\` | string | Yes | The thought content |
| \`type\` | enum | No | \`note\` \`idea\` \`question\` \`todo\` \`insight\` (default: \`note\`) |
| \`tags\` | string[] | No | Tags for categorization |
| \`context\` | object | No | File, line, function context |
| \`project\` | string | No | Project name |

---

### brain_decide
Record a decision with options, rationale, and outcome.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`title\` | string | Yes | Short decision title |
| \`chosen\` | string | Yes | Which option was chosen |
| \`rationale\` | string | Yes | Why this option was chosen |
| \`context\` | string | No | What led to this decision |
| \`options\` | object[] | No | Options with \`option\`, \`pros[]\`, \`cons[]\` |
| \`tags\` | string[] | No | Tags |
| \`outcome\` | string | No | What happened as a result |
| \`project\` | string | No | Project name |

---

### brain_update
Update a decision's outcome or tags after the fact.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`decision_id\` | string | Yes | Decision UUID |
| \`outcome\` | string | No | What happened |
| \`tags\` | string[] | No | Additional tags to merge |

---

### brain_session_start
Start a work session. Returns session ID and recent project context.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`mood\` | string | No | Starting mood (\`focused\`, \`exploratory\`, \`debugging\`) |
| \`goals\` | string[] | No | What you want to accomplish |
| \`project\` | string | No | Project name |
| \`repo_url\` | string | No | Git remote URL |

---

### brain_session_end
End the current session with a summary.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`session_id\` | string | Yes | From \`brain_session_start\` |
| \`mood\` | string | No | Ending mood |
| \`accomplishments\` | string[] | No | What was accomplished |
| \`blockers\` | string[] | No | Blockers encountered |
| \`summary\` | string | No | Brief summary |`,
      },
      {
        id: "ref-search",
        title: "Search & Recall",
        content: `### brain_search
Full-text search across thoughts and decisions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`query\` | string | Yes | Search query |
| \`limit\` | number | No | Max results (default: 20) |

---

### brain_recall
Natural language recall — "What did I decide about X?"

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`query\` | string | Yes | Natural language query |
| \`limit\` | number | No | Max results (default: 10) |
| \`include_details\` | boolean | No | Include full decision details (default: true) |

---

### brain_timeline
Chronological view of recent entries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days back (default: 7) |
| \`limit\` | number | No | Max results (default: 50) |`,
      },
      {
        id: "ref-analytics",
        title: "Analytics & DX",
        content: `### brain_dx_event
Log a developer experience event.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`event_type\` | enum | Yes | \`command\` \`tool_use\` \`completion\` \`error\` |
| \`command\` | string | No | Command or tool name |
| \`duration_ms\` | number | No | Duration in ms |
| \`tokens_in\` | number | No | Input tokens |
| \`tokens_out\` | number | No | Output tokens |
| \`success\` | boolean | No | Whether it succeeded |
| \`error_message\` | string | No | Error if failed |
| \`project\` | string | No | Project name |

---

### brain_dx_summary
Aggregate DX metrics for a time period.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days to summarize (default: 30) |

---

### brain_sentiment
Record how you feel about a tool, library, or pattern.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`target_type\` | enum | Yes | \`tool\` \`library\` \`pattern\` \`codebase\` \`task\` \`process\` |
| \`target_name\` | string | Yes | Name of the thing |
| \`feeling\` | enum | Yes | \`frustrated\` \`confused\` \`satisfied\` \`excited\` \`neutral\` \`annoyed\` \`impressed\` |
| \`intensity\` | number | No | 1-5 |
| \`reason\` | string | No | Why |
| \`project\` | string | No | Project name |

---

### brain_score_session
Score a session using transparent rubrics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`goals\` | string[] | No | Session goals |
| \`accomplishments\` | string[] | No | What was accomplished |
| \`blockers\` | string[] | No | Blockers |
| \`mood_start\` / \`mood_end\` | string | No | Mood bookends |
| \`duration_minutes\` | number | No | Session length |
| \`thought_count\` / \`decision_count\` / \`insight_count\` / \`error_count\` | number | No | Counts |
| \`success_rate\` | number | No | Success rate % |`,
      },
      {
        id: "ref-coaching",
        title: "AI Coaching",
        content: `### brain_summarize
Generate an activity summary for a time period.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`period\` | string | Yes | \`this week\`, \`last week\`, \`this month\`, or number of days |
| \`project\` | string | No | Filter by project |

---

### brain_daily_digest
Generate today's AI-powered daily digest.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`force\` | boolean | No | Force regeneration (default: false) |

---

### brain_daily_coaching
Daily coaching across 5 dimensions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`force\` | boolean | No | Force regeneration |
| \`days\` | number | No | Days to analyze (default: 7) |

---

### brain_coaching_insights
AI-generated coaching from work patterns.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days to analyze (default: 30) |`,
      },
      {
        id: "ref-decisions",
        title: "Decision Tools",
        content: `### brain_suggest_decision
Analyze context to suggest whether a decision should be recorded.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`context\` | string | Yes | What you're working on |
| \`options_mentioned\` | string[] | No | Options being considered |
| \`decision_type\` | enum | No | \`architecture\` \`library\` \`pattern\` \`tooling\` \`process\` \`other\` |
| \`urgency\` | enum | No | \`low\` \`medium\` \`high\` |

---

### brain_decision_review
Record a follow-up review of a past decision.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`decision_id\` | string | Yes | Decision UUID |
| \`outcome_rating\` | number | No | Rating 1-5 |
| \`outcome_notes\` | string | No | Notes |
| \`lessons_learned\` | string | No | What was learned |
| \`would_decide_same\` | boolean | No | Would you decide the same? |
| \`review_type\` | string | No | Type of review |
| \`follow_up_days\` | number | No | Days since decision |

---

### brain_decision_templates
List or get decision templates.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`type\` | string | No | Template type (\`architecture\`, \`library\`, etc.) |

---

### brain_decision_accuracy
Decision accuracy analytics over time.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days to analyze (default: 90) |
| \`project_id\` | string | No | Filter by project |`,
      },
      {
        id: "ref-collaboration",
        title: "Collaboration Tools",
        content: `### brain_handoff
Create a context handoff to another project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`to_project\` | string | Yes | Target project |
| \`message\` | string | Yes | Handoff message |
| \`handoff_type\` | enum | No | \`context\` \`decision\` \`blocker\` \`task\` |
| \`priority\` | enum | No | \`low\` \`medium\` \`high\` \`urgent\` |
| \`metadata\` | object | No | Additional data |

---

### brain_handoffs
List pending handoffs for a project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`project\` | string | No | Project name |
| \`include_claimed\` | boolean | No | Include claimed (default: false) |

---

### brain_handoff_claim
Claim a handoff to mark it as received.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`handoff_id\` | string | Yes | Handoff ID |
| \`note\` | string | No | Optional note |`,
      },
      {
        id: "ref-integrations",
        title: "Integrations",
        content: `### brain_log_commit
Log a Git commit to your brain timeline.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`hash\` | string | Yes | Commit hash |
| \`message\` | string | Yes | Commit message |
| \`files_changed\` | string[] | No | Files changed |
| \`additions\` / \`deletions\` | number | No | Lines added/deleted |
| \`author\` | string | No | Author |
| \`branch\` | string | No | Branch |
| \`project\` | string | No | Project name |

---

### brain_conversation
Record an AI conversation for quality tracking.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`prompt_text\` | string | Yes | The prompt |
| \`response_summary\` | string | No | Response summary |
| \`turns\` | number | No | Turn count (default: 1) |
| \`prompt_tokens\` / \`response_tokens\` | number | No | Token counts |
| \`goal_achieved\` | boolean | No | Goal achieved? |
| \`context_sufficient\` | boolean | No | Was context enough? |
| \`quality_score\` | number | No | Quality 1-5 |
| \`session_id\` | string | No | Session ID |
| \`tags\` | string[] | No | Tags |
| \`project\` | string | No | Project name |`,
      },
      {
        id: "ref-cost",
        title: "Cost & Quality",
        content: `### brain_cost_per_outcome
Cost-effectiveness analytics — token spend vs. outcomes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days to analyze (default: 30) |
| \`project_id\` | string | No | Filter by project |

---

### brain_prompt_quality
Prompt quality statistics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`days\` | number | No | Days to analyze (default: 30) |
| \`project_id\` | string | No | Filter by project |

---

### brain_learning_curve
Learning curve metrics over time.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`weeks\` | number | No | Weeks to analyze (default: 12) |
| \`project_id\` | string | No | Filter by project |`,
      },
      {
        id: "ref-system",
        title: "System",
        content: `### brain_delete
Delete a thought or decision.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`type\` | enum | Yes | \`thought\` or \`decision\` |
| \`id\` | string | Yes | Entry UUID |

---

### brain_check_update
Check for client config updates.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`client_version\` | string | Yes | Current version |`,
      },
    ],
  },
];
