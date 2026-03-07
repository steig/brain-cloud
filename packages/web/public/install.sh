#!/usr/bin/env bash
set -euo pipefail

# Brain Cloud — Claude Code installer
# Sets up MCP server config and optional CLAUDE.md directives

BRAIN_URL="${BRAIN_URL:-https://dash.brain-ai.dev}"
MCP_FILE="$HOME/.claude/.mcp.json"
CLAUDE_MD="$HOME/.claude/CLAUDE.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}${BOLD}→${NC} $1"; }
ok()    { echo -e "${GREEN}${BOLD}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}${BOLD}!${NC} $1"; }
err()   { echo -e "${RED}${BOLD}✗${NC} $1"; }

echo ""
echo -e "${BOLD}Brain Cloud — Claude Code Setup${NC}"
echo ""

# ── 1. Get API key ──────────────────────────────────────────────────
if [ -n "${BRAIN_API_KEY:-}" ]; then
  API_KEY="$BRAIN_API_KEY"
  info "Using API key from \$BRAIN_API_KEY"
else
  info "Enter your Brain Cloud API key"
  echo -e "  (Create one at ${CYAN}${BRAIN_URL}${NC} → Settings → New Key)"
  echo ""
  read -rp "  API key: " API_KEY
  echo ""
fi

if [ -z "$API_KEY" ]; then
  err "No API key provided. Exiting."
  exit 1
fi

# ── 2. Test connection ──────────────────────────────────────────────
info "Testing connection..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-API-Key: $API_KEY" \
  "${BRAIN_URL}/auth/me" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  ok "API key is valid"
else
  err "Connection failed (HTTP $HTTP_CODE). Check your API key and try again."
  exit 1
fi

# ── 3. Write MCP config ────────────────────────────────────────────
info "Configuring MCP server..."

mkdir -p "$(dirname "$MCP_FILE")"

MCP_ENTRY=$(cat <<EOF
{
  "type": "streamable-http",
  "url": "${BRAIN_URL}/mcp",
  "headers": {
    "X-API-Key": "${API_KEY}"
  }
}
EOF
)

if [ -f "$MCP_FILE" ]; then
  # Merge into existing config — check if jq is available
  if command -v jq &>/dev/null; then
    EXISTING=$(cat "$MCP_FILE")
    echo "$EXISTING" | jq --argjson entry "$MCP_ENTRY" '.mcpServers["brain-cloud"] = $entry' > "$MCP_FILE"
    ok "Updated $MCP_FILE (merged with existing config)"
  else
    # No jq — check if brain-cloud already configured
    if grep -q '"brain-cloud"' "$MCP_FILE" 2>/dev/null; then
      warn "$MCP_FILE already contains brain-cloud entry. Skipping (install jq for auto-merge)."
    else
      warn "$MCP_FILE exists but jq is not installed for safe merging."
      echo -e "  Add this to your ${CYAN}$MCP_FILE${NC} under mcpServers:"
      echo ""
      echo "    \"brain-cloud\": $MCP_ENTRY"
      echo ""
    fi
  fi
else
  # Create new file
  cat > "$MCP_FILE" <<EOF
{
  "mcpServers": {
    "brain-cloud": ${MCP_ENTRY}
  }
}
EOF
  ok "Created $MCP_FILE"
fi

# ── 4. Add CLAUDE.md directives (optional) ──────────────────────────
echo ""
read -rp "$(echo -e "${CYAN}${BOLD}→${NC} Add Brain logging directives to CLAUDE.md? (recommended) [Y/n]: ")" ADD_DIRECTIVES
ADD_DIRECTIVES="${ADD_DIRECTIVES:-Y}"

if [[ "$ADD_DIRECTIVES" =~ ^[Yy]$ ]]; then
  BRAIN_BLOCK=$(cat <<'DIRECTIVES'

<brain_logging>
Log to Brain MCP. If unavailable, note and continue.

## Session Lifecycle
- brain_session_start() - First message of conversation
- brain_session_end() + suggest "/clear" - When task complete, topic switch, or conversation long

## brain_thought - BE SELECTIVE
**LOG these:** insight (non-obvious codebase learnings), todo (deferred work + WHY), blocker (needs input)
**SKIP these:** "Starting to look at X", "Reading file Y", routine progress, obvious observations

## brain_decide - Log when choosing between approaches
Only when you actually considered alternatives. Include: options, chosen, rationale.

## brain_sentiment - Log frustration/satisfaction sparingly
Only for strong signals (confusing code, elegant solution).
</brain_logging>
DIRECTIVES
)

  mkdir -p "$(dirname "$CLAUDE_MD")"

  if [ -f "$CLAUDE_MD" ]; then
    if grep -q '<brain_logging>' "$CLAUDE_MD" 2>/dev/null; then
      ok "CLAUDE.md already has brain_logging directives. Skipping."
    else
      echo "$BRAIN_BLOCK" >> "$CLAUDE_MD"
      ok "Appended brain directives to $CLAUDE_MD"
    fi
  else
    cat > "$CLAUDE_MD" <<EOF
# Claude Instructions
${BRAIN_BLOCK}
EOF
    ok "Created $CLAUDE_MD with brain directives"
  fi
else
  info "Skipped CLAUDE.md directives"
fi

# ── 5. Done ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Done!${NC} Brain Cloud is configured for Claude Code."
echo ""
echo -e "  ${BOLD}Next steps:${NC}"
echo -e "  1. Restart Claude Code (or run ${CYAN}/mcp${NC} to reload servers)"
echo -e "  2. Ask Claude to call ${CYAN}brain_session_start()${NC} — it should just work"
echo -e "  3. Dashboard: ${CYAN}${BRAIN_URL}${NC}"
echo ""
