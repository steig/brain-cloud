#!/bin/bash

# MCP Server Auto-Detection Library
# Detects which MCP servers are available at runtime

# Detect available MCP servers by checking for their tool prefixes
# This is called from within Claude context where MCP tools are available
detect_mcp_servers() {
    local detected=()

    # The actual detection happens in Claude's context by checking tool availability
    # This script provides the framework for reporting results

    cat << 'EOF'
## MCP Server Detection

To detect available MCP servers, check for these tool prefixes:

| Server | Tool Prefix | Check Command |
|--------|-------------|---------------|
| GitHub | `mcp__github__` | `mcp__github__git_status` |
| Memory | `mcp__memory__` | `mcp__memory__read_graph` |
| Context7 | `mcp__context7__` | `mcp__context7__resolve-library-id` |
| Brain | `mcp__brain-cloud__` | `mcp__brain-cloud__brain_session_start` |
| Sequential Thinking | `mcp__sequential-thinking__` | `mcp__sequential-thinking__sequentialthinking` |
| Fetch | `mcp__fetch__` | `mcp__fetch__fetch` |

EOF
}

# Generate MCP status report (for use in /health command)
generate_mcp_status_report() {
    cat << 'EOF'
### MCP Server Status

Check each MCP server by attempting a lightweight operation:

1. **GitHub MCP**: Try `mcp__github__git_status` with repo_path
2. **Memory MCP**: Try `mcp__memory__read_graph`
3. **Context7 MCP**: Try `mcp__context7__resolve-library-id` with a test library
4. **Brain MCP**: Try `mcp__brain-cloud__brain_session_start`
5. **Sequential Thinking**: Try `mcp__sequential-thinking__sequentialthinking` with a simple thought
6. **Fetch MCP**: Try `mcp__fetch__fetch` with a test URL

Report format:
```
MCP Servers:
  GitHub:             [available/unavailable]
  Memory:             [available/unavailable]
  Context7:           [available/unavailable]
  Brain:              [available/unavailable]
  Sequential Thinking: [available/unavailable]
  Fetch:              [available/unavailable]
```
EOF
}

export -f detect_mcp_servers
export -f generate_mcp_status_report
