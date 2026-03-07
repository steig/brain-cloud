#!/usr/bin/env bash

# DX Framework Metrics Library
# Timing, instrumentation, and command lifecycle management
# Version: 1.0.0

# Get script directory (bash/zsh compatible)
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="${HOME}/.claude/lib"
fi
# shellcheck source=dx-db.sh
source "${SCRIPT_DIR}/dx-db.sh" 2>/dev/null || true

# Timing state
declare -g DX_CMD_START_MS=""
declare -g DX_CMD_NAME=""
declare -g DX_CMD_ARGS=""
declare -g DX_LAST_COMMAND=""
export DX_LAST_COMMAND

# Get current time in milliseconds
dx_now_ms() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: use python for millisecond precision
        python3 -c 'import time; print(int(time.time() * 1000))' 2>/dev/null || \
            echo $(($(date +%s) * 1000))
    else
        # Linux: use date with nanoseconds
        echo $(($(date +%s%N) / 1000000))
    fi
}

# Start timing a command
dx_start() {
    local command_name="$1"
    shift
    local args="$*"

    DX_CMD_START_MS=$(dx_now_ms)
    DX_CMD_NAME="$command_name"
    DX_CMD_ARGS="$args"

    # Record sequence pattern (previous -> current)
    if [[ -n "${DX_LAST_COMMAND:-}" ]] && [[ "$DX_LAST_COMMAND" != "$command_name" ]]; then
        dx_record_pattern "sequence" "$DX_LAST_COMMAND" "$command_name" 2>/dev/null || true
    fi
}

# End timing and log the event
dx_end() {
    local outcome="${1:-success}"
    local error_message="${2:-}"

    if [[ -z "$DX_CMD_START_MS" ]] || [[ -z "$DX_CMD_NAME" ]]; then
        return 0
    fi

    local end_ms duration_ms
    end_ms=$(dx_now_ms)
    duration_ms=$((end_ms - DX_CMD_START_MS))

    # Log the event
    dx_log_event "$DX_CMD_NAME" "$outcome" "$duration_ms" "$DX_CMD_ARGS" "$error_message" 2>/dev/null || true

    # Update last command for sequence tracking
    DX_LAST_COMMAND="$DX_CMD_NAME"
    export DX_LAST_COMMAND

    # Reset state
    DX_CMD_START_MS=""
    DX_CMD_NAME=""
    DX_CMD_ARGS=""

    # Return duration for display
    echo "$duration_ms"
}

# Format duration for display
dx_format_duration() {
    local ms="$1"

    if [[ $ms -lt 1000 ]]; then
        echo "${ms}ms"
    elif [[ $ms -lt 60000 ]]; then
        local sec=$((ms / 1000))
        local rem=$((ms % 1000 / 100))
        echo "${sec}.${rem}s"
    else
        local min=$((ms / 60000))
        local sec=$(((ms % 60000) / 1000))
        echo "${min}m ${sec}s"
    fi
}

# Wrapper to run a command with timing
dx_timed() {
    local command_name="$1"
    shift

    dx_start "$command_name" "$@"

    local exit_code=0
    "$@" || exit_code=$?

    local outcome="success"
    local error_message=""
    if [[ $exit_code -ne 0 ]]; then
        outcome="failure"
        error_message="Exit code: $exit_code"
    fi

    local duration_ms
    duration_ms=$(dx_end "$outcome" "$error_message")

    if [[ -n "${DX_VERBOSE:-}" ]]; then
        echo "[DX] $command_name completed in $(dx_format_duration "$duration_ms") ($outcome)"
    fi

    return $exit_code
}

# Safe execution with auto-checkpoint before destructive operations
dx_safe_exec() {
    local command_name="$1"
    shift

    # Commands that warrant auto-checkpointing
    case "$command_name" in
        commit|merge|pr_merge|release|rebase|reset)
            dx_save_checkpoint "pre_${command_name}" "pre_destructive" 2>/dev/null || true
            ;;
    esac

    dx_timed "$command_name" "$@"
}

# Track AI suggestion for feedback
dx_track_suggestion() {
    local suggestion_type="$1"
    local suggested_value="$2"

    # Store for later comparison
    export DX_PENDING_SUGGESTION_TYPE="$suggestion_type"
    export DX_PENDING_SUGGESTION_VALUE="$suggested_value"
}

# Record what the user actually used (compare to suggestion)
dx_record_actual() {
    local actual_value="$1"

    if [[ -n "${DX_PENDING_SUGGESTION_TYPE:-}" ]]; then
        dx_log_feedback \
            "$DX_PENDING_SUGGESTION_TYPE" \
            "$DX_PENDING_SUGGESTION_VALUE" \
            "$actual_value" 2>/dev/null || true

        # Clear pending
        unset DX_PENDING_SUGGESTION_TYPE
        unset DX_PENDING_SUGGESTION_VALUE
    fi
}

