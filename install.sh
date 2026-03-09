#!/usr/bin/env bash
set -euo pipefail

# Brain Cloud — MCP server installer
# Detects Claude Code & Claude Desktop, merges config idempotently.
# Usage:
#   BRAIN_API_KEY="xxx" bash <(curl -fsSL https://dash.brain-ai.dev/install.sh)
#   bash install.sh --dry-run
#   bash install.sh --uninstall
#   bash install.sh --hooks-only
#   bash install.sh --commands-only
#   bash install.sh --list

VERSION="3.0.0"
BRAIN_SERVER_URL="${BRAIN_SERVER_URL:-https://dash.brain-ai.dev}"

# ── Flags ─────────────────────────────────────────────────────────────
DRY_RUN=false
UNINSTALL=false
INTERACTIVE=true
NO_HOOKS=false
NO_COMMANDS=false
MINIMAL=false
HOOKS_ONLY=false
COMMANDS_ONLY=false
FORCE=false
LIST_MODE=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)       DRY_RUN=true ;;
    --uninstall)     UNINSTALL=true ;;
    --no-hooks)      NO_HOOKS=true ;;
    --no-commands)   NO_COMMANDS=true ;;
    --minimal)       MINIMAL=true ;;
    --hooks-only)    HOOKS_ONLY=true ;;
    --commands-only) COMMANDS_ONLY=true ;;
    --force)         FORCE=true ;;
    --list)          LIST_MODE=true; DRY_RUN=true ;;
    --help|-h)
      echo "Brain Cloud installer v${VERSION}"
      echo ""
      echo "Usage: BRAIN_API_KEY=\"xxx\" bash install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run       Show what would be changed without modifying files"
      echo "  --uninstall     Remove brain-cloud from all detected MCP configs"
      echo "  --no-hooks      Skip hooks installation"
      echo "  --no-commands   Skip slash commands installation"
      echo "  --minimal       MCP config only (no directives, hooks, or commands)"
      echo "  --hooks-only    Only install hooks + merge settings"
      echo "  --commands-only Only install slash commands"
      echo "  --force         Re-download even if version matches"
      echo "  --list          Show what would be installed (dry-run variant)"
      echo "  --help          Show this help"
      echo ""
      echo "Environment:"
      echo "  BRAIN_API_KEY      Required (unless --uninstall). Your API key."
      echo "  BRAIN_SERVER_URL   Server URL (default: https://dash.brain-ai.dev)"
      exit 0
      ;;
    *) echo "Unknown option: $arg (try --help)"; exit 1 ;;
  esac
done

# Validate flag combinations
if $HOOKS_ONLY && $COMMANDS_ONLY; then
  echo "Cannot use --hooks-only and --commands-only together (try --help)"
  exit 1
fi

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

# ── Generic JSON read/merge (for settings.json, manifest.json) ───────
# Usage: json_read <file> <js_expression>
# Returns the result of evaluating js_expression against parsed JSON
json_read() {
  local file="$1" expr="$2"
  if [ "$JSON_TOOL" = "node" ]; then
    node -e "
      const fs = require('fs');
      let d = {};
      try { d = JSON.parse(fs.readFileSync('$file', 'utf8')); } catch {}
      const result = (function(data) { return $expr; })(d);
      process.stdout.write(typeof result === 'object' ? JSON.stringify(result) : String(result ?? ''));
    "
  else
    $JSON_TOOL -c "
import json, sys
d = {}
try:
    with open('$file') as f: d = json.load(f)
except: pass
result = (lambda data: $expr)(d)
if isinstance(result, (dict, list)):
    print(json.dumps(result), end='')
else:
    print('' if result is None else str(result), end='')
"
  fi
}

