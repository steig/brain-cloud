#!/bin/bash
# Skill Analytics Hook
# Logs skill invocations to Brain MCP via brain_dx_event
#
# Triggered by PostToolUse hook when Skill tool is used.
# Part of: Issue #15 - Skill Usage Analytics
#
# Usage: skill-analytics.sh <tool_name> <tool_input> <tool_output>

set -euo pipefail

TOOL_NAME="${1:-}"
TOOL_INPUT="${2:-}"
TOOL_OUTPUT="${3:-}"

# Only process Skill tool calls
if [[ "$TOOL_NAME" != "Skill" ]]; then
    exit 0
fi

# Extract skill name from tool input
SKILL_NAME=$(echo "$TOOL_INPUT" | jq -r '.skill // empty' 2>/dev/null || echo "")

if [[ -z "$SKILL_NAME" ]]; then
    exit 0
fi

# Extract args if present
SKILL_ARGS=$(echo "$TOOL_INPUT" | jq -r '.args // ""' 2>/dev/null || echo "")

# Determine outcome from tool output
OUTCOME="success"
if echo "$TOOL_OUTPUT" | grep -qiE "error|failed|exception"; then
    OUTCOME="failure"
fi

# Get timestamp
TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# Log to Brain MCP via system message
# This will be picked up by Claude which will call brain_dx_event
cat << EOF

<system-reminder>
🔧 **SKILL ANALYTICS**: Log this skill invocation to Brain MCP:

\`\`\`
brain_dx_event(
  event_type="skill_invocation",
  event_data={
    "skill": "$SKILL_NAME",
    "args": "$SKILL_ARGS",
    "outcome": "$OUTCOME",
    "timestamp": "$TIMESTAMP"
  },
  tags=["skill-analytics", "skill:$SKILL_NAME"]
)
\`\`\`

This enables tracking of command usage patterns for workflow optimization.
</system-reminder>

EOF

exit 0
