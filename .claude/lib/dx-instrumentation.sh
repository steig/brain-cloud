#!/usr/bin/env bash

# DX Framework Instrumentation
# Auto-instrumentation for commands and sessions
# Version: 1.0.0

# Get script directory (bash/zsh compatible)
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
elif [[ -n "${(%):-%x}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${(%):-%x}")" && pwd)"
else
    SCRIPT_DIR="${HOME}/.claude/lib"
fi

# Load dependencies
source "${SCRIPT_DIR}/dx-db.sh" 2>/dev/null || true
source "${SCRIPT_DIR}/dx-metrics.sh" 2>/dev/null || true

# Session initialization - call at start of Claude session
dx_session_init() {
    # Ensure database exists
    dx_init_db 2>/dev/null || true

    # Generate session ID if not set
    if [[ -z "${DX_SESSION_ID:-}" ]]; then
        export DX_SESSION_ID="$(date +%Y%m%d_%H%M%S)_$$"
    fi

    # Log session start
    dx_log_event "session_start" "success" 0 "" "" "" "" "" 2>/dev/null || true

    echo "DX Analytics: Session $DX_SESSION_ID initialized"
}

# Session end - call at end of Claude session
dx_session_end() {
    # Log session end
    dx_log_event "session_end" "success" 0 "" "" "" "" "" 2>/dev/null || true

    # Show quick summary
    echo ""
    echo "=== Session Summary ==="
    dx_query "
        SELECT command,
               COUNT(*) as runs,
               SUM(CASE WHEN outcome='success' THEN 1 ELSE 0 END) as success
        FROM events
        WHERE session_id = '$(dx_escape "$DX_SESSION_ID")'
          AND command NOT IN ('session_start', 'session_end')
        GROUP BY command
        ORDER BY runs DESC;
    " 2>/dev/null || echo "(no data)"
}

# Wrapper for tracking slash commands
# Usage: dx_track_command "commit" "starting commit workflow"
dx_track_command() {
    local command_name="$1"
    local description="${2:-}"

    dx_start "$command_name" "$description"
    export DX_CURRENT_COMMAND="$command_name"
}

# Call when command completes
# Usage: dx_complete_command "success" or dx_complete_command "failure" "error message"
dx_complete_command() {
    local outcome="${1:-success}"
    local error="${2:-}"

    if [[ -n "${DX_CURRENT_COMMAND:-}" ]]; then
        dx_end "$outcome" "$error" 2>/dev/null || true
        unset DX_CURRENT_COMMAND
    fi
}

# Track AI suggestions for feedback learning
# Usage: dx_ai_suggested "commit_msg" "feat: add login"
dx_ai_suggested() {
    local suggestion_type="$1"
    local suggested_value="$2"

    export DX_PENDING_SUGGESTION_TYPE="$suggestion_type"
    export DX_PENDING_SUGGESTION_VALUE="$suggested_value"

    # Store in temp file for persistence across tool calls
    mkdir -p /tmp/.dx-suggestions
    echo "$suggestion_type" > /tmp/.dx-suggestions/type
    echo "$suggested_value" > /tmp/.dx-suggestions/value
}

# Record what user actually used
# Usage: dx_ai_actual "feat: implement login"
dx_ai_actual() {
    local actual_value="$1"

    local suggestion_type=""
    local suggested_value=""

    # Try environment first, then temp files
    if [[ -n "${DX_PENDING_SUGGESTION_TYPE:-}" ]]; then
        suggestion_type="$DX_PENDING_SUGGESTION_TYPE"
        suggested_value="$DX_PENDING_SUGGESTION_VALUE"
    elif [[ -f /tmp/.dx-suggestions/type ]]; then
        suggestion_type=$(cat /tmp/.dx-suggestions/type)
        suggested_value=$(cat /tmp/.dx-suggestions/value)
    fi

    if [[ -n "$suggestion_type" ]]; then
        dx_log_feedback "$suggestion_type" "$suggested_value" "$actual_value" 2>/dev/null || true

        # Cleanup
        unset DX_PENDING_SUGGESTION_TYPE DX_PENDING_SUGGESTION_VALUE
        rm -f /tmp/.dx-suggestions/type /tmp/.dx-suggestions/value
    fi
}

# Quick log for simple tracking
# Usage: dx_log "commit" "success" 1500
dx_log() {
    local command="$1"
    local outcome="${2:-success}"
    local duration_ms="${3:-0}"

    dx_log_event "$command" "$outcome" "$duration_ms" 2>/dev/null || true
}

# Get suggestion for next command
dx_what_next() {
    local current="${1:-${DX_LAST_COMMAND:-}}"

    if [[ -z "$current" ]]; then
        echo "No previous command to base suggestion on."
        return
    fi

    local suggestion
    suggestion=$(dx_query "
        SELECT pattern_value, ROUND(confidence * 100) as pct
        FROM patterns
        WHERE pattern_type = 'sequence'
          AND pattern_key = '$(dx_escape "$current")'
          AND confidence > 0.4
        ORDER BY confidence DESC
        LIMIT 1;
    " "csv" 2>/dev/null | tail -n +2)

    if [[ -n "$suggestion" ]]; then
        local next_cmd pct
        IFS=',' read -r next_cmd pct <<< "$suggestion"
        echo "Based on your patterns, you usually run /$next_cmd after /$current ($pct% confidence)"
    else
        echo "No strong pattern detected after /$current yet."
    fi
}

# Export all functions
export -f dx_session_init dx_session_end
export -f dx_track_command dx_complete_command
export -f dx_ai_suggested dx_ai_actual
export -f dx_log dx_what_next

# Auto-initialize if sourced in a session
if [[ "${DX_AUTO_INIT:-true}" == "true" ]] && [[ -z "${DX_INITIALIZED:-}" ]]; then
    dx_session_init 2>/dev/null || true
    export DX_INITIALIZED=1
fi
