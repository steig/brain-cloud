---
category: knowledge
---

# /refresh - Reload Brain Context

You are helping the user refresh Claude's context from the Brain MCP server.

## Purpose

Mid-session context reload for when:
- Session feels stale or disconnected
- You want to see recent thoughts/decisions
- You switched projects and need relevant context
- You want to verify the Brain is connected

## Execution Steps

### Step 1: Get Recent Timeline

Use `brain_timeline` to fetch recent brain activity:

```
brain_timeline(days=7, limit=20)
```

### Step 2: Search for Project Context (if applicable)

If in a project directory, search for project-specific context:

```
brain_search(query="{project_name}", limit=10)
```

### Step 3: Present Summary

Format the results:

```
BRAIN CONTEXT
═════════════

Recent Activity (last 7 days):
──────────────────────────────
{For each entry from timeline:}
• [{type}] {content} ({relative_time})

{If project search returned results:}
Project Context ({project_name}):
─────────────────────────────────
• {relevant thoughts/decisions}

Brain is connected and ready.
```

## Usage

```bash
/refresh              # Show recent brain activity
/refresh {query}      # Search brain for specific topic
```

## Examples

### Default refresh
```
/refresh

BRAIN CONTEXT
═════════════

Recent Activity (last 7 days):
──────────────────────────────
• [decision] Use Brain MCP instead of static files (2 hours ago)
• [thought] Testing brain-api connection (3 hours ago)
• [insight] MCP tools provide better search than file reads (yesterday)

Brain is connected and ready.
```

### Topic-specific refresh
```
/refresh authentication

BRAIN CONTEXT: authentication
═════════════════════════════

• [decision] Use JWT tokens for API auth (3 days ago)
• [thought] Consider refresh token rotation (3 days ago)
• [todo] Implement token revocation endpoint (5 days ago)

3 entries found.
```