# Deep-merge settings JSON: merge server settings into local settings
# Usage: settings_merge <input_file> <output_file> <server_settings_json>
settings_merge() {
  local input="$1" output="$2" server_json="$3"

  if [ "$JSON_TOOL" = "node" ]; then
    node -e "
      const fs = require('fs');
      let local = {};
      try { local = JSON.parse(fs.readFileSync('$input', 'utf8')); } catch {}
      const server = JSON.parse(process.argv[1]);

      // Deep merge: server hooks into local hooks
      if (server.hooks) {
        if (!local.hooks) local.hooks = {};
        for (const [event, handlers] of Object.entries(server.hooks)) {
          if (!local.hooks[event]) local.hooks[event] = [];
          // Add only handlers not already present (by matcher+command combo)
          for (const handler of handlers) {
            const key = JSON.stringify({ matcher: handler.matcher, command: handler.command });
            const exists = local.hooks[event].some(h =>
              JSON.stringify({ matcher: h.matcher, command: h.command }) === key
            );
            if (!exists) local.hooks[event].push(handler);
          }
        }
      }

      fs.writeFileSync('$output', JSON.stringify(local, null, 2) + '\n');
    " "$server_json"
  else
    $JSON_TOOL -c "
import json, sys
local = {}
try:
    with open('$input') as f: local = json.load(f)
except: pass
server = json.loads(sys.argv[1])
if 'hooks' in server:
    if 'hooks' not in local: local['hooks'] = {}
    for event, handlers in server['hooks'].items():
        if event not in local['hooks']: local['hooks'][event] = []
        for handler in handlers:
            key = json.dumps({'matcher': handler.get('matcher'), 'command': handler.get('command')}, sort_keys=True)
            exists = any(
                json.dumps({'matcher': h.get('matcher'), 'command': h.get('command')}, sort_keys=True) == key
                for h in local['hooks'][event]
            )
            if not exists:
                local['hooks'][event].append(handler)
with open('$output', 'w') as f: json.dump(local, f, indent=2); f.write('\n')
" "$server_json"
  fi
}

# Remove brain-cloud hook entries from settings.json
# Usage: settings_remove_hooks <input_file> <output_file>
settings_remove_hooks() {
  local input="$1" output="$2"

  if [ "$JSON_TOOL" = "node" ]; then
    node -e "
      const fs = require('fs');
      let cfg = {};
      try { cfg = JSON.parse(fs.readFileSync('$input', 'utf8')); } catch {}
      if (cfg.hooks) {
        for (const [event, handlers] of Object.entries(cfg.hooks)) {
          cfg.hooks[event] = handlers.filter(h => {
            const cmd = typeof h.command === 'string' ? h.command : (h.command || []).join(' ');
            return !cmd.includes('brain-cloud');
          });
          if (cfg.hooks[event].length === 0) delete cfg.hooks[event];
        }
        if (Object.keys(cfg.hooks).length === 0) delete cfg.hooks;
      }
      fs.writeFileSync('$output', JSON.stringify(cfg, null, 2) + '\n');
    "
  else
    $JSON_TOOL -c "
import json
cfg = {}
try:
    with open('$input') as f: cfg = json.load(f)
except: pass
if 'hooks' in cfg:
    for event in list(cfg['hooks'].keys()):
        cfg['hooks'][event] = [
            h for h in cfg['hooks'][event]
            if 'brain-cloud' not in (h.get('command', '') if isinstance(h.get('command'), str) else ' '.join(h.get('command', [])))
        ]
        if not cfg['hooks'][event]:
            del cfg['hooks'][event]
    if not cfg['hooks']:
        del cfg['hooks']
with open('$output', 'w') as f: json.dump(cfg, f, indent=2); f.write('\n')
"
  fi
}

# ── Checksum verification ─────────────────────────────────────────────
sha256_cmd() {
  if command -v sha256sum &>/dev/null; then
    sha256sum "$1" | cut -d' ' -f1
  elif command -v shasum &>/dev/null; then
    shasum -a 256 "$1" | cut -d' ' -f1
  else
    warn "No sha256sum or shasum found — skipping checksum verification"
    echo ""
  fi
}

