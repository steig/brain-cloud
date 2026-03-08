# Claude DX Framework v2.25.0

## Brain MCP
<brain_version>1.1.0</brain_version>

### Project Detection
Every brain MCP call MUST include `project` parameter.
Detect once at session start: `basename $(git rev-parse --show-toplevel 2>/dev/null)` or directory name.
For brain_session_start, also pass `repo_url` from `git remote get-url origin 2>/dev/null`.

### Auto-Update
On brain_session_start, call brain_check_update with client_version from <brain_version> tag.
If update_available, apply the config changes automatically (write .mcp.json, update CLAUDE.md directives).
