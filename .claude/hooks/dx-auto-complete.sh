#!/usr/bin/env bash

# DX Auto-Complete Hook
# Called after slash command completion to log results
# Pair with dx-auto-track.sh

# Get script directory
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="${HOME}/.claude/hooks"
fi

LIB_DIR="${SCRIPT_DIR}/../lib"

# Source libraries silently
source "${LIB_DIR}/dx-db.sh" 2>/dev/null || exit 0
source "${LIB_DIR}/dx-metrics.sh" 2>/dev/null || exit 0

# Get outcome from argument or default to success
OUTCOME="${1:-success}"
ERROR_MSG="${2:-}"

# Read command info
COMMAND_NAME=""
START_MS=""

if [[ -f /tmp/.dx-current-command ]]; then
    COMMAND_NAME=$(cat /tmp/.dx-current-command 2>/dev/null)
fi

if [[ -f /tmp/.dx-command-start ]]; then
    START_MS=$(cat /tmp/.dx-command-start 2>/dev/null)
fi

# Calculate duration
if [[ -n "$START_MS" ]]; then
    END_MS=$(dx_now_ms)
    DURATION_MS=$((END_MS - START_MS))
else
    DURATION_MS=0
fi

# Log the event
if [[ -n "$COMMAND_NAME" ]]; then
    dx_log_event "$COMMAND_NAME" "$OUTCOME" "$DURATION_MS" "" "$ERROR_MSG" 2>/dev/null || true

    # Record sequence pattern
    if [[ -n "${DX_LAST_COMMAND:-}" ]] && [[ "$DX_LAST_COMMAND" != "$COMMAND_NAME" ]]; then
        dx_record_pattern "sequence" "$DX_LAST_COMMAND" "$COMMAND_NAME" 2>/dev/null || true
    fi

    # Update last command
    export DX_LAST_COMMAND="$COMMAND_NAME"
    echo "$COMMAND_NAME" > /tmp/.dx-last-command 2>/dev/null || true
fi

# Cleanup
rm -f /tmp/.dx-current-command /tmp/.dx-command-start 2>/dev/null || true

# Maybe suggest next command
if [[ "${DX_SUGGEST_NEXT:-true}" == "true" ]] && [[ -n "$COMMAND_NAME" ]]; then
    SUGGESTION=$(dx_query "
        SELECT pattern_value, ROUND(confidence * 100) as pct
        FROM patterns
        WHERE pattern_type = 'sequence'
          AND pattern_key = '$(dx_escape "$COMMAND_NAME")'
          AND confidence > 0.7
        ORDER BY confidence DESC
        LIMIT 1;
    " "csv" 2>/dev/null | tail -n +2)

    if [[ -n "$SUGGESTION" ]]; then
        NEXT_CMD=$(echo "$SUGGESTION" | cut -d',' -f1)
        PCT=$(echo "$SUGGESTION" | cut -d',' -f2)
        # Output suggestion (will be shown by Claude)
        echo "DX_SUGGEST:/$NEXT_CMD:$PCT"
    fi
fi

exit 0
