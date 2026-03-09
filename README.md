# Brain Cloud

A personal knowledge graph for developers. Captures thoughts, decisions, sessions, and sentiment from your AI-assisted workflow — then makes it searchable and actionable.

**Self-hosted on Cloudflare.** Your data stays on your infrastructure. Free tier covers solo devs.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

## What It Does

Brain Cloud is an MCP server that gives your AI tools persistent memory:

- **Thoughts & Decisions** — capture insights, record architectural decisions with context
- **Sessions** — track work sessions with goals, accomplishments, and blockers
- **Semantic Search** — find anything you've captured using natural language (optional Vectorize)
- **AI Coaching** — daily digests, coaching insights, decision accuracy tracking (optional Workers AI)
- **Cross-Project Handoffs** — transfer context between projects seamlessly

Works with Claude Code, Claude Desktop, and any MCP-compatible client.

## Quick Start (Self-Host)

Deploy your own instance on Cloudflare Workers (D1 + optional Vectorize + Workers AI):

```bash
# Prerequisites: Node.js 18+, Wrangler CLI (npm i -g wrangler), Cloudflare account

# 1. Clone and install
git clone https://github.com/steig/brain-cloud.git
cd brain-cloud && pnpm install

# 2. Copy the template and fill in your values
cp wrangler.toml.template packages/worker/wrangler.toml

# 3. Create your D1 database
wrangler d1 create brain-db
# Copy the database_id into wrangler.toml

# 4. Set secrets
wrangler secret put JWT_SECRET        # generate: openssl rand -hex 32
wrangler secret put GITHUB_CLIENT_ID  # from GitHub OAuth app
wrangler secret put GITHUB_CLIENT_SECRET

# 5. Run migrations
wrangler d1 migrations apply brain-db --remote

# 6. Build and deploy
pnpm --filter brain-web build
wrangler deploy

# 7. Configure Claude Code
# Add to ~/.claude/mcp.json:
# { "mcpServers": { "brain": { "type": "streamable-http", "url": "https://YOUR_DOMAIN/mcp", "headers": { "X-API-Key": "YOUR_KEY" } } } }
```

See [wrangler.toml.template](./wrangler.toml.template) for all configuration options including optional Vectorize and Workers AI setup.

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────┐
│ Claude Code  │────▶│  Cloudflare Worker                   │
│ / Desktop    │ MCP │  ├── /mcp    (JSON-RPC 2.0)         │
└─────────────┘     │  ├── /api    (REST)                  │
                    │  ├── /auth   (OAuth)                 │
┌─────────────┐     │  └── /*      (React SPA)             │
│ Web Dashboard│────▶│                                      │
└─────────────┘     ├──────────────────────────────────────┤
                    │  D1 (SQLite)  │ Vectorize │ Workers AI│
                    └──────────────────────────────────────┘
```

- **Worker** (`packages/worker`) — Hono on Cloudflare Workers, serves API + MCP + SPA
- **Web** (`packages/web`) — React dashboard for browsing your brain data
- **CLI** (`packages/cli`) — `npx brain-cloud init` for quick MCP client setup

## Local Development

```bash
pnpm install
just migrate   # Run D1 migrations locally
just dev       # Start worker + web dev servers
```

## MCP Tools (35 total)

| Category | Tools |
|----------|-------|
| **Capture** | `brain_thought`, `brain_decide`, `brain_update`, `brain_session_start`, `brain_session_end` |
| **Search** | `brain_search`, `brain_recall`, `brain_timeline` |
| **Analytics** | `brain_dx_event`, `brain_dx_summary`, `brain_sentiment`, `brain_score_session` |
| **AI Coaching** | `brain_daily_digest`, `brain_daily_coaching`, `brain_coaching_insights`, `brain_summarize` |
| **Decisions** | `brain_suggest_decision`, `brain_decision_review`, `brain_decision_templates`, `brain_decision_accuracy` |
| **Cognitive** | `brain_remind`, `brain_reminders`, `brain_complete_reminder`, `brain_delete_reminder`, `brain_stale_decisions`, `brain_digest`, `brain_memory_health` |
| **Collaboration** | `brain_handoff`, `brain_handoffs`, `brain_handoff_claim` |
| **Integrations** | `brain_log_commit`, `brain_conversation` |
| **System** | `brain_cost_per_outcome`, `brain_prompt_quality`, `brain_learning_curve`, `brain_delete`, `brain_check_update` |

## License

[AGPL-3.0](./LICENSE) — free to self-host, modify, and distribute. Contributions welcome.
