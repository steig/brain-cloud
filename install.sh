#!/usr/bin/env bash
set -euo pipefail

# Brain Cloud — MCP server installer
# Detects Claude Code & Claude Desktop, merges config idempotently.
# Usage:
#   BRAIN_API_KEY="xxx" bash <(curl -fsSL https://dash.brain-ai.dev/install.sh)
#   bash install.sh --dry-run
#   bash install.sh --uninstall

VERSION="2.0.0"
BRAIN_SERVER_URL="${BRAIN_SERVER_URL:-https://dash.brain-ai.dev}"

# ── Flags ─────────────────────────────────────────────────────────────
DRY_RUN=false
UNINSTALL=false
INTERACTIVE=true

for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY_RUN=true ;;
    --uninstall) UNINSTALL=true ;;
    --help|-h)
      echo "Brain Cloud installer v${VERSION}"
      echo ""
      echo "Usage: BRAIN_API_KEY=\"xxx\" bash install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run     Show what would be changed without modifying files"
      echo "  --uninstall   Remove brain-cloud from all detected MCP configs"
      echo "  --help        Show this help"
      echo ""
      echo "Environment:"
      echo "  BRAIN_API_KEY      Required (unless --uninstall). Your API key."
      echo "  BRAIN_SERVER_URL   Server URL (default: https://dash.brain-ai.dev)"
      exit 0
      ;;
    *) echo "Unknown option: $arg (try --help)"; exit 1 ;;
  esac
done

# Non-interactive when piped
if [ ! -t 0 ]; then
  INTERACTIVE=false
fi

# ── Colors (only if terminal supports it) ─────────────────────────────
if [ -t 1 ] && command -v tput &>/dev/null && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  DIM='\033[2m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' CYAN='' BOLD='' DIM='' NC=''
fi

info()  { echo -e "${CYAN}${BOLD}=>${NC} $1"; }
ok()    { echo -e "${GREEN}${BOLD} +${NC} $1"; }
warn()  { echo -e "${YELLOW}${BOLD} !${NC} $1"; }
err()   { echo -e "${RED}${BOLD} x${NC} $1"; }
dry()   { echo -e "${DIM}[dry-run]${NC} $1"; }

# ── Cleanup trap ──────────────────────────────────────────────────────
TMPFILES=()
cleanup() {
  for f in "${TMPFILES[@]}"; do
    rm -f "$f" 2>/dev/null || true
  done
}
trap cleanup EXIT

# ── Detect JSON tool ──────────────────────────────────────────────────
JSON_TOOL=""
detect_json_tool() {
  if command -v node &>/dev/null; then
    JSON_TOOL="node"
  elif command -v python3 &>/dev/null; then
    JSON_TOOL="python3"
  elif command -v python &>/dev/null; then
    JSON_TOOL="python"
  else
    err "No JSON tool found. Install node or python3."
    exit 1
  fi
}

# Merge or remove brain-cloud entry using detected JSON tool
# Usage: json_merge <input_file> <output_file> <action> [entry_json]
#   action: "set" (upsert entry) or "delete" (remove entry)
json_merge() {
  local input="$1" output="$2" action="$3" entry="${4:-}"

  if [ "$JSON_TOOL" = "node" ]; then
    node -e "
      const fs = require('fs');
      let cfg = {};
      try { cfg = JSON.parse(fs.readFileSync('$input', 'utf8')); } catch {}
      if (!cfg.mcpServers) cfg.mcpServers = {};
      if ('$action' === 'set') {
        cfg.mcpServers['brain-cloud'] = JSON.parse(process.argv[1]);
      } else {
        delete cfg.mcpServers['brain-cloud'];
      }
      fs.writeFileSync('$output', JSON.stringify(cfg, null, 2) + '\n');
    " "$entry"
  else
    # python3 or python
    $JSON_TOOL -c "
import json, sys, os
cfg = {}
try:
    with open('$input') as f: cfg = json.load(f)
except: pass
if 'mcpServers' not in cfg: cfg['mcpServers'] = {}
if '$action' == 'set':
    cfg['mcpServers']['brain-cloud'] = json.loads(sys.argv[1])
else:
    cfg['mcpServers'].pop('brain-cloud', None)
with open('$output', 'w') as f: json.dump(cfg, f, indent=2); f.write('\n')
" "$entry"
  fi
}

# ── Detect MCP clients ────────────────────────────────────────────────
declare -a CLIENT_NAMES=()
declare -a CLIENT_CONFIGS=()

