#!/bin/bash
# Auto-Log Trigger Hook
# Part of Claude DX Framework v2.19.0 - Event-Based Brain MCP Logging
#
# Triggered by PostToolUse hook. Detects significant events and emits
# system messages requiring Claude to log to Brain MCP.
#
# Usage: auto-log-trigger.sh <tool_name> [tool_input]

set -euo pipefail

# Get project root
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
export PROJECT_ROOT

# Source the auto-log library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auto-log-lib.sh"

# ============================================
# MAIN LOGIC
# ============================================

TOOL_NAME="${1:-}"
TOOL_INPUT="${2:-}"
TOOL_OUTPUT="${3:-}"

# Skip if no tool name provided
if [[ -z "$TOOL_NAME" ]]; then
    exit 0
fi

case "$TOOL_NAME" in
    "TodoWrite")
        # Check if any todos were marked completed
        if has_completed_todo "$TOOL_INPUT"; then
            emit_log_trigger "task_complete" "Task marked complete - log progress and outcome"
        fi
        ;;

    "Edit"|"Write")
        # Track file changes, trigger after threshold
        if is_significant_file "$TOOL_INPUT"; then
            count=$(increment_change_counter)
            if [[ "$count" -ge "$CHANGE_THRESHOLD" ]]; then
                emit_log_trigger "code_changes" "Multiple files modified ($count changes) - log what changed and why"
                reset_change_counter
            fi
        fi
        ;;

    "Bash")
        # Detect git commits
        if is_git_commit "$TOOL_INPUT"; then
            emit_log_trigger "commit" "Code committed - log the changes and reasoning"
            # Reset change counter since we just committed
            reset_change_counter
        fi

        # Detect repeated errors for frustration sentiment
        if echo "$TOOL_OUTPUT" 2>/dev/null | grep -qiE "error|failed|exception"; then
            count=$(increment_error_counter)
            if [[ "$count" -ge 3 ]]; then
                emit_sentiment_trigger "frustrated" "debugging" "Multiple errors ($count)"
                reset_error_counter
            fi
        fi
        ;;

    "TaskUpdate")
        if echo "$TOOL_INPUT" | grep -qE '"status"\s*:\s*"completed"'; then
            emit_sentiment_trigger "satisfied" "task" "Task completed successfully"
        fi
        ;;

    *)
        # Unknown tool, no action
        ;;
esac

exit 0
