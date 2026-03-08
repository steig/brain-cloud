#!/usr/bin/env bash
set -euo pipefail

# Build install manifest for brain-cloud onboarding assets.
# Scans .claude/hooks/ and .claude/commands/, computes SHA-256 checksums,
# and outputs a manifest.json to stdout.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.claude/hooks"
COMMANDS_DIR="$REPO_ROOT/.claude/commands"

VERSION="${MANIFEST_VERSION:-1.0.0}"

# Start JSON output
echo "{"
echo "  \"version\": \"$VERSION\","
echo "  \"generated\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
echo "  \"files\": {"

first=true

emit_entry() {
  local filepath="$1"
  local key="$2"

  local sha256
  sha256=$(sha256sum "$filepath" | cut -d' ' -f1)
  local size
  size=$(wc -c < "$filepath")

  if [ "$first" = true ]; then
    first=false
  else
    echo ","
  fi

  printf '    "%s": { "sha256": "%s", "size": %d }' "$key" "$sha256" "$size"
}

# Hooks
if [ -d "$HOOKS_DIR" ]; then
  for f in "$HOOKS_DIR"/*.sh; do
    [ -f "$f" ] || continue
    emit_entry "$f" "hooks/$(basename "$f")"
  done
fi

# Commands
if [ -d "$COMMANDS_DIR" ]; then
  for f in "$COMMANDS_DIR"/*.md; do
    [ -f "$f" ] || continue
    emit_entry "$f" "commands/$(basename "$f")"
  done
fi

# Directives (settings.json, CLAUDE.md fragments, etc.)
for candidate in "$REPO_ROOT/.claude/settings.json"; do
  if [ -f "$candidate" ]; then
    emit_entry "$candidate" "$(basename "$candidate")"
  fi
done

echo ""
echo "  }"
echo "}"