detect_clients() {
  # Claude Code
  if [ -d "$HOME/.claude" ]; then
    CLIENT_NAMES+=("Claude Code")
    CLIENT_CONFIGS+=("$HOME/.claude/.mcp.json")
  fi

  # Claude Desktop — macOS
  local desktop_mac="$HOME/Library/Application Support/Claude"
  if [ -d "$desktop_mac" ]; then
    CLIENT_NAMES+=("Claude Desktop (macOS)")
    CLIENT_CONFIGS+=("$desktop_mac/claude_desktop_config.json")
  fi

  # Claude Desktop — Linux / WSL
  local desktop_linux="$HOME/.config/Claude"
  if [ -d "$desktop_linux" ]; then
    CLIENT_NAMES+=("Claude Desktop (Linux)")
    CLIENT_CONFIGS+=("$desktop_linux/claude_desktop_config.json")
  fi

  if [ ${#CLIENT_NAMES[@]} -eq 0 ]; then
    warn "No MCP clients detected."
    echo ""
    echo "  Looked for:"
    echo "    - Claude Code:    ~/.claude/"
    echo "    - Claude Desktop: ~/Library/Application Support/Claude/ (macOS)"
    echo "    - Claude Desktop: ~/.config/Claude/ (Linux)"
    echo ""
    echo "  Install Claude Code or Claude Desktop first, then re-run this script."
    exit 1
  fi

  info "Detected ${#CLIENT_NAMES[@]} client(s):"
  for name in "${CLIENT_NAMES[@]}"; do
    echo "     - $name"
  done
  echo ""
}

# ── Backup a file ─────────────────────────────────────────────────────
backup_file() {
  local file="$1"
  if [ -f "$file" ]; then
    local bak="${file}.bak"
    cp "$file" "$bak"
    ok "Backed up $(basename "$file") -> $(basename "$bak")"
  fi
}

# ── Configure one client ─────────────────────────────────────────────
configure_client() {
  local name="$1" config_file="$2" action="$3" entry="${4:-}"

  info "$name: $(basename "$config_file")"

  mkdir -p "$(dirname "$config_file")"

  if [ "$action" = "uninstall" ]; then
    if [ ! -f "$config_file" ]; then
      ok "No config file — nothing to remove"
      return
    fi
    if ! grep -q '"brain-cloud"' "$config_file" 2>/dev/null; then
      ok "No brain-cloud entry — nothing to remove"
      return
    fi
    if $DRY_RUN; then
      dry "Would remove brain-cloud from $config_file"
      return
    fi
    backup_file "$config_file"
    local tmp
    tmp=$(mktemp)
    TMPFILES+=("$tmp")
    json_merge "$config_file" "$tmp" "delete"
    mv "$tmp" "$config_file"
    ok "Removed brain-cloud entry"
    return
  fi

  # Install / update
  if $DRY_RUN; then
    if [ -f "$config_file" ] && grep -q '"brain-cloud"' "$config_file" 2>/dev/null; then
      dry "Would update existing brain-cloud entry in $config_file"
    else
      dry "Would add brain-cloud entry to $config_file"
    fi
    dry "Server: ${BRAIN_SERVER_URL}/mcp"
    return
  fi

  if [ -f "$config_file" ]; then
    backup_file "$config_file"
  fi

  local tmp
  tmp=$(mktemp)
  TMPFILES+=("$tmp")

  if [ -f "$config_file" ]; then
    json_merge "$config_file" "$tmp" "set" "$entry"
  else
    # Create new file
    json_merge "/dev/null" "$tmp" "set" "$entry"
  fi
  mv "$tmp" "$config_file"

  if grep -q '"brain-cloud"' "$config_file" 2>/dev/null; then
    ok "Configured successfully"
  else
    err "Failed to write config"
    exit 1
  fi
}

# ── CLAUDE.md directives ──────────────────────────────────────────────
BRAIN_DIRECTIVES='
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
</brain_logging>'

add_claude_directives() {
  local claude_md="$HOME/.claude/CLAUDE.md"

  if $UNINSTALL; then
    # Not removing CLAUDE.md directives on uninstall — they're harmless
    return
  fi

  local should_add=false

  if $INTERACTIVE; then
    echo ""
    read -rp "$(echo -e "${CYAN}${BOLD}=>${NC} Add Brain logging directives to CLAUDE.md? (recommended) [Y/n]: ")" ADD_DIRECTIVES
    ADD_DIRECTIVES="${ADD_DIRECTIVES:-Y}"
    if [[ "$ADD_DIRECTIVES" =~ ^[Yy]$ ]]; then
      should_add=true
    fi
  else
    # Non-interactive: auto-add
    should_add=true
  fi

  if ! $should_add; then
    info "Skipped CLAUDE.md directives"
    return
  fi

  if $DRY_RUN; then
    dry "Would add brain_logging directives to $claude_md"
    return
  fi

  mkdir -p "$(dirname "$claude_md")"

  if [ -f "$claude_md" ]; then
    if grep -q '<brain_logging>' "$claude_md" 2>/dev/null; then
      ok "CLAUDE.md already has brain_logging directives"
      return
    fi
    echo "$BRAIN_DIRECTIVES" >> "$claude_md"
    ok "Appended brain directives to $claude_md"
  else
    cat > "$claude_md" <<EOF
# Claude Instructions
${BRAIN_DIRECTIVES}
EOF
    ok "Created $claude_md with brain directives"
  fi
}

# ── Restore backups (for --uninstall) ─────────────────────────────────
restore_backups() {
  if ! $UNINSTALL; then return; fi

  echo ""
  for i in "${!CLIENT_CONFIGS[@]}"; do
    local config="${CLIENT_CONFIGS[$i]}"
    local bak="${config}.bak"
    if [ -f "$bak" ]; then
      info "Backup exists: $bak"
      echo "  (You can restore it manually if needed)"
    fi
  done
}

# ══════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BOLD}Brain Cloud Installer${NC} ${DIM}v${VERSION}${NC}"
if $DRY_RUN; then
  echo -e "${DIM}(dry-run mode — no files will be modified)${NC}"
fi
echo ""

# Check required tools
if ! command -v curl &>/dev/null; then
  err "curl is required but not found."
  exit 1
fi

detect_json_tool
info "Using $JSON_TOOL for JSON merging"
echo ""

# Get API key (skip for uninstall)
API_KEY=""
if ! $UNINSTALL; then
  if [ -n "${BRAIN_API_KEY:-}" ]; then
    API_KEY="$BRAIN_API_KEY"
    info "Using API key from \$BRAIN_API_KEY"
  elif $INTERACTIVE; then
    info "Enter your Brain Cloud API key"
    echo -e "  (Create one at ${CYAN}${BRAIN_SERVER_URL}${NC} -> Settings -> New Key)"
    echo ""
    read -rp "  API key: " API_KEY
    echo ""
  else
    err "BRAIN_API_KEY environment variable is required."
    exit 1
  fi

  if [ -z "$API_KEY" ]; then
    err "No API key provided."
    exit 1
  fi

  # Validate key format (basic check)
  if [ ${#API_KEY} -lt 10 ]; then
    err "API key looks too short. Check your key and try again."
    exit 1
  fi

  # Test connection
  info "Validating API key..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "X-API-Key: $API_KEY" \
    --max-time 10 \
    "${BRAIN_SERVER_URL}/auth/me" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    ok "API key is valid"
  elif [ "$HTTP_CODE" = "000" ]; then
    err "Could not connect to ${BRAIN_SERVER_URL}. Check your network."
    exit 1
  else
    err "API key validation failed (HTTP $HTTP_CODE). Check your key."
    exit 1
  fi
  echo ""
fi

# Build MCP entry JSON
MCP_ENTRY=""
if ! $UNINSTALL; then
  MCP_ENTRY=$(cat <<EOF
{"type":"streamable-http","url":"${BRAIN_SERVER_URL}/mcp","headers":{"X-API-Key":"${API_KEY}"}}
EOF
)
fi

# Detect clients
detect_clients

# Configure each client
for i in "${!CLIENT_NAMES[@]}"; do
  if $UNINSTALL; then
    configure_client "${CLIENT_NAMES[$i]}" "${CLIENT_CONFIGS[$i]}" "uninstall"
  else
    configure_client "${CLIENT_NAMES[$i]}" "${CLIENT_CONFIGS[$i]}" "install" "$MCP_ENTRY"
  fi
done

# CLAUDE.md directives
add_claude_directives

# Restore info for uninstall
restore_backups

# ── Done ──────────────────────────────────────────────────────────────
echo ""
if $DRY_RUN; then
  echo -e "${BOLD}Dry run complete.${NC} Re-run without --dry-run to apply changes."
elif $UNINSTALL; then
  echo -e "${GREEN}${BOLD}Uninstalled.${NC} Brain Cloud entries have been removed."
  echo ""
  echo -e "  Restart Claude Code (or run ${CYAN}/mcp${NC}) to apply changes."
else
  echo -e "${GREEN}${BOLD}Done!${NC} Brain Cloud is configured."
  echo ""
  echo -e "  ${BOLD}Next steps:${NC}"
  echo -e "  1. Restart Claude Code (or run ${CYAN}/mcp${NC} to reload servers)"
  echo -e "  2. Ask Claude to call ${CYAN}brain_session_start()${NC} — it should just work"
  echo -e "  3. Dashboard: ${CYAN}${BRAIN_SERVER_URL}${NC}"
fi
echo ""