# Suggest next action based on learned patterns
dx_maybe_suggest_next() {
    local current_command="$1"
    local threshold="${2:-0.5}"

    # Query for suggestions
    local suggestions
    suggestions=$(dx_query "
        SELECT pattern_value, occurrences, ROUND(confidence * 100) as pct
        FROM patterns
        WHERE pattern_type = 'sequence'
          AND pattern_key = '$(dx_escape "$current_command")'
          AND confidence >= $threshold
        ORDER BY confidence DESC
        LIMIT 1;
    " "csv" 2>/dev/null | tail -n +2)  # Skip header

    if [[ -n "$suggestions" ]]; then
        local next_cmd occurrences pct
        IFS=',' read -r next_cmd occurrences pct <<< "$suggestions"

        if [[ -n "$next_cmd" ]]; then
            echo ""
            echo "Suggestion: You usually run /$next_cmd after /$current_command (${pct}% of the time)"
            echo "Run it? [Y/n]: "
        fi
    fi
}

# Get current session summary
dx_session_summary() {
    echo "=== Current Session: $DX_SESSION_ID ==="
    dx_query "
        SELECT command,
               outcome,
               duration_ms,
               strftime('%H:%M:%S', timestamp) as time
        FROM events
        WHERE session_id = '$(dx_escape "$DX_SESSION_ID")'
        ORDER BY timestamp;
    " 2>/dev/null || echo "No events recorded yet"
}

# Quick health check
dx_health() {
    local db_status="OK"
    local events_count checkpoints_count patterns_count

    if [[ ! -f "$DX_DB" ]]; then
        db_status="Not initialized"
        events_count=0
        checkpoints_count=0
        patterns_count=0
    else
        events_count=$(dx_query "SELECT COUNT(*) FROM events;" "line" 2>/dev/null | grep -oE '[0-9]+' || echo "0")
        checkpoints_count=$(dx_query "SELECT COUNT(*) FROM checkpoints;" "line" 2>/dev/null | grep -oE '[0-9]+' || echo "0")
        patterns_count=$(dx_query "SELECT COUNT(*) FROM patterns;" "line" 2>/dev/null | grep -oE '[0-9]+' || echo "0")
    fi

    echo "DX Analytics Health"
    echo "==================="
    echo "Database: $db_status"
    echo "Location: $DX_DB"
    echo "Session:  $DX_SESSION_ID"
    echo ""
    echo "Data:"
    echo "  Events:      $events_count"
    echo "  Checkpoints: $checkpoints_count"
    echo "  Patterns:    $patterns_count"
}

# Cleanup old data (retention policy)
dx_cleanup() {
    local retention_days="${1:-90}"

    echo "Cleaning up data older than $retention_days days..."

    dx_exec "DELETE FROM events WHERE timestamp < datetime('now', '-$retention_days days');"
    dx_exec "DELETE FROM feedback WHERE timestamp < datetime('now', '-$retention_days days');"
    dx_exec "DELETE FROM checkpoints WHERE timestamp < datetime('now', '-$retention_days days') AND checkpoint_type != 'manual';"

    # Vacuum to reclaim space
    dx_exec "VACUUM;"

    echo "Cleanup complete"
}

# CLI interface
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-help}" in
        start)
            dx_start "${2:-test}" "${@:3}"
            echo "Timer started for: ${2:-test}"
            ;;
        end)
            duration=$(dx_end "${2:-success}" "${3:-}")
            echo "Duration: $(dx_format_duration "$duration")"
            ;;
        session)
            dx_session_summary
            ;;
        health)
            dx_health
            ;;
        cleanup)
            dx_cleanup "${2:-90}"
            ;;
        suggest)
            dx_maybe_suggest_next "${2:-commit}"
            ;;
        *)
            echo "DX Metrics CLI"
            echo ""
            echo "Usage: $0 <command> [args]"
            echo ""
            echo "Commands:"
            echo "  start <name> [args]     Start timing a command"
            echo "  end [outcome] [error]   End timing and log"
            echo "  session                 Show current session activity"
            echo "  health                  Show analytics health"
            echo "  cleanup [days]          Remove old data (default: 90 days)"
            echo "  suggest <cmd>           Show suggested next command"
            ;;
    esac
fi

# Export functions
export -f dx_now_ms dx_start dx_end dx_format_duration
export -f dx_timed dx_safe_exec
export -f dx_track_suggestion dx_record_actual dx_maybe_suggest_next
export -f dx_session_summary dx_health dx_cleanup