verify_checksum() {
  local file="$1" expected="$2"
  if [ -z "$expected" ]; then
    return 0  # No checksum to verify
  fi
  local actual
  actual=$(sha256_cmd "$file")
  if [ -z "$actual" ]; then
    return 0  # No checksum tool available
  fi
  if [ "$actual" != "$expected" ]; then
    err "Checksum mismatch for $(basename "$file")"
    err "  Expected: $expected"
    err "  Got:      $actual"
    return 1
  fi
  return 0
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

# ── Manifest & version management ────────────────────────────────────
MANIFEST_FILE=""
MANIFEST_VERSION=""

download_manifest() {
  info "Fetching install manifest..."
  local tmp
  tmp=$(mktemp)
  TMPFILES+=("$tmp")

  local http_code
  http_code=$(curl -s -o "$tmp" -w "%{http_code}" \
    --max-time 15 --retry 2 --retry-delay 2 \
    "${BRAIN_SERVER_URL}/install/manifest.json" 2>/dev/null || echo "000")

  if [ "$http_code" != "200" ]; then
    err "Failed to fetch manifest (HTTP $http_code)"
    err "Hooks and commands will be skipped."
    return 1
  fi

  MANIFEST_FILE="$tmp"
  MANIFEST_VERSION=$(json_read "$tmp" "data.version" 2>/dev/null || echo "")
  if [ -n "$MANIFEST_VERSION" ]; then
    ok "Manifest version: $MANIFEST_VERSION"
  else
    ok "Manifest downloaded"
  fi
  return 0
}

check_version() {
  local version_file="$HOME/.claude/.brain-cloud-version"
  if $FORCE; then
    return 1  # Force re-download
  fi
  if [ ! -f "$version_file" ]; then
    return 1  # No local version, need download
  fi
  local local_version
  local_version=$(head -1 "$version_file" 2>/dev/null || echo "")
  if [ -z "$MANIFEST_VERSION" ] || [ -z "$local_version" ]; then
    return 1  # Can't compare, download
  fi
  if [ "$local_version" = "$MANIFEST_VERSION" ]; then
    ok "Assets up to date (v${local_version})"
    return 0  # Up to date
  fi
  info "Update available: v${local_version} -> v${MANIFEST_VERSION}"
  return 1  # Need update
}

write_version() {
  local version_file="$HOME/.claude/.brain-cloud-version"
  if $DRY_RUN; then
    dry "Would write version to $version_file"
    return
  fi
  local ver="${MANIFEST_VERSION:-unknown}"
  echo "$ver" > "$version_file"
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >> "$version_file"
  ok "Version recorded: $ver"
}

# ── Download hooks ────────────────────────────────────────────────────
download_hooks() {
  if [ -z "$MANIFEST_FILE" ]; then
    warn "No manifest — skipping hooks"
    return
  fi

  info "Installing hooks..."
  local hooks_dir="$HOME/.claude/hooks/brain-cloud"
  local hooks_json
  hooks_json=$(json_read "$MANIFEST_FILE" "JSON.stringify(data.hooks || [])" 2>/dev/null || echo "[]")

  if [ "$hooks_json" = "[]" ] || [ -z "$hooks_json" ]; then
    ok "No hooks in manifest"
    return
  fi

  # Parse hooks list: array of {name, sha256}
  local count
  if [ "$JSON_TOOL" = "node" ]; then
    count=$(node -e "console.log(JSON.parse(process.argv[1]).length)" "$hooks_json")
  else
    count=$($JSON_TOOL -c "import json,sys; print(len(json.loads(sys.argv[1])))" "$hooks_json")
  fi

  if [ "$count" = "0" ]; then
    ok "No hooks in manifest"
    return
  fi

  if $DRY_RUN; then
    dry "Would install $count hook(s) to $hooks_dir"
    # List them
    local i=0
    while [ "$i" -lt "$count" ]; do
      local hook_name
      if [ "$JSON_TOOL" = "node" ]; then
        hook_name=$(node -e "console.log(JSON.parse(process.argv[1])[$i].name)" "$hooks_json")
      else
        hook_name=$($JSON_TOOL -c "import json,sys; print(json.loads(sys.argv[1])[$i]['name'])" "$hooks_json")
      fi
      dry "  - $hook_name"
      i=$((i + 1))
    done
    return
  fi

  mkdir -p "$hooks_dir"

  local i=0
  local installed=0
  while [ "$i" -lt "$count" ]; do
    local hook_name hook_sha
    if [ "$JSON_TOOL" = "node" ]; then
      hook_name=$(node -e "console.log(JSON.parse(process.argv[1])[$i].name)" "$hooks_json")
      hook_sha=$(node -e "console.log(JSON.parse(process.argv[1])[$i].sha256 || '')" "$hooks_json")
    else
      hook_name=$($JSON_TOOL -c "import json,sys; print(json.loads(sys.argv[1])[$i]['name'])" "$hooks_json")
      hook_sha=$($JSON_TOOL -c "import json,sys; print(json.loads(sys.argv[1])[$i].get('sha256',''))" "$hooks_json")
    fi

    local tmp
    tmp=$(mktemp)
    TMPFILES+=("$tmp")

    local http_code
    http_code=$(curl -s -o "$tmp" -w "%{http_code}" \
      --max-time 15 --retry 2 --retry-delay 2 \
      "${BRAIN_SERVER_URL}/install/hooks/${hook_name}" 2>/dev/null || echo "000")

    if [ "$http_code" = "200" ]; then
      if verify_checksum "$tmp" "$hook_sha"; then
        mv "$tmp" "$hooks_dir/$hook_name"
        chmod +x "$hooks_dir/$hook_name"
        ok "Hook: $hook_name"
        installed=$((installed + 1))
      else
        warn "Skipped $hook_name (checksum failed)"
      fi
    else
      warn "Failed to download hook: $hook_name (HTTP $http_code)"
    fi

    i=$((i + 1))
  done

  ok "Installed $installed/$count hook(s)"
}

# ── Download commands ─────────────────────────────────────────────────
download_commands() {
  if [ -z "$MANIFEST_FILE" ]; then
    warn "No manifest — skipping commands"
    return
  fi

  info "Installing slash commands..."
  local cmds_dir="$HOME/.claude/commands/brain-cloud"
  local cmds_json
  cmds_json=$(json_read "$MANIFEST_FILE" "JSON.stringify(data.commands || [])" 2>/dev/null || echo "[]")

  if [ "$cmds_json" = "[]" ] || [ -z "$cmds_json" ]; then
    ok "No commands in manifest"
    return
  fi

  local count
  if [ "$JSON_TOOL" = "node" ]; then
    count=$(node -e "console.log(JSON.parse(process.argv[1]).length)" "$cmds_json")
  else
    count=$($JSON_TOOL -c "import json,sys; print(len(json.loads(sys.argv[1])))" "$cmds_json")
  fi

  if [ "$count" = "0" ]; then
    ok "No commands in manifest"
    return
  fi

  if $DRY_RUN; then
    dry "Would install $count command(s) to $cmds_dir"
    local i=0
    while [ "$i" -lt "$count" ]; do
      local cmd_name
      if [ "$JSON_TOOL" = "node" ]; then
        cmd_name=$(node -e "console.log(JSON.parse(process.argv[1])[$i].name)" "$cmds_json")
      else
        cmd_name=$($JSON_TOOL -c "import json,sys; print(json.loads(sys.argv[1])[$i]['name'])" "$cmds_json")
      fi
      dry "  - $cmd_name"
      i=$((i + 1))
    done
    return
  fi

  mkdir -p "$cmds_dir"

  local i=0
  local installed=0
  while [ "$i" -lt "$count" ]; do
    local cmd_name cmd_sha
    if [ "$JSON_TOOL" = "node" ]; then
      cmd_name=$(node -e "console.log(JSON.parse(process.argv[1])[$i].name)" "$cmds_json")
      cmd_sha=$(node -e "console.log(JSON.parse(process.argv[1])[$i].sha256 || '')" "$cmds_json")
    else
      cmd_name=$($JSON_TOOL -c "import json,sys; print(json.loads(sys.argv[1])[$i]['name'])" "$cmds_json")
      cmd_sha=$($JSON_TOOL -c "import json,sys; print(json.loads(sys.argv[1])[$i].get('sha256',''))" "$cmds_json")
    fi

    local tmp
    tmp=$(mktemp)
    TMPFILES+=("$tmp")

    local http_code
    http_code=$(curl -s -o "$tmp" -w "%{http_code}" \
      --max-time 15 --retry 2 --retry-delay 2 \
      "${BRAIN_SERVER_URL}/install/commands/${cmd_name}" 2>/dev/null || echo "000")

    if [ "$http_code" = "200" ]; then
      if verify_checksum "$tmp" "$cmd_sha"; then
        mv "$tmp" "$cmds_dir/$cmd_name"
        ok "Command: $cmd_name"
        installed=$((installed + 1))
      else
        warn "Skipped $cmd_name (checksum failed)"
      fi
    else
      warn "Failed to download command: $cmd_name (HTTP $http_code)"
    fi

    i=$((i + 1))
  done

  ok "Installed $installed/$count command(s)"
}

# ── Merge settings ────────────────────────────────────────────────────
merge_settings() {
  if [ -z "$MANIFEST_FILE" ]; then
    warn "No manifest — skipping settings merge"
    return
  fi

  info "Merging hook settings..."
  local settings_file="$HOME/.claude/settings.json"

  # Fetch server settings
  local tmp_settings
  tmp_settings=$(mktemp)
  TMPFILES+=("$tmp_settings")

  local http_code
  http_code=$(curl -s -o "$tmp_settings" -w "%{http_code}" \
    --max-time 15 --retry 2 --retry-delay 2 \
    "${BRAIN_SERVER_URL}/install/settings.json" 2>/dev/null || echo "000")

  if [ "$http_code" != "200" ]; then
    warn "Could not fetch settings template (HTTP $http_code) — skipping"
    return
  fi

  local server_json
  server_json=$(cat "$tmp_settings")

  if $DRY_RUN; then
    dry "Would merge hook settings into $settings_file"
    return
  fi

  if [ -f "$settings_file" ]; then
    backup_file "$settings_file"
  fi

  local tmp
  tmp=$(mktemp)
  TMPFILES+=("$tmp")

  if [ -f "$settings_file" ]; then
    settings_merge "$settings_file" "$tmp" "$server_json"
  else
    mkdir -p "$(dirname "$settings_file")"
    settings_merge "/dev/null" "$tmp" "$server_json"
  fi
  mv "$tmp" "$settings_file"
  ok "Settings merged"
}

# ── Uninstall extras ──────────────────────────────────────────────────
uninstall_extras() {
  local hooks_dir="$HOME/.claude/hooks/brain-cloud"
  local cmds_dir="$HOME/.claude/commands/brain-cloud"
  local version_file="$HOME/.claude/.brain-cloud-version"
  local settings_file="$HOME/.claude/settings.json"

  # Remove hooks directory
  if [ -d "$hooks_dir" ]; then
    if $DRY_RUN; then
      dry "Would remove $hooks_dir"
    else
      rm -rf "$hooks_dir"
      ok "Removed hooks directory"
    fi
  fi

  # Remove commands directory
  if [ -d "$cmds_dir" ]; then
    if $DRY_RUN; then
      dry "Would remove $cmds_dir"
    else
      rm -rf "$cmds_dir"
      ok "Removed commands directory"
    fi
  fi

  # Remove brain-cloud entries from settings.json
  if [ -f "$settings_file" ]; then
    if grep -q 'brain-cloud' "$settings_file" 2>/dev/null; then
      if $DRY_RUN; then
        dry "Would remove brain-cloud hooks from $settings_file"
      else
        backup_file "$settings_file"
        local tmp
        tmp=$(mktemp)
        TMPFILES+=("$tmp")
        settings_remove_hooks "$settings_file" "$tmp"
        mv "$tmp" "$settings_file"
        ok "Removed brain-cloud hooks from settings.json"
      fi
    fi
  fi

  # Remove version file
  if [ -f "$version_file" ]; then
    if $DRY_RUN; then
      dry "Would remove $version_file"
    else
      rm -f "$version_file"
      ok "Removed version file"
    fi
  fi
}

# ══════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BOLD}Brain Cloud Installer${NC} ${DIM}v${VERSION}${NC}"
if $DRY_RUN; then
  echo -e "${DIM}(dry-run mode — no files will be modified)${NC}"
fi
if $LIST_MODE; then
  echo -e "${DIM}(listing what would be installed)${NC}"
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

# Determine what to install
INSTALL_MCP=true
INSTALL_DIRECTIVES=true
INSTALL_HOOKS=true
INSTALL_COMMANDS=true

if $MINIMAL; then
  INSTALL_DIRECTIVES=false
  INSTALL_HOOKS=false
  INSTALL_COMMANDS=false
fi
if $HOOKS_ONLY; then
  INSTALL_MCP=false
  INSTALL_DIRECTIVES=false
  INSTALL_COMMANDS=false
fi
if $COMMANDS_ONLY; then
  INSTALL_MCP=false
  INSTALL_DIRECTIVES=false
  INSTALL_HOOKS=false
fi
if $NO_HOOKS; then
  INSTALL_HOOKS=false
fi
if $NO_COMMANDS; then
  INSTALL_COMMANDS=false
fi

# Get API key (skip for uninstall and hooks/commands-only)
API_KEY=""
if ! $UNINSTALL && $INSTALL_MCP; then
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
if ! $UNINSTALL && $INSTALL_MCP; then
  MCP_ENTRY=$(cat <<EOF
{"type":"streamable-http","url":"${BRAIN_SERVER_URL}/mcp","headers":{"X-API-Key":"${API_KEY}"}}
EOF
)
fi

# Detect clients
detect_clients

# ── Step 4: Download manifest + check version ────────────────────────
NEED_ASSETS=false
if ! $UNINSTALL && ($INSTALL_HOOKS || $INSTALL_COMMANDS); then
  if download_manifest; then
    if ! check_version; then
      NEED_ASSETS=true
    fi
  fi
  echo ""
fi

# ── Step 5: Configure clients (MCP config) ───────────────────────────
if $INSTALL_MCP; then
  for i in "${!CLIENT_NAMES[@]}"; do
    if $UNINSTALL; then
      configure_client "${CLIENT_NAMES[$i]}" "${CLIENT_CONFIGS[$i]}" "uninstall"
    else
      configure_client "${CLIENT_NAMES[$i]}" "${CLIENT_CONFIGS[$i]}" "install" "$MCP_ENTRY"
    fi
  done
fi

# ── Step 6: Write directives ─────────────────────────────────────────
if $INSTALL_DIRECTIVES; then
  add_claude_directives
fi

# ── Step 7: Download hooks ───────────────────────────────────────────
if $INSTALL_HOOKS && ! $UNINSTALL; then
  if $NEED_ASSETS || $FORCE; then
    download_hooks
  fi
fi

# ── Step 8: Download commands ────────────────────────────────────────
if $INSTALL_COMMANDS && ! $UNINSTALL; then
  if $NEED_ASSETS || $FORCE; then
    download_commands
  fi
fi

# ── Step 9: Merge settings ───────────────────────────────────────────
if $INSTALL_HOOKS && ! $UNINSTALL; then
  if $NEED_ASSETS || $FORCE; then
    merge_settings
  fi
fi

# ── Step 10: Write version ───────────────────────────────────────────
if ! $UNINSTALL && ($INSTALL_HOOKS || $INSTALL_COMMANDS); then
  if $NEED_ASSETS || $FORCE; then
    write_version
  fi
fi

# ── Uninstall extras ─────────────────────────────────────────────────
if $UNINSTALL; then
  uninstall_extras
fi

# Restore info for uninstall
restore_backups

# ── Done ──────────────────────────────────────────────────────────────
echo ""
if $LIST_MODE; then
  echo -e "${BOLD}Listing complete.${NC} Use without --list to install."
elif $DRY_RUN; then
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
