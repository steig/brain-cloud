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

1. Go to **Settings → API Keys**
2. Create a key — copy it somewhere safe

## 2. Connect Your AI Client

Brain Cloud works with any MCP-compatible AI client. Pick yours below.

### Claude Code

Create or edit \`~/.claude/mcp.json\` (replace \`YOUR_SERVER\` with your instance URL):

\`\`\`json
{
  "mcpServers": {
    "brain": {
      "type": "url",
      "url": "YOUR_SERVER/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
\`\`\`

### Claude Desktop

Config file location:
- macOS: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
- Windows: \`%APPDATA%/Claude/claude_desktop_config.json\`

Same \`mcpServers\` format as Claude Code.

### Cursor

Create \`.cursor/mcp.json\` in your project root (or global \`~/.cursor/mcp.json\`):

\`\`\`json
{
  "mcpServers": {
    "brain-cloud": {
      "url": "https://YOUR_SERVER/mcp",
      "headers": {
        "X-API-Key": "YOUR_API_KEY"
      }
    }
  }
}
\`\`\`

### Windsurf (Codeium)

Edit \`~/.codeium/windsurf/mcp_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "brain": {
      "type": "url",
      "url": "YOUR_SERVER/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
\`\`\`

### Continue.dev

Add an \`mcpServers\` array to \`~/.continue/config.json\`:

\`\`\`json
{
  "mcpServers": [
    {
      "name": "brain-cloud",
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-proxy", "--endpoint", "https://YOUR_SERVER/mcp", "--header", "X-API-Key: YOUR_API_KEY"]
    }
  ]
}
\`\`\`

### Zed

Add to your Zed settings (\`~/.config/zed/settings.json\`):

\`\`\`json
{
  "context_servers": {
    "brain-cloud": {
      "command": {
        "path": "npx",
        "args": ["-y", "@anthropic-ai/mcp-proxy", "--endpoint", "https://YOUR_SERVER/mcp", "--header", "X-API-Key: YOUR_API_KEY"]
      }
    }
  }
}
\`\`\`

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
    title: "Self-Hosting",
    sections: [
      {
        id: "self-host-overview",
        title: "Overview",
        content: `Brain Cloud is fully self-hostable on Cloudflare Workers. The free tier covers solo developers — no paid plans required.

