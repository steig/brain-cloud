#!/usr/bin/env bash

# DX Auto-Tracking Hook
# Automatically instruments slash commands for analytics
# Add to .claude/settings.json hooks configuration

# Get script directory (bash/zsh compatible)
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="${HOME}/.claude/hooks"
fi

LIB_DIR="${SCRIPT_DIR}/../lib"

# Source libraries silently
source "${LIB_DIR}/dx-db.sh" 2>/dev/null || exit 0
source "${LIB_DIR}/dx-metrics.sh" 2>/dev/null || exit 0

# Parse hook arguments
# Format: command_name [args...]
COMMAND_NAME="${1:-unknown}"
shift
COMMAND_ARGS="$*"

# Extract slash command name (remove leading /)
COMMAND_NAME="${COMMAND_NAME#/}"

# Skip internal/tracking commands to avoid recursion
case "$COMMAND_NAME" in
    stats|feedback|patterns|checkpoint|health)
        # Still track but don't instrument
        ;;
    session_*|dx_*)
        # Internal - skip entirely
        exit 0
        ;;
esac

# Initialize session if needed
if [[ -z "${DX_SESSION_ID:-}" ]]; then
    export DX_SESSION_ID="$(date +%Y%m%d_%H%M%S)_$$"
fi

# Start tracking this command
dx_start "$COMMAND_NAME" "$COMMAND_ARGS" 2>/dev/null || true

# Store command info for completion tracking
echo "$COMMAND_NAME" > /tmp/.dx-current-command 2>/dev/null || true
echo "$(dx_now_ms)" > /tmp/.dx-command-start 2>/dev/null || true

exit 0
