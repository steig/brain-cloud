# Brain Cloud

A developer knowledge graph and MCP server. Captures thoughts, decisions, sessions, and sentiment from your AI-assisted development workflow — then makes it all searchable and actionable.

## Architecture

- **Worker** (`packages/worker`) — Cloudflare Worker with D1 database, serves both the REST API and MCP endpoint
- **Web** (`packages/web`) — React dashboard for browsing your brain data and managing API keys

## Local Development

```bash
# Install dependencies
pnpm install

# Run migrations against local D1
just migrate

# Start dev server (worker + web)
just dev
```

## MCP Server Setup

Brain Cloud exposes an MCP endpoint at `/mcp` using Streamable HTTP transport.

### 1. Generate an API Key

Go to **Settings** in the web dashboard and create a named API key. Copy it — you'll only see it once.

### 2. Configure Claude Code

Add to your `.mcp.json` (project-level or `~/.claude/.mcp.json` for global):

```json
{
  "mcpServers": {
    "brain": {
      "type": "streamable-http",
      "url": "https://brain-ai.dev/mcp",
      "headers": {
        "X-API-Key": "brain_your_key_here"
      }
    }
  }
}
```

### 3. Verify

```bash
curl -X POST https://brain-ai.dev/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: brain_your_key_here" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## API Key Management

Each user can create multiple named API keys (e.g. "laptop", "work-desktop", "ci"). Keys are stored as SHA-256 hashes — the plaintext is only shown once at creation.

- **Create**: Settings → New Key → name it → copy the key
- **Revoke**: Settings → click trash icon on any key
- **Legacy**: Single-key `users.api_key` still works during migration

## Deployment

```bash
just ship
```