## What You Need

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): \`npm i -g wrangler\`

## Architecture

\`\`\`mermaid
flowchart LR
    A["🤖 Claude Code"] -- "MCP" --> B["⚙️ Worker"]
    B --> C[("💾 D1")]
    B -.-> D["🧠 Workers AI"]
    B -.-> E["🔍 Vectorize"]
\`\`\`

Your instance is a single Cloudflare Worker that serves both the web dashboard (as static assets) and the API/MCP endpoints. D1 (SQLite) is the only required binding — Workers AI and Vectorize are optional enhancements.

## What's Included

| Feature | Required | Notes |
|---------|----------|-------|
| MCP server | D1 only | Full tool support |
| Web dashboard | D1 only | All pages work |
| GitHub/Google OAuth | OAuth secrets | Or use API-key-only mode |
| AI coaching & digests | Workers AI | Free tier: 10k neurons/day |
| Semantic search | Vectorize | Similarity-based recall |
| Data export | D1 only | JSON or CSV |`,
      },
      {
        id: "self-host-quickstart",
        title: "Quick Start",
        content: `## 1. Clone & Install

\`\`\`bash
git clone https://github.com/steig/brain-cloud.git
cd brain-cloud
pnpm install
\`\`\`

## 2. Authenticate with Cloudflare

\`\`\`bash
wrangler login
\`\`\`

## 3. Create Your D1 Database

\`\`\`bash
wrangler d1 create brain-db
# Note the database_id from the output
\`\`\`

## 4. Configure Your Instance

\`\`\`bash
cp wrangler.toml.template packages/worker/wrangler.toml
\`\`\`

Edit \`packages/worker/wrangler.toml\`:
- Set \`database_id\` to your D1 ID
- Set \`FRONTEND_URL\` to your domain (or leave as workers.dev)
- Set \`JWT_ISSUER\` to your domain
- Set callback URLs to match your domain

## 5. Run Migrations

\`\`\`bash
wrangler d1 migrations apply brain-db --remote
\`\`\`

## 6. Set Secrets

\`\`\`bash
# Generate a JWT secret
openssl rand -hex 32
wrangler secret put JWT_SECRET
\`\`\`

## 7. Set Up OAuth (Optional)

\`\`\`bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
\`\`\`

See the OAuth Setup section for details. If you skip this, Brain Cloud runs in API-key-only mode.

## 8. Build & Deploy

\`\`\`bash
pnpm --filter brain-web build
cd packages/worker && wrangler deploy
\`\`\`

Your instance is live at \`https://brain-cloud.YOUR_SUBDOMAIN.workers.dev\`.

The first user to sign in (via OAuth) automatically becomes the admin.`,
      },
      {
        id: "self-host-oauth",
        title: "OAuth Setup",
        content: `## GitHub (Recommended)

1. Go to [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: Brain Cloud
   - **Homepage URL**: \`https://YOUR_DOMAIN\`
   - **Authorization callback URL**: \`https://YOUR_DOMAIN/auth/github/callback\`
4. Copy the Client ID and Client Secret
5. Set as Worker secrets:

\`\`\`bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
\`\`\`

## Google (Optional)

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URI: \`https://YOUR_DOMAIN/auth/google/callback\`
4. Set as Worker secrets:

\`\`\`bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
\`\`\`

## No OAuth (API Key Only)

If you don't configure any OAuth provider, Brain Cloud runs in **API-key-only mode**. The first user is created during initial setup and authenticates exclusively via API key. This works well for single-user self-hosted instances where you only interact via MCP.`,
      },
      {
        id: "self-host-optional",
        title: "Optional Features",
        content: `## Vectorize (Semantic Search)

Enables similarity-based search across your thoughts and decisions. When you ask "What did I decide about auth?", Vectorize finds semantically related entries even if they don't contain the exact keyword.

\`\`\`bash
# Create the index
wrangler vectorize create brain-embeddings --dimensions 768 --metric cosine
\`\`\`

Uncomment in \`wrangler.toml\`:

\`\`\`toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "brain-embeddings"
\`\`\`

Then redeploy: \`wrangler deploy\`

## Workers AI (Coaching & Digests)

Enables AI-powered daily digests, coaching insights, and automatic embedding generation.

Uncomment in \`wrangler.toml\`:

\`\`\`toml
[ai]
binding = "AI"
\`\`\`

Then redeploy: \`wrangler deploy\`

Workers AI free tier includes 10,000 neurons per day — sufficient for personal use.

## Custom Domain

1. Add your domain to Cloudflare (DNS must be on Cloudflare)
2. Add to \`wrangler.toml\`:

\`\`\`toml
routes = [
  { pattern = "brain.yourdomain.com", custom_domain = true },
]
\`\`\`

3. Update \`FRONTEND_URL\`, \`JWT_ISSUER\`, and callback URLs in \`[vars]\`
4. Update your GitHub/Google OAuth app callback URLs
5. Redeploy: \`wrangler deploy\``,
      },
      {
        id: "self-host-config",
        title: "Configuration Reference",
        content: `## Environment Variables

Set in the \`[vars]\` section of \`wrangler.toml\`:

| Variable | Required | Description |
|----------|----------|-------------|
| \`JWT_ISSUER\` | Yes | Your domain (e.g. \`brain.example.com\`) |
| \`FRONTEND_URL\` | Yes | Full URL (e.g. \`https://brain.example.com\`) |
| \`GITHUB_CALLBACK_URL\` | If using GitHub | \`https://YOUR_DOMAIN/auth/github/callback\` |
| \`GOOGLE_CALLBACK_URL\` | If using Google | \`https://YOUR_DOMAIN/auth/google/callback\` |

## Secrets

Set via \`wrangler secret put\`:

| Secret | Required | Description |
|--------|----------|-------------|
| \`JWT_SECRET\` | Yes | 256-bit hex string for JWT signing |
| \`GITHUB_CLIENT_ID\` | No | GitHub OAuth client ID |
| \`GITHUB_CLIENT_SECRET\` | No | GitHub OAuth client secret |
| \`GOOGLE_CLIENT_ID\` | No | Google OAuth client ID |
| \`GOOGLE_CLIENT_SECRET\` | No | Google OAuth client secret |

## Bindings

| Binding | Required | Description |
|---------|----------|-------------|
| \`DB\` (D1) | Yes | SQLite database |
| \`AI\` (Workers AI) | No | Coaching, digests, embeddings |
| \`VECTORIZE\` | No | Semantic search index |
| \`ASSETS\` | Yes | Static SPA files (auto-configured) |`,
      },
      {
        id: "self-host-updating",
        title: "Updating & Troubleshooting",
        content: `## Updating Your Instance

\`\`\`bash
git pull origin main
pnpm install
wrangler d1 migrations apply brain-db --remote
pnpm --filter brain-web build
cd packages/worker && wrangler deploy
\`\`\`

## Troubleshooting

### CORS errors in browser console

Your \`FRONTEND_URL\` doesn't match the domain you're accessing from. Update \`FRONTEND_URL\` in \`wrangler.toml\` to match your actual URL, then redeploy.

### OAuth redirect mismatch

The callback URL in your GitHub/Google app must exactly match the \`GITHUB_CALLBACK_URL\` / \`GOOGLE_CALLBACK_URL\` in \`wrangler.toml\`.

### D1 migration errors

Check what tables exist:

\`\`\`bash
wrangler d1 execute brain-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
\`\`\`

### "AI features require Workers AI binding"

Enable Workers AI by uncommenting the \`[ai]\` section in \`wrangler.toml\` and redeploying.

### Worker not found after deploy

Run \`wrangler whoami\` to verify authentication. Check \`wrangler deploy\` output for the URL.

### Data export

You can export all your data at any time via **Settings → Export** or the API:

\`\`\`bash
curl -H "X-API-Key: YOUR_KEY" https://YOUR_DOMAIN/api/export?format=json&type=all
\`\`\``,
      },
    ],
  },
  {
    title: "API",
    sections: [
      {
        id: "rate-limiting",
        title: "Rate Limiting",
        content: `Brain Cloud uses fixed-window rate limiting backed by D1. Every API and MCP request is counted against a per-key, per-path window. If the rate limit infrastructure encounters an error, requests are allowed through (fail-open) so a transient D1 issue never blocks your workflow.

## Rate Limit Tiers

| Tier | Limit | Window | Applies To |
|------|-------|--------|------------|
| **API** | 100 requests | 60 seconds | Standard API endpoints |
| **AI** | 20 requests | 60 seconds | AI-powered endpoints (coaching, digests, embeddings) |
| **Auth** | 10 requests | 300 seconds | Authentication endpoints (login, OAuth callbacks) |

The key used for rate limiting depends on the tier. API and AI tiers identify callers by API key (hashed), authenticated user ID, or IP address — in that order of precedence. The Auth tier always uses the client IP address to prevent brute-force attacks regardless of authentication state.

## Response Headers

Every response includes rate limit headers so clients can track their usage:

| Header | Description | Example |
|--------|-------------|---------|
| \`X-RateLimit-Limit\` | Maximum requests allowed in the current window | \`100\` |
| \`X-RateLimit-Remaining\` | Requests remaining in the current window | \`87\` |
| \`X-RateLimit-Reset\` | Unix timestamp (seconds) when the current window resets | \`1709942460\` |
| \`Retry-After\` | Seconds to wait before retrying (only on 429 responses) | \`60\` |

## Handling 429 Responses

When a client exceeds the rate limit, the API returns HTTP 429 with a JSON body:

\`\`\`json
{
  "error": "Too many requests",
  "code": "RATE_LIMITED"
}
\`\`\`

The \`Retry-After\` header indicates how many seconds to wait. Clients should implement exponential backoff:

1. On a 429 response, wait for the duration specified in \`Retry-After\`
2. If subsequent requests still return 429, double the wait time on each retry
3. Cap the maximum backoff at a reasonable limit (e.g. 5 minutes)
4. Add a small random jitter to avoid thundering-herd problems

## MCP Clients

MCP clients connecting to Brain Cloud encounter the same rate limits. The \`X-RateLimit-Remaining\` header is the best signal for proactive throttling — if it drops to zero, pause requests until \`X-RateLimit-Reset\`.`,
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
